"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Info,
  Pause,
  Play,
  Plus,
  ThumbsUp,
  VolumeX,
  Volume2,
  X,
} from "lucide-react";
import type { Movie } from "@/data/mockAnime";
import styles from "@/app/stream/stream.module.css";

/**
 * Netflix-style preview modal. Opens on card click: a mini "player" hero,
 * richer metadata and actions, plus a link to the full /anime/[id] page.
 */
export default function TitleModal({
  movie,
  onClose,
}: {
  movie: Movie | null;
  onClose: () => void;
}) {
  // Lock scroll + close on Escape while open.
  useEffect(() => {
    if (!movie) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [movie, onClose]);

  if (!movie) return null;

  return <TitleModalBody key={movie.id} movie={movie} onClose={onClose} />;
}

function TitleModalBody({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [added, setAdded] = useState(false);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.modalClose}
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* Mini player */}
        <div className={styles.modalHero}>
          <Image src={movie.heroImageUrl} alt="" className={styles.modalHeroImg} width={1600} height={900} unoptimized />
          <div className={styles.modalHeroScrim} />

          <button
            className={styles.modalBigPlay}
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>

          <div className={styles.modalHeroBottom}>
            <h2 className={styles.modalTitle}>{movie.title}</h2>
            <button
              className={styles.modalMute}
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          {/* Fake playback progress to imply a live mini-player */}
          <div className={styles.modalProgress} aria-hidden="true">
            <span className={playing ? styles.modalProgressFillOn : styles.modalProgressFill} />
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.modalActions}>
            <Link href={`/anime/${movie.id}`} className={styles.modalPlayBtn}>
              <Play size={18} fill="currentColor" /> Play
            </Link>
            <button
              className={`${styles.modalRound} ${added ? styles.modalRoundOn : ""}`}
              type="button"
              aria-label={added ? "In your list" : "Add to list"}
              onClick={() => setAdded((v) => !v)}
            >
              {added ? <Check size={18} /> : <Plus size={18} />}
            </button>
            <button className={styles.modalRound} type="button" aria-label="Like">
              <ThumbsUp size={17} />
            </button>
            <span className={styles.modalSpacer} />
            <Link
              href={`/anime/${movie.id}`}
              className={styles.modalDetailsBtn}
            >
              <Info size={16} /> Full page
            </Link>
          </div>

          <div className={styles.modalMeta}>
            <span className={styles.modalMatch}>{movie.match}% Match</span>
            <span className={styles.modalBadge}>{movie.rating}</span>
            <span>{movie.year}</span>
            <span>{movie.duration}</span>
            <span className={styles.modalBadge}>HD</span>
          </div>

          <p className={styles.modalDesc}>{movie.description}</p>

          <div className={styles.modalTags}>
            <span className={styles.modalTagsLabel}>Genres:</span>
            <span>{movie.genre}</span>
          </div>
          <div className={styles.modalTags}>
            <span className={styles.modalTagsLabel}>Tags:</span>
            <span>{movie.tags.join(" • ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
