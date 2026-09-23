import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { parseSrt, guessLang } from "@/data/srt";
import { resolveAnilistId } from "@/lib/anilist-server";
import type { Cue, SubtitleTrack } from "@/components/player/types";

// Translating a whole episode through a local LLM can take a minute on a cold
// model, so give the route room and keep it on the Node runtime (needs fs).
export const runtime = "nodejs";
export const maxDuration = 300;

const JIMAKU_API = "https://jimaku.cc/api";
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
// qwen2.5:3b is small (~2GB) so it fits in RAM without swapping — far faster on
// a loaded machine than the 30B model. Override via env for higher quality.
const OLLAMA_MODEL = process.env.OLLAMA_TRANSLATE_MODEL ?? "qwen2.5:3b";
const CACHE_DIR = path.join(process.cwd(), ".cache", "translated-subs");
const BATCH = 40;

const LANG_LABELS: Record<string, string> = {
  pl: "Polski",
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  uk: "Українська",
};
const LANG_NAMES: Record<string, string> = {
  pl: "Polish",
  ru: "Russian",
  de: "German",
  es: "Spanish",
  fr: "French",
  uk: "Ukrainian",
  en: "English",
  ar: "Arabic",
  he: "Hebrew",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
};

/** Filesystem/id-safe slug for an arbitrary language string. */
function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "x"
  );
}

/** In-flight translations, so the same (anilist,episode,lang) never runs twice. */
const inFlight = new Map<string, Promise<SubtitleTrack | null>>();

// One local Ollama, so running several translations at once just thrashes the
// GPU (and swaps models in/out of RAM). Serialize all jobs through a queue so
// exactly one translation runs at a time; the rest wait their turn.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

function auth(): HeadersInit {
  return { Authorization: process.env.JIMAKU_API_KEY ?? "", Accept: "application/json" };
}

interface JimakuEntry {
  id: number;
}
interface JimakuFile {
  name: string;
  url: string;
}

async function searchEntryId(anilistId: number): Promise<number | null> {
  const res = await fetch(`${JIMAKU_API}/entries/search?anilist_id=${anilistId}`, {
    headers: auth(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const entries = (await res.json()) as JimakuEntry[];
  return entries?.[0]?.id ?? null;
}

/** Pick the best source file: prefer an English .srt, else any .srt. */
async function pickSourceCues(
  entryId: number,
  episode: number
): Promise<{ cues: Cue[]; sourceLang: string } | null> {
  const res = await fetch(`${JIMAKU_API}/entries/${entryId}/files?episode=${episode}`, {
    headers: auth(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const files = ((await res.json()) as JimakuFile[]).filter((f) =>
    f.name.toLowerCase().endsWith(".srt")
  );
  if (files.length === 0) return null;

  const english = files.find((f) => guessLang(f.name).lang === "en");
  const chosen = english ?? files[0];
  const sourceLang = guessLang(chosen.name).lang;

  const dl = await fetch(chosen.url, { headers: auth(), cache: "no-store" });
  if (!dl.ok) return null;
  const cues = parseSrt(await dl.text());
  return cues.length > 0 ? { cues, sourceLang } : null;
}

/** Translate one batch of cue texts via Ollama; returns text-by-index. */
async function translateBatch(
  items: { i: number; e: string }[],
  targetName: string,
  sourceName: string
): Promise<Map<number, string>> {
  // Abort a wedged batch so one stuck request can't hang the whole translation.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 240_000);
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          {
            role: "system",
            content:
              `You translate anime subtitles from ${sourceName} into natural, ` +
              `colloquial ${targetName}. Preserve meaning and tone; keep line ids. ` +
              `Never merge, split, add or drop lines. ` +
              `Return ONLY JSON: {"t":[{"i":<id>,"p":"<${targetName} text>"}]}.`,
          },
          { role: "user", content: JSON.stringify(items) },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const parsed = JSON.parse(data.message?.content ?? "{}") as {
    t?: { i: number; p: string }[];
  };
  const out = new Map<number, string>();
  for (const row of parsed.t ?? []) {
    if (typeof row.i === "number" && typeof row.p === "string") out.set(row.i, row.p);
  }
  return out;
}

async function readCache(key: string): Promise<SubtitleTrack | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as SubtitleTrack;
  } catch {
    return null;
  }
}

async function writeCache(key: string, track: SubtitleTrack): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(track));
  } catch {
    /* cache is best-effort */
  }
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Do the actual jimaku-fetch + batch translation for one language. */
async function translate(
  anilistId: number,
  episode: number,
  code: string,
  targetName: string,
  label: string,
  cacheKey: string
): Promise<SubtitleTrack | null> {
  const tag = `[translate-subs] anilist=${anilistId} ep=${episode} → ${label} (${OLLAMA_MODEL})`;
  const entryId = await searchEntryId(anilistId);
  if (!entryId) {
    console.warn(`${tag}: no jimaku entry — nothing to translate`);
    return null;
  }

  const source = await pickSourceCues(entryId, episode);
  if (!source) {
    console.warn(`${tag}: no .srt source cues found`);
    return null;
  }

  const sourceName = LANG_NAMES[source.sourceLang] ?? "Japanese";
  const totalBatches = Math.ceil(source.cues.length / BATCH);
  const t0 = Date.now();
  console.log(
    `${tag}: ${source.cues.length} lines from ${sourceName} in ${totalBatches} batches — starting…`
  );

  const translated: Cue[] = [];
  let batchNo = 0;
  for (let start = 0; start < source.cues.length; start += BATCH) {
    batchNo++;
    const slice = source.cues.slice(start, start + BATCH);
    const items = slice.map((c, j) => ({ i: start + j, e: c.text }));
    const bStart = Date.now();
    let map = new Map<number, string>();
    try {
      map = await translateBatch(items, targetName, sourceName);
    } catch (err) {
      console.warn(`${tag}: batch ${batchNo}/${totalBatches} failed (${(err as Error).message})`);
    }
    slice.forEach((c, j) => {
      const idx = start + j;
      translated.push({ start: c.start, end: c.end, text: map.get(idx) ?? c.text });
    });
    console.log(
      `${tag}: batch ${batchNo}/${totalBatches} done in ${((Date.now() - bStart) / 1000).toFixed(1)}s`
    );
  }
  console.log(
    `${tag}: finished ${source.cues.length} lines in ${((Date.now() - t0) / 1000).toFixed(1)}s — caching`
  );

  const track: SubtitleTrack = {
    id: `t-${slug(code)}`,
    label,
    lang: code,
    cues: translated,
  };
  await writeCache(cacheKey, track);
  return track;
}

/**
 * Produce a translated subtitle track for an episode, e.g.:
 *   GET /api/translate-subs?anilistId=5114&episode=1&to=pl
 *   GET /api/translate-subs?anilistId=5114&episode=1&to=arabic
 * `to` is a language code (pl/en/ar/he…) or a free-form language name. Source
 * text comes from jimaku (English preferred), translated batch-wise by a local
 * Ollama model, cached on disk, and de-duplicated while in flight so the same
 * language is never translated twice. Returns { track } or { track: null }.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episode = Math.max(1, Number(searchParams.get("episode") ?? "1"));
  const toRaw = (searchParams.get("to") ?? "pl").trim();
  const code = toRaw.toLowerCase();
  let anilistId = Number(searchParams.get("anilistId"));
  const malId = Number(searchParams.get("malId"));
  if (!anilistId && malId) {
    anilistId = (await resolveAnilistId(malId)) ?? 0;
  }

  if (!anilistId || !toRaw || !process.env.JIMAKU_API_KEY) {
    return NextResponse.json({ track: null });
  }

  // Map known codes to a proper language name; otherwise treat the input as the
  // language itself (so "arabic", "עברית", "Tagalog" all work).
  const targetName = LANG_NAMES[code] ?? titleCase(toRaw);
  const label = LANG_LABELS[code] ?? titleCase(toRaw);
  const cacheKey = `${anilistId}-${episode}-${slug(code)}`;

  const cached = await readCache(cacheKey);
  if (cached) {
    return NextResponse.json(
      { track: cached },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }

  try {
    let job = inFlight.get(cacheKey);
    if (!job) {
      // Serialized so only one translation hits Ollama at a time (no model thrash).
      job = enqueue(() =>
        translate(anilistId, episode, code, targetName, label, cacheKey)
      ).finally(() => inFlight.delete(cacheKey));
      inFlight.set(cacheKey, job);
    }
    const track = await job;
    return NextResponse.json(
      { track },
      track
        ? { headers: { "Cache-Control": "public, max-age=86400" } }
        : undefined
    );
  } catch {
    return NextResponse.json({ track: null });
  }
}
