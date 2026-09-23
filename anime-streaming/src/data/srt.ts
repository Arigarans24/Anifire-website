/** Minimal SRT/VTT parser + language guessing, shared by the subtitles route. */

import type { Cue } from "@/components/player/types";

function toSeconds(stamp: string): number {
  // "00:01:02,500" or "00:01:02.500"
  const m = stamp.trim().match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!m) return 0;
  const [, h, min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms) / 1000;
}

/** Parse SRT (or WebVTT) text into timed cues, stripping markup. */
export function parseSrt(input: string): Cue[] {
  const text = input.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = text.split(/\n\s*\n/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    // Skip a leading numeric index line if present.
    let i = 0;
    if (/^\d+$/.test(lines[0].trim())) i = 1;
    const timing = lines[i];
    const arrow = timing?.match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/);
    if (!arrow) continue;
    const start = toSeconds(arrow[1]);
    const end = toSeconds(arrow[2]);
    const body = lines
      .slice(i + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "") // strip <i> etc.
      .replace(/\{[^}]*\}/g, "") // strip ASS-style overrides if any slipped in
      .trim();
    if (body && end > start) cues.push({ start, end, text: body });
  }
  return cues;
}

const LANG_LABELS: Record<string, string> = {
  ja: "日本語",
  en: "English",
  ru: "Русский",
};

/** Guess a BCP-47 language code from a jimaku filename. Defaults to Japanese. */
export function guessLang(filename: string): { lang: string; label: string } {
  const f = filename.toLowerCase();
  if (/[._\-\[ ](ru|rus|russian)[._\-\] ]/.test(f) || f.includes("russian")) {
    return { lang: "ru", label: LANG_LABELS.ru };
  }
  if (/[._\-\[ ](en|eng|english)[._\-\] ]/.test(f) || f.includes("english")) {
    return { lang: "en", label: LANG_LABELS.en };
  }
  return { lang: "ja", label: LANG_LABELS.ja };
}
