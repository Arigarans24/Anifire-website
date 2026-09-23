import { NextResponse } from "next/server";
import { parseSrt, guessLang } from "@/data/srt";
import { resolveAnilistId } from "@/lib/anilist-server";
import type { SubtitleTrack } from "@/components/player/types";

const JIMAKU_API = "https://jimaku.cc/api";

interface JimakuEntry {
  id: number;
  flags?: { anime?: boolean };
}

interface JimakuFile {
  name: string;
  url: string;
  size?: number;
}

function auth(): HeadersInit {
  const key = process.env.JIMAKU_API_KEY ?? "";
  return { Authorization: key, Accept: "application/json" };
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

async function listFiles(entryId: number, episode: number): Promise<JimakuFile[]> {
  const res = await fetch(`${JIMAKU_API}/entries/${entryId}/files?episode=${episode}`, {
    headers: auth(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as JimakuFile[];
}

/**
 * Resolve up to two subtitle tracks for an episode from jimaku:
 *   GET /api/subtitles?anilistId=5114&episode=1
 * Returns { tracks: SubtitleTrack[] } (empty when nothing is available).
 * Only .srt files are parsed (robust); we prefer two distinct languages.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episode = Math.max(1, Number(searchParams.get("episode") ?? "1"));
  // Accept anilistId directly, or resolve it server-side from malId (avoids the
  // client hitting AniList's rate limit and silently losing subtitles).
  let anilistId = Number(searchParams.get("anilistId"));
  const malId = Number(searchParams.get("malId"));
  if (!anilistId && malId) {
    anilistId = (await resolveAnilistId(malId)) ?? 0;
  }

  if (!anilistId || !process.env.JIMAKU_API_KEY) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const entryId = await searchEntryId(anilistId);
    if (!entryId) return NextResponse.json({ tracks: [] });

    const files = (await listFiles(entryId, episode)).filter((f) =>
      f.name.toLowerCase().endsWith(".srt")
    );
    if (files.length === 0) return NextResponse.json({ tracks: [] });

    // Pick at most one file per language, max two languages.
    const byLang = new Map<string, JimakuFile>();
    for (const file of files) {
      const { lang } = guessLang(file.name);
      if (!byLang.has(lang)) byLang.set(lang, file);
      if (byLang.size >= 2) break;
    }

    const tracks: SubtitleTrack[] = [];
    for (const [lang, file] of byLang) {
      const dl = await fetch(file.url, { headers: auth(), cache: "no-store" });
      if (!dl.ok) continue;
      const cues = parseSrt(await dl.text());
      if (cues.length === 0) continue;
      tracks.push({ id: lang, label: guessLang(file.name).label, lang, cues });
    }

    // Cache at the edge/browser for a day — subtitle files rarely change.
    return NextResponse.json(
      { tracks },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ tracks: [] });
  }
}
