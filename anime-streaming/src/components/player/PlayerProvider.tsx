"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { PlayerSource, SubtitleTrack } from "./types";

export type PlayerMode = "closed" | "full" | "mini";

export interface MiniLayout {
  x: number; // px from left
  y: number; // px from top
  width: number; // px; height derived 16:9
  opacity: number; // 0.25..1
}

interface PlayerContextValue {
  source: PlayerSource | null;
  mode: PlayerMode;
  mini: MiniLayout;
  /** Open (or re-attach to) a source in full mode. Same key keeps playback. */
  open: (source: PlayerSource) => void;
  /** Merge extra subtitle tracks into the current source (dedup by id). */
  mergeTracks: (tracks: SubtitleTrack[]) => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  setMini: (patch: Partial<MiniLayout>) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const MINI_KEY = "anifire.player.mini.v1";

function loadMini(): MiniLayout {
  const fallback: MiniLayout = { x: -1, y: -1, width: 360, opacity: 1 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(MINI_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<PlayerSource | null>(null);
  const [mode, setMode] = useState<PlayerMode>("closed");
  const [mini, setMiniState] = useState<MiniLayout>(loadMini);

  const open = useCallback((next: PlayerSource) => {
    setSource((prev) => {
      // Same media already loaded: keep playback, but adopt richer subtitle
      // tracks / poster / translation context if they arrived asynchronously.
      if (prev?.key === next.key) {
        const adoptTracks = next.tracks !== prev.tracks && next.tracks.length > 0;
        if (adoptTracks || next.anilistId !== prev.anilistId || next.malId !== prev.malId) {
          return {
            ...prev,
            tracks: adoptTracks ? next.tracks : prev.tracks,
            poster: next.poster ?? prev.poster,
            anilistId: next.anilistId ?? prev.anilistId,
            malId: next.malId ?? prev.malId,
            episode: next.episode ?? prev.episode,
          };
        }
        return prev;
      }
      return next;
    });
    setMode("full");
  }, []);

  const mergeTracks = useCallback((extra: SubtitleTrack[]) => {
    if (extra.length === 0) return;
    setSource((prev) => {
      if (!prev) return prev;
      const byId = new Map(prev.tracks.map((t) => [t.id, t]));
      for (const t of extra) byId.set(t.id, t);
      return { ...prev, tracks: Array.from(byId.values()) };
    });
  }, []);

  const minimize = useCallback(() => setMode("mini"), []);
  const maximize = useCallback(() => setMode("full"), []);
  const close = useCallback(() => {
    setMode("closed");
    setSource(null);
  }, []);

  const setMini = useCallback((patch: Partial<MiniLayout>) => {
    setMiniState((m) => {
      const next = { ...m, ...patch };
      try {
        window.localStorage.setItem(MINI_KEY, JSON.stringify(next));
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ source, mode, mini, open, mergeTracks, minimize, maximize, close, setMini }),
    [source, mode, mini, open, mergeTracks, minimize, maximize, close, setMini]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
