"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Captions,
  Droplet,
  ListVideo,
  Maximize,
  Maximize2,
  Minimize,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { upscaleFilter } from "@/lib/upscale";
import type { Chapter } from "./types";
import { formatTime } from "./format";
import { usePlayerSettings } from "./usePlayerSettings";
import { usePlayer, type MiniLayout } from "./PlayerProvider";
import { fetchTranslatedTrack } from "@/data/animeApi";
import SubtitleOverlay from "./SubtitleOverlay";
import SettingsMenu from "./SettingsMenu";
import SeekBar from "./SeekBar";
import styles from "./player.module.css";

const SEEK_STEP = 5;
const HIDE_DELAY = 2600;
const SCRUB_HIDE = 1400;
const ASPECT = 9 / 16;
const MINI_MIN = 260;
const MINI_MAX = 760;

/**
 * The single, app-wide player. Mounted once in the root layout so playback (one
 * <video> element) survives route changes AND full↔mini switches — the video
 * lives at a stable position in the tree and is never remounted, so it never
 * reloads or loses its position. Renders the full overlay on /watch and a
 * draggable, resizable, dimmable floating window everywhere else.
 */
export default function PlayerRoot() {
  const router = useRouter();
  const { source, mode, mini, mergeTracks, minimize, maximize, close, setMini } =
    usePlayer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mediaKeyRef = useRef<string | null>(null);

  const tracks = useMemo(() => source?.tracks ?? [], [source]);
  const { settings, update, updatePrimaryStyle, updateSecondaryStyle, reset } =
    usePlayerSettings(tracks);

  // On-demand LLM subtitle translation requested from the settings menu.
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const canTranslate = (!!source?.anilistId || !!source?.malId) && source?.episode != null;
  const requestLanguage = useCallback(
    async (lang: string) => {
      const q = lang.trim();
      if (!q || (!source?.anilistId && !source?.malId) || source.episode == null) return;
      setTranslatingLang(q);
      try {
        const track = await fetchTranslatedTrack(
          { anilistId: source.anilistId, malId: source.malId, episode: source.episode },
          q
        );
        if (track) {
          mergeTracks([track]);
          // Show it right away: fill primary if empty, else the secondary slot.
          update({
            selection: settings.selection.primary
              ? { ...settings.selection, secondary: track.id }
              : { ...settings.selection, primary: track.id },
          });
        }
      } finally {
        setTranslatingLang(null);
      }
    },
    [source?.anilistId, source?.malId, source?.episode, mergeTracks, update, settings.selection]
  );
  const qualityOptions = useMemo(() => {
    const labels = source?.qualities?.map((q) => q.label).filter(Boolean) ?? [];
    return ["Auto", ...(labels.length ? labels : ["1080p", "720p", "480p"])];
  }, [source?.qualities]);
  const activeSrc = useMemo(() => {
    if (!source) return undefined;
    if (settings.quality === "Auto" || settings.quality === "Auto") {
      return source.qualities?.[0]?.src ?? source.src;
    }
    return source.qualities?.find((q) => q.label === settings.quality)?.src ?? source.src;
  }, [source, settings.quality]);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controls, setControls] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subsOn, setSubsOn] = useState(true);
  const [drag, setDrag] = useState<Pick<MiniLayout, "x" | "y" | "width"> | null>(
    null
  );
  const [opacityOpen, setOpacityOpen] = useState(false);

  const hideTimer = useRef<number | null>(null);
  const scrubTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  /* ─────────── media events ─────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onProgress = () => {
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(v.currentTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("durationchange", onLoaded);
    v.addEventListener("progress", onProgress);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("durationchange", onLoaded);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [source?.key]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const v = videoRef.current;
      if (v) setTime(v.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = settings.playbackRate;
  }, [settings.playbackRate]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeSrc) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    const isSameMedia = mediaKeyRef.current === source?.key;
    const resumeAt = isSameMedia ? v.currentTime : 0;
    const shouldResume = isSameMedia && !v.paused && !v.ended;
    const restorePlayback = () => {
      if (resumeAt > 0 && Number.isFinite(v.duration)) {
        v.currentTime = Math.min(resumeAt, Math.max(0, v.duration - 0.2));
      }
      if (shouldResume) v.play().catch(() => {});
    };
    mediaKeyRef.current = source?.key ?? null;

    v.addEventListener("loadedmetadata", restorePlayback, { once: true });
    const isHls = activeSrc.includes(".m3u8");

    if (!isHls) {
      v.src = activeSrc;
      v.load();
      return () => {
        v.removeEventListener("loadedmetadata", restorePlayback);
        v.removeAttribute("src");
        v.load();
      };
    }

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = activeSrc;
      v.load();
      return () => {
        v.removeEventListener("loadedmetadata", restorePlayback);
        v.removeAttribute("src");
        v.load();
      };
    }

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        videoRef.current.src = activeSrc;
        videoRef.current.load();
        return;
      }
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(activeSrc);
      hls.attachMedia(videoRef.current);
      cleanup = () => hls.destroy();
    });

    return () => {
      cancelled = true;
      cleanup?.();
      v.removeEventListener("loadedmetadata", restorePlayback);
      if (v) {
        v.removeAttribute("src");
        v.load();
      }
    };
  }, [activeSrc, source?.key]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
    }
  }, [volume, muted]);

  /* ─────────── transport ─────────── */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      const mediaDuration =
        Number.isFinite(duration) && duration > 0
          ? duration
          : Number.isFinite(v.duration) && v.duration > 0
            ? v.duration
            : Number.POSITIVE_INFINITY;
      const clamped = Math.max(
        0,
        mediaDuration === Number.POSITIVE_INFINITY ? t : Math.min(t, mediaDuration)
      );
      v.currentTime = clamped;
      setTime(clamped);
    },
    [duration]
  );

  const showControls = useCallback(() => {
    setScrubbing(false);
    setControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!settingsOpen) setControls(false);
    }, HIDE_DELAY);
  }, [settingsOpen]);

  const nudge = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      seekTo(v.currentTime + delta);
      setControls(false);
      setScrubbing(true);
      if (scrubTimer.current) window.clearTimeout(scrubTimer.current);
      scrubTimer.current = window.setTimeout(() => setScrubbing(false), SCRUB_HIDE);
    },
    [seekTo]
  );

  const changeVolume = useCallback((value: number) => {
    setVolume(value);
    setMuted(value === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const goMini = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setSettingsOpen(false);
    minimize();
    if (source) router.push(source.backHref);
  }, [minimize, router, source]);

  const goFull = useCallback(() => {
    maximize();
    if (source) router.push(source.selfHref);
  }, [maximize, router, source]);

  const doClose = useCallback(() => {
    const v = videoRef.current;
    if (v) v.pause();
    close();
  }, [close]);

  useEffect(() => {
    if (mode !== "full") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

  /* ─────────── keyboard (full mode only) ─────────── */
  useEffect(() => {
    if (mode !== "full") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          showControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          nudge(SEEK_STEP);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nudge(-SEEK_STEP);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          showControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          showControls();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "i":
          goMini();
          break;
        case "m":
          setMuted((m) => !m);
          showControls();
          break;
        case "c":
          setSubsOn((s) => !s);
          showControls();
          break;
        case "Escape":
          setSettingsOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, togglePlay, nudge, changeVolume, volume, toggleFullscreen, showControls, goMini]);

  /* ─────────── auto-skip intro ─────────── */
  useEffect(() => {
    if (!settings.autoSkipIntro || !source) return;
    const inIntro = activeChapter(source.chapters, time, "intro");
    if (inIntro && time < inIntro.end - 0.3) seekTo(inIntro.end + 0.5);
  }, [time, settings.autoSkipIntro, source, seekTo]);

  /* ─────────── mini drag / resize ─────────── */
  const resolvedMini = useMemo<MiniLayout>(() => {
    const width = drag?.width ?? mini.width;
    const height = width * ASPECT;
    let x = drag?.x ?? mini.x;
    let y = drag?.y ?? mini.y;
    if (typeof window !== "undefined") {
      if (x < 0) x = window.innerWidth - width - 24;
      if (y < 0) y = window.innerHeight - height - 24;
      x = Math.max(8, Math.min(x, window.innerWidth - width - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - height - 8));
    }
    return { x, y, width, opacity: mini.opacity };
  }, [drag, mini]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const base = { x: resolvedMini.x, y: resolvedMini.y, width: resolvedMini.width };
      const move = (ev: PointerEvent) => {
        setDrag({
          width: base.width,
          x: base.x + (ev.clientX - startX),
          y: base.y + (ev.clientY - startY),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDrag((d) => {
          if (d) setMini({ x: clampX(d.x, d.width), y: clampY(d.y, d.width) });
          return null;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [resolvedMini, setMini]
  );

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const baseW = resolvedMini.width;
      const baseX = resolvedMini.x;
      const baseY = resolvedMini.y;
      const move = (ev: PointerEvent) => {
        const width = Math.max(MINI_MIN, Math.min(MINI_MAX, baseW + (ev.clientX - startX)));
        setDrag({ x: baseX, y: baseY, width });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDrag((d) => {
          if (d) setMini({ width: d.width });
          return null;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [resolvedMini, setMini]
  );

  if (!source || mode === "closed") return null;

  const isMini = mode === "mini";
  const miniHeight = resolvedMini.width * ASPECT;
  const upFilter = upscaleFilter(settings.upscale);
  const videoStyle = upFilter === "none" ? undefined : { filter: upFilter };
  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const skipTarget = (() => {
    if (isMini) return null;
    const intro = activeChapter(source.chapters, time, "intro");
    const outro = activeChapter(source.chapters, time, "outro");
    if (intro) return { label: "Skip intro", to: intro.end + 0.5 };
    if (outro) return { label: "Skip outro", to: outro.end + 0.5 };
    return null;
  })();

  return (
    <div
      ref={shellRef}
      className={isMini ? styles.mini : `${styles.shell} ${controls ? styles.shellActive : ""}`}
      style={
        isMini
          ? {
              left: resolvedMini.x,
              top: resolvedMini.y,
              width: resolvedMini.width,
              height: miniHeight,
              opacity: resolvedMini.opacity,
            }
          : undefined
      }
      onMouseMove={isMini ? undefined : showControls}
      onMouseLeave={isMini ? undefined : () => !settingsOpen && setControls(false)}
      onClick={
        isMini
          ? undefined
          : () => {
              if (settingsOpen) setSettingsOpen(false);
              else togglePlay();
            }
      }
    >
      {/* The one persistent video element — stable across full ↔ mini. */}
      <video
        ref={videoRef}
        className={styles.video}
        poster={source.poster}
        playsInline
        style={videoStyle}
        onClick={isMini ? togglePlay : undefined}
      />

      {/* When paused, cover the frozen frame with the poster art — looks cleaner
          than a paused mid-scene. Clicks pass through to toggle play. */}
      {!playing && source.poster ? (
        <img
          src={source.poster}
          alt=""
          aria-hidden="true"
          className={styles.pausePoster}
        />
      ) : null}

      {subsOn && (
        <SubtitleOverlay
          tracks={source.tracks}
          settings={settings}
          time={time}
          lift={isMini ? 12 : controls ? 120 : 24}
          basisPx={
            isMini ? miniHeight : typeof window !== "undefined" ? window.innerHeight : 800
          }
          maxPx={isMini ? 20 : undefined}
        />
      )}

      {/* ════════ MINI CHROME ════════ */}
      {isMini ? (
        <>
          <div className={styles.miniDrag} onPointerDown={startDrag}>
            <span className={styles.miniTitle}>{source.title}</span>
            <div className={styles.miniTopBtns}>
              <button
                type="button"
                className={styles.miniBtn}
                aria-label="Maximize"
                onClick={goFull}
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                className={styles.miniBtn}
                aria-label="Close"
                onClick={doClose}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.miniPlay}
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>

          <div className={styles.miniBottom}>
            <div
              className={styles.miniProgress}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seekTo(((e.clientX - r.left) / r.width) * duration);
              }}
            >
              <div className={styles.miniProgressFill} style={{ width: `${pct}%` }} />
            </div>
            <button
              type="button"
              className={styles.miniBtn}
              aria-label="Opacity"
              onClick={() => setOpacityOpen((o) => !o)}
            >
              <Droplet size={14} />
            </button>
            {opacityOpen && (
              <input
                type="range"
                min={0.25}
                max={1}
                step={0.05}
                value={resolvedMini.opacity}
                className={styles.miniOpacity}
                aria-label="Opacity"
                onChange={(e) => setMini({ opacity: Number(e.target.value) })}
              />
            )}
          </div>

          <div className={styles.miniResize} onPointerDown={startResize} aria-hidden="true" />
        </>
      ) : (
        /* ════════ FULL CHROME ════════ */
        <>
          {scrubbing && (
            <SeekBar current={time} duration={duration} chapters={source.chapters} />
          )}

          <div className={styles.topAccent} />

          <div className={styles.topBar} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.backBtn}
              aria-label="Back"
              onClick={() => {
                doClose();
                router.push(source.backHref);
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className={styles.titleBlock}>
              <p className={styles.titleMain}>{source.title}</p>
              {source.subtitle ? <p className={styles.titleSub}>{source.subtitle}</p> : null}
            </div>
            <button
              type="button"
              className={styles.miniTrigger}
              aria-label="Minimize to mini player"
              title="Mini player (I)"
              onClick={goMini}
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {!playing && !scrubbing && (
            <button
              type="button"
              className={styles.bigPlay}
              aria-label="Play"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              <Play size={34} fill="currentColor" />
            </button>
          )}

          {skipTarget && controls && (
            <button
              type="button"
              className={styles.skipBtn}
              onClick={(e) => {
                e.stopPropagation();
                seekTo(skipTarget.to);
              }}
            >
              {skipTarget.label}
              <SkipForward size={16} />
            </button>
          )}

          <div className={styles.bottomBar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.metaRow}>
              <div className={styles.epInfo}>
                <p className={styles.epLabel}>{source.episodeLabel}</p>
                {source.episodeTitle ? (
                  <p className={styles.epTitle}>{source.episodeTitle}</p>
                ) : null}
              </div>
              <p className={styles.timecode}>
                {formatTime(time)} / {formatTime(duration)}
              </p>
            </div>

            <Progress
              pct={pct}
              bufPct={bufPct}
              duration={duration}
              chapters={source.chapters}
              onSeek={seekTo}
            />

            <div className={styles.controlsRow}>
              <div className={styles.ctrlLeft}>
                <IconBtn label="Episodes" onClick={() => router.push(source.backHref)}>
                  <ListVideo size={20} />
                </IconBtn>
                <IconBtn label="Subtitles" active={subsOn} onClick={() => setSubsOn((s) => !s)}>
                  <Captions size={20} />
                </IconBtn>
                {settings.upscale !== "off" && (
                  <span className={styles.upBadge} title="Upscale on">
                    <Sparkles size={14} />
                    {settings.upscale === "ai-4k"
                      ? "4K"
                      : settings.upscale === "ai-2x"
                        ? "×2"
                        : "HD+"}
                  </span>
                )}
              </div>

              <div className={styles.ctrlCenter}>
                <button
                  type="button"
                  className={styles.transportBtn}
                  aria-label="Previous episode"
                  disabled={!source.prevHref}
                  onClick={() => source.prevHref && router.push(source.prevHref)}
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className={styles.playBtn}
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={togglePlay}
                >
                  {playing ? (
                    <Pause size={26} fill="currentColor" />
                  ) : (
                    <Play size={26} fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.transportBtn}
                  aria-label="Next episode"
                  disabled={!source.nextHref}
                  onClick={() => source.nextHref && router.push(source.nextHref)}
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>

              <div className={styles.ctrlRight}>
                <div className={styles.volume}>
                  <IconBtn
                    label={muted ? "Unmute" : "Mute"}
                    onClick={() => setMuted((m) => !m)}
                  >
                    <VolumeIcon size={20} />
                  </IconBtn>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    className={styles.volumeSlider}
                    aria-label="Volume"
                    onChange={(e) => changeVolume(Number(e.target.value))}
                  />
                </div>

                <IconBtn label="Mini player" onClick={goMini}>
                  <PictureInPicture2 size={20} />
                </IconBtn>

                <div className={styles.settingsWrap}>
                  <IconBtn
                    label="Settings"
                    active={settingsOpen}
                    badge={settings.upscale !== "off"}
                    onClick={() => {
                      setSettingsOpen((o) => !o);
                      setControls(true);
                    }}
                  >
                    <Settings size={20} />
                  </IconBtn>
                  {settingsOpen && (
                    <SettingsMenu
                      tracks={source.tracks}
                      settings={settings}
                      onUpdate={update}
                      onUpdatePrimaryStyle={updatePrimaryStyle}
                      onUpdateSecondaryStyle={updateSecondaryStyle}
                      onReset={reset}
                      qualities={qualityOptions}
                      canTranslate={canTranslate}
                      translatingLang={translatingLang}
                      onRequestLanguage={requestLanguage}
                    />
                  )}
                </div>

                <IconBtn label="Fullscreen" onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </IconBtn>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function clampX(x: number, width: number) {
  if (typeof window === "undefined") return x;
  return Math.max(8, Math.min(x, window.innerWidth - width - 8));
}
function clampY(y: number, width: number) {
  if (typeof window === "undefined") return y;
  return Math.max(8, Math.min(y, window.innerHeight - width * ASPECT - 8));
}

function activeChapter(
  chapters: Chapter[],
  time: number,
  kind: Chapter["kind"]
): Chapter | null {
  return (
    chapters.find((c) => c.kind === kind && time >= c.start && time <= c.end) ??
    null
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
  badge,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${active ? styles.iconActive : ""}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {badge ? <span className={styles.iconBadge} /> : null}
    </button>
  );
}

function Progress({
  pct,
  bufPct,
  duration,
  chapters,
  onSeek,
}: {
  pct: number;
  bufPct: number;
  duration: number;
  chapters: Chapter[];
  onSeek: (t: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const ratioFromEvent = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  return (
    <div
      ref={barRef}
      className={styles.progress}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round((pct / 100) * duration)}
      tabIndex={0}
      onMouseMove={(e) => setHoverPct(ratioFromEvent(e.clientX) * 100)}
      onMouseLeave={() => setHoverPct(null)}
      onClick={(e) => onSeek(ratioFromEvent(e.clientX) * duration)}
    >
      <div className={styles.progressTrack}>
        <div className={styles.progressBuffer} style={{ width: `${bufPct}%` }} />
        {hoverPct !== null && (
          <div className={styles.progressHover} style={{ width: `${hoverPct}%` }} />
        )}
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        {duration > 0 &&
          chapters.map((c, i) => (
            <span
              key={i}
              className={`${styles.chapterTick} ${styles[c.kind] ?? ""}`}
              style={{
                left: `${(c.start / duration) * 100}%`,
                width: `${((c.end - c.start) / duration) * 100}%`,
              }}
              title={c.label ?? c.kind}
            />
          ))}
      </div>
      <span className={styles.progressKnob} style={{ left: `${pct}%` }} />
    </div>
  );
}
