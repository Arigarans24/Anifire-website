"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MOCK_MOVIES } from "@/data/mockAnime";
import type { Movie } from "@/data/mockAnime";
import {
  fetchAniListId,
  fetchAniLibertyRelease,
  fetchEpisodes,
  fetchMovies,
  fetchSubtitleTracks,
  fetchTrailerEmbedUrl,
  recordWatchEvent,
} from "@/data/animeApi";
import type { Episode } from "@/data/animeApi";
import {
  buildAniLibertySource,
  fetchPlayerSource,
  hasRealVideo,
} from "@/data/playerData";
import { usePlayer } from "@/components/player/PlayerProvider";
import RequireAuth from "@/components/auth/RequireAuth";
import styles from "./watch.module.css";

type Status = "loading" | "player" | "trailer" | "unavailable";

function Watch() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { open, close, mode } = usePlayer();
  // A non-numeric route id is an AniLiberty release alias (from the "New
  // Episodes" feed) we play directly; numeric ids are our own catalog.
  const isAniAlias = !/^\d+$/.test(params.id);
  const id = Number(params.id);
  const episode = Math.max(1, Number(search.get("ep") ?? "1"));

  // Track the latest mode so the unmount cleanup can read it without re-subscribing.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Leaving the watch route while still in full mode (e.g. browser back) closes
  // the player; minimizing first sets "mini", so the floating window survives.
  useEffect(
    () => () => {
      if (modeRef.current === "full") close();
    },
    [close]
  );

  const [movie, setMovie] = useState<Movie>(
    () => MOCK_MOVIES.find((m) => m.id === id) ?? MOCK_MOVIES[0]
  );
  const [status, setStatus] = useState<Status>("loading");
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  // Title shown in the back bar for AniLiberty-alias playback.
  const [aniTitle, setAniTitle] = useState("");

  useEffect(() => {
    if (isAniAlias) return;
    let cancelled = false;
    fetchMovies().then((all) => {
      if (cancelled) return;
      setMovie(all.find((m) => m.id === id) ?? all[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [id, isAniAlias]);

  // Episode list (cached) gives us the real episode count for prev/next bounds
  // and per-episode preview thumbnails for the player poster.
  useEffect(() => {
    if (isAniAlias || !movie.malId) return;
    let cancelled = false;
    fetchEpisodes(movie.malId).then((eps) => {
      if (!cancelled) setEpisodes(eps);
    });
    return () => {
      cancelled = true;
    };
  }, [movie.malId, isAniAlias]);

  // AniLiberty direct playback: resolve the release by alias and open our own
  // player with its HLS streams (no external redirect).
  useEffect(() => {
    if (!isAniAlias) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    fetchAniLibertyRelease(params.id).then((release) => {
      if (cancelled) return;
      const source = release && buildAniLibertySource(release, episode);
      if (!source) {
        close();
        setTrailerUrl(null);
        setStatus("unavailable");
        return;
      }
      setAniTitle(release!.title);
      setStatus("player");
      open(source);
      recordWatchEvent({
        animeKey: params.id,
        animeTitle: source.title,
        episode,
        provider: source.provider,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isAniAlias, params.id, episode, open, close]);

  // Resolve the playback source. A real dub (AniLiberty) opens the full player.
  // Otherwise we fall back to the AniList trailer as a placeholder instead of
  // forcing a demo clip through the player.
  useEffect(() => {
    if (isAniAlias) return;
    let cancelled = false;
    // Reset to the loading state whenever the episode changes — intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    const total = episodes.length || 12;
    const poster = episodes.find((e) => e.number === episode)?.thumbnail ?? null;
    fetchPlayerSource(movie, episode, total, poster).then(async (source) => {
      if (cancelled) return;
      if (hasRealVideo(source)) {
        setTrailerUrl(null);
        setStatus("player");
        open(source);
        recordWatchEvent({
          animeKey: String(movie.id),
          animeTitle: source.title,
          episode,
          provider: source.provider,
        });
        // Enrich with real jimaku subtitles (original languages). We deliberately
        // do NOT auto-run any AI translation here — that would spawn a heavy local
        // LLM job for every episode opened. Translations are on-demand only, via
        // the language picker in the player's subtitle menu.
        if (movie.malId) {
          // Carry translation context (malId + best-effort anilistId) so the
          // player's language picker can request languages on demand.
          const anilistId = await fetchAniListId(movie.malId);
          const ctx = { malId: movie.malId, anilistId: anilistId ?? undefined, episode };
          const subs = await fetchSubtitleTracks({ malId: movie.malId, anilistId, episode });
          if (subs.length > 0 && !cancelled) open({ ...source, ...ctx, tracks: subs });
          else if (!cancelled) open({ ...source, ...ctx });
        }
        return;
      }
      // No dub available — close any open player and try a trailer.
      close();
      const url = await fetchTrailerEmbedUrl(movie.malId);
      if (cancelled) return;
      setTrailerUrl(url);
      setStatus(url ? "trailer" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [movie, episode, episodes, open, close, isAniAlias]);

  // Real playback is handled by the app-wide overlay (PlayerRoot in the layout);
  // for that case this route just owns the URL behind a black backdrop.
  if (status === "player") {
    return <div className={styles.backdrop} />;
  }

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.back}
        onClick={() => router.push(isAniAlias ? "/" : `/anime/${movie.id}`)}
      >
        <ArrowLeft size={18} />
        <span>{isAniAlias ? aniTitle || "Назад" : movie.title}</span>
      </button>

      {status === "loading" ? (
        <div className={styles.center}>
          <div className={styles.spinner} aria-label="Загрузка" />
        </div>
      ) : status === "trailer" && trailerUrl ? (
        <div className={styles.center}>
          <div className={styles.trailerFrame}>
            <span className={styles.badge}>Озвучка пока недоступна · трейлер</span>
            <iframe
              className={styles.iframe}
              src={trailerUrl}
              title={`${movie.title} — трейлер`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className={styles.center}>
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>Видео пока недоступно</p>
            <p className={styles.noticeText}>
              Для «{movie.title}» нет ни озвучки, ни трейлера. Загляните позже.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div style={{ background: "#000", height: "100dvh" }} />}>
        <Watch />
      </Suspense>
    </RequireAuth>
  );
}
