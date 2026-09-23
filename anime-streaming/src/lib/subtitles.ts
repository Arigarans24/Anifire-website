import type { Cue, SubtitleTrack } from "@/components/player/types";

/**
 * Minimal WebVTT / SRT parser. Handles the cue forms we ship and most real-world
 * files: `HH:MM:SS.mmm --> HH:MM:SS.mmm` (VTT) and `HH:MM:SS,mmm` (SRT), with
 * multi-line cue text. Positioning/styling settings in the file are ignored — the
 * player owns presentation.
 */
export function parseSubtitles(raw: string): Cue[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const blocks = text.split(/\n\n+/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const timingLine = lines.find((l) => l.includes("-->"));
    if (!timingLine) continue;

    const [startRaw, endRaw] = timingLine.split("-->");
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;

    const idx = lines.indexOf(timingLine);
    const body = lines
      .slice(idx + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "") // strip inline tags
      .trim();
    if (body) cues.push({ start, end, text: body });
  }

  return cues.sort((a, b) => a.start - b.start);
}

function parseTimestamp(value: string): number {
  const m = value.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
  if (!m) return NaN;
  const [, h, mm, ss, ms] = m;
  return (
    (h ? Number(h) * 3600 : 0) +
    Number(mm) * 60 +
    Number(ss) +
    Number(ms.padEnd(3, "0")) / 1000
  );
}

/** Returns the cue active at `time`, or null. Linear scan is fine for one track. */
export function cueAt(cues: Cue[], time: number): Cue | null {
  for (const cue of cues) {
    if (time >= cue.start && time <= cue.end) return cue;
    if (cue.start > time) break;
  }
  return null;
}

/** Fetch and parse a remote .vtt/.srt file into a track. */
export async function loadTrack(
  url: string,
  meta: Omit<SubtitleTrack, "cues">
): Promise<SubtitleTrack> {
  const res = await fetch(url);
  const raw = await res.text();
  return { ...meta, cues: parseSubtitles(raw) };
}
