"use client";

import { useMemo } from "react";
import type { Chapter } from "./types";
import { formatTime } from "./format";
import styles from "./player.module.css";

/**
 * Minimal scrub overlay shown ONLY while the user is seeking with the arrow keys.
 * A bordered track with a white elapsed block and intro/outro chapter ticks
 * (the "рисочки") above and below the line — nothing else on screen.
 */
export default function SeekBar({
  current,
  duration,
  chapters,
}: {
  current: number;
  duration: number;
  chapters: Chapter[];
}) {
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  const marks = useMemo(() => {
    const out: { at: number; kind: Chapter["kind"]; edge: "start" | "end" }[] =
      [];
    for (const c of chapters) {
      out.push({ at: c.start, kind: c.kind, edge: "start" });
      out.push({ at: c.end, kind: c.kind, edge: "end" });
    }
    return out;
  }, [chapters]);

  return (
    <div className={styles.seekOverlay} role="presentation">
      <div className={styles.seekBar}>
        <div className={styles.seekFill} style={{ width: `${pct}%` }} />
        <div className={styles.seekHead} style={{ left: `${pct}%` }} />
        {marks.map((m, i) =>
          duration > 0 ? (
            <span
              key={i}
              className={`${styles.seekMark} ${styles[m.kind] ?? ""}`}
              style={{ left: `${(m.at / duration) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <div className={styles.seekTime}>
        {formatTime(current)} / {formatTime(duration)}
      </div>
    </div>
  );
}
