"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PlayerSettings,
  SubtitleStyle,
  SubtitleTrack,
} from "./types";

const STORAGE_KEY = "anifire.player.settings.v1";

const baseStyle: SubtitleStyle = {
  fontSize: 30,
  color: "#FFFFFF",
  opacity: 1,
  background: 0.35,
  weight: 600,
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  edge: "shadow",
};

export const DEFAULT_SETTINGS: PlayerSettings = {
  selection: { primary: null, secondary: null },
  primaryStyle: { ...baseStyle },
  secondaryStyle: { ...baseStyle, fontSize: 24, color: "#FFC2A0", weight: 500 },
  subtitlePosition: 8,
  playbackRate: 1,
  quality: "1080p",
  upscale: "off",
  autoSkipIntro: false,
  autoSkipOutro: false,
};

function load(): PlayerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    // Merge so new fields gain defaults across versions.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      selection: { ...DEFAULT_SETTINGS.selection, ...parsed.selection },
      primaryStyle: { ...DEFAULT_SETTINGS.primaryStyle, ...parsed.primaryStyle },
      secondaryStyle: {
        ...DEFAULT_SETTINGS.secondaryStyle,
        ...parsed.secondaryStyle,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persisted player settings. `defaultSelection` seeds the dual-subtitle slots
 * from the available tracks on first run (when nothing is stored yet).
 */
export function usePlayerSettings(tracks: SubtitleTrack[]) {
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  // Guards the one-time auto-seed so the user can later turn both tracks off
  // without us re-enabling them on the next tracks update.
  const seededRef = useRef(false);
  // Track ids seen so far, so a *newly arrived* track (e.g. a translated Polish
  // track added after load) can auto-fill an empty slot exactly once.
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Hydrate from localStorage after mount — intentional one-shot sync that
    // can't run during SSR (no window), so the post-mount setState is expected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
    setHydrated(true);
  }, []);

  // Subtitle tracks load asynchronously and the set can be swapped out from
  // under us (a demo/fallback track list is replaced by real jimaku tracks with
  // different ids). On every tracks change we: (1) drop selected ids that no
  // longer exist, and (2) seed default slots when nothing valid is selected —
  // either on first load or after a track swap emptied the selection. A user's
  // explicit "both off" within the *same* track set is preserved (no stale ids
  // to drop, and we only auto-seed once).
  useEffect(() => {
    if (!hydrated || tracks.length === 0) return;
    setSettings((s) => {
      const ids = new Set(tracks.map((t) => t.id));
      const firstRun = seenIdsRef.current.size === 0;
      let { primary, secondary } = s.selection;

      const primaryStale = !!primary && !ids.has(primary);
      const secondaryStale = !!secondary && !ids.has(secondary);
      if (primaryStale) primary = null;
      if (secondaryStale) secondary = null;

      const emptied = !primary && !secondary;
      const seed = emptied && (!seededRef.current || primaryStale || secondaryStale);
      seededRef.current = true;

      if (seed) {
        primary = tracks[0]?.id ?? null;
        secondary = tracks[1]?.id ?? null;
      } else if (!firstRun) {
        // A brand-new track arrived (e.g. translated Polish): drop it into the
        // first empty slot once, so it shows without the user opening the menu.
        const fresh = tracks.find((t) => !seenIdsRef.current.has(t.id));
        if (fresh) {
          if (!primary && fresh.id !== secondary) primary = fresh.id;
          else if (!secondary && fresh.id !== primary) secondary = fresh.id;
        }
      }
      for (const id of ids) seenIdsRef.current.add(id);

      if (primary === s.selection.primary && secondary === s.selection.secondary) {
        return s;
      }
      return { ...s, selection: { primary, secondary } };
    });
  }, [tracks, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const updatePrimaryStyle = useCallback((patch: Partial<SubtitleStyle>) => {
    setSettings((s) => ({ ...s, primaryStyle: { ...s.primaryStyle, ...patch } }));
  }, []);

  const updateSecondaryStyle = useCallback((patch: Partial<SubtitleStyle>) => {
    setSettings((s) => ({
      ...s,
      secondaryStyle: { ...s.secondaryStyle, ...patch },
    }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return {
    settings,
    hydrated,
    update,
    updatePrimaryStyle,
    updateSecondaryStyle,
    reset,
  };
}
