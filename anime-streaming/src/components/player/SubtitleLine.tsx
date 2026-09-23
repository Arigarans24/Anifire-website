"use client";

import type { CSSProperties } from "react";
import type { SubtitleStyle } from "./types";
import styles from "./player.module.css";

/**
 * One styled subtitle line. Font size scales with `basisPx` (the height of the
 * surface it sits on) so the same settings look right in the full player, the
 * mini window, and the settings preview.
 */
export default function SubtitleLine({
  text,
  style,
  basisPx,
  maxPx = 64,
}: {
  text: string;
  style: SubtitleStyle;
  basisPx: number;
  maxPx?: number;
}) {
  const px = Math.max(11, Math.min(maxPx, (style.fontSize / 1080) * basisPx));
  const css: CSSProperties = {
    fontSize: `${px}px`,
    color: style.color,
    opacity: style.opacity,
    fontWeight: style.weight,
    fontFamily: style.fontFamily,
    background:
      style.background > 0 ? `rgba(0,0,0,${style.background})` : "transparent",
    textShadow:
      style.edge === "shadow"
        ? "0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)"
        : "none",
    WebkitTextStroke:
      style.edge === "outline" ? "1px rgba(0,0,0,0.85)" : undefined,
  };
  return (
    <p className={styles.subtitleLine} style={css}>
      {text.split("\n").map((line, i) => (
        <span key={i} className={styles.subtitleRow}>
          {line}
        </span>
      ))}
    </p>
  );
}
