"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { gsap } from "gsap";
import {
  ChevronLeft,
  Check,
  ChevronRight,
  Info,
  LayoutGrid,
  List,
  Pause,
  Play,
  Plus,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import CatalogView from "@/components/stream/CatalogView";
import RequireAuth from "@/components/auth/RequireAuth";
import { useMyList } from "@/lib/mylist";
import type { Movie, Row } from "@/data/mockAnime";
import { fetchMovies, fetchRows } from "@/data/animeApi";
import { fetchPlayerSource } from "@/data/playerData";
import StreamNav from "@/components/stream/StreamNav";
import StreamFooter from "@/components/stream/StreamFooter";
import TitleModal from "@/components/stream/TitleModal";
import styles from "./stream.module.css";

/* ───────────────────── Netflix-style card ───────────────────── */
function TitleCard({
  movie,
  onOpen,
}: {
  movie: Movie;
  onOpen: (m: Movie) => void;
}) {
  const { inList, isLiked, toggleList, toggleLike } = useMyList();
  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(movie)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(movie);
        }
      }}
    >
      <img src={movie.imageUrl} alt={movie.title} className={styles.cardImg} />
      <span className={styles.cardYear}>{movie.year}</span>

      <div className={styles.cardInfo}>
        <div className={styles.cardBtns}>
          <span className={`${styles.cBtn} ${styles.cBtnPlay}`} aria-hidden="true">
            <Play size={14} fill="currentColor" />
          </span>
          <button
            type="button"
            className={`${styles.cBtn} ${styles.cBtnGhost} ${inList(movie.id) ? styles.cBtnActive : ""}`}
            aria-label={inList(movie.id) ? "Remove from My List" : "Add to My List"}
            aria-pressed={inList(movie.id)}
            onClick={(e) => {
              e.stopPropagation();
              toggleList(movie.id);
            }}
          >
            {inList(movie.id) ? <Check size={14} /> : <Plus size={14} />}
          </button>
          <button
            type="button"
            className={`${styles.cBtn} ${styles.cBtnGhost} ${isLiked(movie.id) ? styles.cBtnActive : ""}`}
            aria-label={isLiked(movie.id) ? "Unlike" : "Like"}
            aria-pressed={isLiked(movie.id)}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(movie.id);
            }}
          >
            <ThumbsUp size={13} fill={isLiked(movie.id) ? "currentColor" : "none"} />
          </button>
          <span className={styles.cBtnSpacer} />
          <button
            type="button"
            className={`${styles.cBtn} ${styles.cBtnGhost}`}
            aria-label="More info"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(movie);
            }}
          >
            <Info size={13} />
          </button>
        </div>

        <div className={styles.cardMeta}>
          <span className={styles.cMatch}>{movie.match}% Match</span>
          <span className={styles.cBadge}>{movie.rating}</span>
          <span>{movie.duration}</span>
          <span className={styles.cBadge}>HD</span>
        </div>

        <p className={styles.cardTitle}>{movie.title}</p>
        <p className={styles.cardGenre}>{movie.genre}</p>
      </div>
    </article>
  );
}

function HeroPreviewVideo({
  src,
  poster,
  muted,
  playing,
}: {
  src: string | null;
  poster: string;
  muted: boolean;
  /** When false, the preview pauses and fades out so only the banner shows. */
  playing: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Only reveal the video once it's actually playing past the seek — otherwise
  // the half-loaded/seeking frame layers over the backdrop ("two pictures").
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    setRevealed(false);
    const onPlaying = () => !cancelled && setRevealed(true);
    video.addEventListener("playing", onPlaying);
    const play = () => {
      if (!cancelled && playing) video.play().catch(() => {});
    };
    const startAtPreview = () => {
      // Start ~1.5 min in (past intros/title cards) for a more "into it" preview.
      if (Number.isFinite(video.duration) && video.duration > 100) {
        video.currentTime = Math.min(90, video.duration - 5);
      }
      play();
    };

    video.addEventListener("loadedmetadata", startAtPreview, { once: true });

    if (!src.includes(".m3u8")) {
      video.src = src;
      video.load();
      return () => {
        cancelled = true;
        video.removeEventListener("loadedmetadata", startAtPreview);
      video.removeEventListener("playing", onPlaying);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.load();
      return () => {
        cancelled = true;
        video.removeEventListener("loadedmetadata", startAtPreview);
      video.removeEventListener("playing", onPlaying);
        video.removeAttribute("src");
        video.load();
      };
    }

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        videoRef.current.src = src;
        videoRef.current.load();
        return;
      }
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      cleanup = () => hls.destroy();
    });

    return () => {
      cancelled = true;
      cleanup?.();
      video.removeEventListener("loadedmetadata", startAtPreview);
      video.removeEventListener("playing", onPlaying);
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.volume = muted ? 0 : 0.28;
    if (!muted && playing) video.play().catch(() => {});
  }, [muted, playing]);

  // Play / pause the preview as the banner-only toggle flips.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
      setRevealed(false);
    }
  }, [playing]);

  if (!src) return null;

  return (
    <video
      ref={videoRef}
      className={styles.heroVideo}
      poster={poster}
      muted={muted}
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      style={{
        opacity: playing && revealed ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    />
  );
}

/* ───────────────────────── Content row ───────────────────────── */
function ContentRow({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: Movie[];
  onOpen: (m: Movie) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: 1 | -1) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  return (
    <section className={styles.row}>
      <h2 className={styles.rowTitle}>{title}</h2>

      <button
        className={`${styles.rowArrow} ${styles.rowArrowLeft}`}
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
      >
        <ChevronLeft size={28} />
      </button>

      <div ref={viewportRef} className={styles.rowViewport}>
        {items.map((movie, i) => (
          <TitleCard key={`${movie.id}-${i}`} movie={movie} onOpen={onOpen} />
        ))}
      </div>

      <button
        className={`${styles.rowArrow} ${styles.rowArrowRight}`}
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
      >
        <ChevronRight size={28} />
      </button>
    </section>
  );
}

/* ────────────────────────── Page ────────────────────────── */
function StreamExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // Hero preview on/off — off shows just the banner (poster) with no video.
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);
  // Data from the backend API. Starts empty (skeleton) rather than flashing mock
  // placeholder titles for a frame before the real catalog loads.
  const [movies, setMovies] = useState<Movie[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<{ movieId: number; src: string } | null>(null);
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  const urlQuery = searchParams.get("q") ?? "";
  const [view, setView] = useState<"rows" | "catalog" | "mylist">(
    urlView === "catalog" ? "catalog" : urlView === "mylist" ? "mylist" : "rows"
  );
  const { list: myListIds } = useMyList();

  // React to nav/search navigation (?view=catalog&q=...) without a full reload.
  useEffect(() => {
    if (urlView === "catalog") setView("catalog");
    else if (urlView === "mylist") setView("mylist");
    else if (urlView === "rows" || urlView === "genres") setView("rows");
  }, [urlView]);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Only the first few titles rotate through the hero (keeps the pager short).
  const heroMovies = useMemo(() => movies.slice(0, 6), [movies]);
  const active = heroMovies[activeIndex] ?? heroMovies[0];

  const goTo = useCallback(
    (i: number) => {
      if (heroMovies.length === 0) return;
      setActiveIndex((i + heroMovies.length) % heroMovies.length);
    },
    [heroMovies.length]
  );

  const openModal = useCallback((m: Movie) => setModalMovie(m), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMovies(), fetchRows()]).then(([m, r]) => {
      if (cancelled) return;
      setMovies(m);
      setRows(r);
      setActiveIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    // Rotate the hero slowly (~2.5 min) so a preview actually has time to play.
    const t = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroMovies.length);
    }, 150000);
    return () => window.clearInterval(t);
  }, [heroMovies.length]);

  useEffect(() => {
    let cancelled = false;
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    fetchPlayerSource(active, 1, 12).then((source) => {
      if (!cancelled) setPreview({ movieId: active.id, src: source.src });
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (bgRef.current) {
      gsap.fromTo(
        bgRef.current,
        { opacity: 0, scale: 1.08 },
        { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" }
      );
    }
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current.children,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.55, ease: "power2.out" }
      );
    }
  }, [activeIndex]);

  // Skeleton while the catalog loads — avoids the mock-title flash.
  if (!active) {
    return (
      <div className={styles.page}>
        <div className={styles.grain} />
        <StreamNav />
        <div className={styles.heroSkeleton} aria-busy="true">
          <div className={styles.skelHeroText}>
            <span className={styles.skelLine} style={{ width: "42%", height: 54 }} />
            <span className={styles.skelLine} style={{ width: "28%" }} />
            <span className={styles.skelLine} style={{ width: "60%" }} />
            <span className={styles.skelLine} style={{ width: "50%" }} />
          </div>
        </div>
        <div className={styles.skelRows}>
          {[0, 1, 2].map((r) => (
            <div key={r} className={styles.skelRow}>
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className={styles.skelCard} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.grain} />
      <StreamNav />

      {/* ══════════ HERO ══════════ */}
      <section className={styles.hero}>
        <div ref={bgRef} className={styles.heroBg} key={active.id}>
          <img src={active.heroImageUrl} alt="" className={styles.heroBgImg} />
          <HeroPreviewVideo
            src={preview?.movieId === active.id ? preview.src : null}
            poster={active.heroImageUrl}
            muted={muted}
            playing={heroPlaying}
          />
          <div className={styles.heroGradient} />
        </div>

        <div ref={contentRef} className={styles.heroContent} key={`c-${active.id}`}>
          <div className={styles.heroTags}>
            {active.tags.map((tag) => (
              <span key={tag} className={styles.heroTag}>
                {tag}
              </span>
            ))}
          </div>
          {active.logoImageUrl ? (
            <img src={active.logoImageUrl} alt={active.title} className={styles.heroLogo} />
          ) : (
            <h1 className={styles.heroTitle}>{active.title}</h1>
          )}
          <div className={styles.heroMetaRow}>
            <span className={styles.matchScore}>{active.match}% Match</span>
            <span className={styles.metaText}>{active.year}</span>
            <span className={styles.metaBadge}>{active.rating}</span>
            <span className={styles.metaText}>{active.duration}</span>
            <span className={styles.metaBadge}>HD</span>
          </div>
          <p className={styles.heroDesc}>{active.description}</p>
          <div className={styles.heroBtns}>
            <Link href={`/anime/${active.id}`} className={styles.btnPlay}>
              <Play size={20} fill="currentColor" />
              Play
            </Link>
            <button
              className={styles.btnInfo}
              type="button"
              onClick={() => openModal(active)}
            >
              <Info size={20} />
              More Info
            </button>
          </div>
        </div>

        <div className={styles.heroFooter}>
          <div className={styles.pager}>
            <div className={styles.dots}>
              {heroMovies.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`Go to ${m.title}`}
                  className={`${styles.dot} ${i === activeIndex ? styles.dotOn : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <div className={styles.arrows}>
              <button
                className={styles.arrow}
                type="button"
                aria-label="Previous"
                onClick={() => goTo(activeIndex - 1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className={styles.arrow}
                type="button"
                aria-label="Next"
                onClick={() => goTo(activeIndex + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className={styles.audio}>
            <button
              className={styles.audioBtn}
              type="button"
              aria-label={heroPlaying ? "Pause preview" : "Play preview"}
              title={heroPlaying ? "Show banner only" : "Play preview"}
              onClick={() => setHeroPlaying((v) => !v)}
            >
              {heroPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            </button>
            <div className={styles.audioText}>
              <span className={styles.audioLabel}>Audio</span>
              <span className={styles.audioVal}>Japanese / Subtitles</span>
            </div>
            <button
              className={styles.audioBtn}
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ VIEW SWITCH ══════════ */}
      <div className={styles.viewBar} id="catalog">
        <h2 className={styles.viewHeading}>Browse</h2>
        <div className={styles.viewToggle} role="tablist" aria-label="View style">
          <button
            type="button"
            role="tab"
            aria-selected={view === "rows"}
            className={`${styles.viewBtn} ${view === "rows" ? styles.viewBtnOn : ""}`}
            onClick={() => setView("rows")}
          >
            <LayoutGrid size={16} /> Rows
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "catalog"}
            className={`${styles.viewBtn} ${view === "catalog" ? styles.viewBtnOn : ""}`}
            onClick={() => setView("catalog")}
          >
            <List size={16} /> Catalog
          </button>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      {view === "rows" ? (
        <div className={styles.rows}>
          {rows.map((row) => (
            <ContentRow
              key={row.title}
              title={row.title}
              items={row.items}
              onOpen={openModal}
            />
          ))}
        </div>
      ) : view === "mylist" ? (
        (() => {
          const listMovies = movies.filter((m) => myListIds.includes(m.id));
          return listMovies.length > 0 ? (
            <CatalogView movies={listMovies} onOpen={openModal} />
          ) : (
            <div className={styles.emptyList}>
              <p>Your list is empty.</p>
              <span>Tap the + on any title to save it here.</span>
            </div>
          );
        })()
      ) : (
        <CatalogView movies={movies} onOpen={openModal} initialQuery={urlQuery} />
      )}

      {/* ══════════ FOOTER ══════════ */}
      <StreamFooter />

      <TitleModal movie={modalMovie} onClose={() => setModalMovie(null)} />
    </div>
  );
}

export default function StreamPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0707" }} />}>
        <StreamExperience />
      </Suspense>
    </RequireAuth>
  );
}
