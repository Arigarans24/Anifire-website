"use client";

import { useMemo } from "react";
import { cueAt } from "@/lib/subtitles";
import type { PlayerSettings, SubtitleTrack } from "./types";
import SubtitleLine from "./SubtitleLine";
import styles from "./player.module.css";

/**
 * Dual-subtitle renderer. The secondary track sits on the upper line, the
 * primary on the lower line, each styled independently.
 */
export default function SubtitleOverlay({
  tracks,
  settings,
  time,
  lift,
  basisPx,
  maxPx,
}: {
  tracks: SubtitleTrack[];
  settings: PlayerSettings;
  time: number;
  /** Extra bottom offset (px) so subtitles ride above the controls bar. */
  lift: number;
  /** Height of the surface, for proportional font sizing. */
  basisPx: number;
  maxPx?: number;
}) {
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const primary = settings.selection.primary
    ? byId.get(settings.selection.primary)
    : null;
  const secondary = settings.selection.secondary
    ? byId.get(settings.selection.secondary)
    : null;

  const primaryText = primary ? cueAt(primary.cues, time)?.text : undefined;
  const secondaryText = secondary
    ? cueAt(secondary.cues, time)?.text
    : undefined;

  if (!primaryText && !secondaryText) return null;

  return (
    <div
      className={styles.subtitleLayer}
      style={{ bottom: `calc(${settings.subtitlePosition}% + ${lift}px)` }}
    >
      {secondaryText ? (
        <SubtitleLine
          text={secondaryText}
          style={settings.secondaryStyle}
          basisPx={basisPx}
          maxPx={maxPx}
        />
      ) : null}
      {primaryText ? (
        <SubtitleLine
          text={primaryText}
          style={settings.primaryStyle}
          basisPx={basisPx}
          maxPx={maxPx}
        />
      ) : null}
    </div>
  );
}
