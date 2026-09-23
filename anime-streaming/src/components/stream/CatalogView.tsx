"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { ListPlus, Search, Star, X } from "lucide-react";
import type { Movie } from "@/data/mockAnime";
import styles from "@/app/stream/stream.module.css";

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance",
  "Sci-Fi", "Slice of Life", "Supernatural", "Mystery", "Horror", "Sports",
];
const TYPES = ["TV", "ONA", "WEB", "OVA", "Movie", "Special"];
const STATUSES = ["Ongoing", "Finished"];

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CatalogView({
  movies,
  onOpen,
  initialQuery = "",
}: {
  movies: Movie[];
  onOpen: (m: Movie) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q)) return false;
      // Strict on type (all backend titles default to TV); soft on genre/status
      // until the backend stores that metadata — selected chips never empty the
      // list when the field is absent.
      if (types.size && !types.has("TV")) return false;
      return true;
    });
  }, [movies, query, types]);

  // GSAP: stagger the cards in whenever the filtered set changes.
  useEffect(() => {
    if (!listRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    gsap.fromTo(
      listRef.current.children,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.45, ease: "power2.out" }
    );
  }, [filtered]);

  const hasFilters =
    query || genres.size || types.size || statuses.size;
  const clearAll = () => {
    setQuery("");
    setGenres(new Set());
    setTypes(new Set());
    setStatuses(new Set());
  };

  return (
    <div className={styles.catalog}>
      <div className={styles.catSearch}>
        <span className={styles.catSearchIcon}>
          <Search size={18} />
        </span>
        <input
          className={styles.catSearchInput}
          placeholder="Search the catalog…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search catalog"
        />
        <button
          className={styles.catClearBtn}
          type="button"
          onClick={clearAll}
          disabled={!hasFilters}
          aria-label="Clear filters"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.catGrid}>
        {/* ───────── list ───────── */}
        <div ref={listRef} className={styles.catList}>
          {filtered.length === 0 ? (
            <p className={styles.catEmpty}>Nothing matches your filters.</p>
          ) : (
            filtered.map((m) => (
              <article
                key={m.id}
                className={styles.catCard}
                onClick={() => onOpen(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(m);
                  }
                }}
              >
                <div className={styles.catPoster}>
                  <Image src={m.imageUrl} alt={m.title} width={300} height={420} loading="lazy" unoptimized />
                </div>
                <div className={styles.catBody}>
                  <h3 className={styles.catTitle}>{m.title}</h3>
                  <div className={styles.catMeta}>
                    <span>{m.year}</span>
                    <span>·</span>
                    <span>{m.genre}</span>
                    <span>·</span>
                    <span>{m.rating}</span>
                    <span className={styles.catMatch}>{m.match}% Match</span>
                  </div>
                  <p className={styles.catSynopsis}>{m.description}</p>
                  <div className={styles.catActions}>
                    <button
                      className={styles.catIconBtn}
                      type="button"
                      aria-label="Add to favorites"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Star size={16} />
                    </button>
                    <button
                      className={styles.catIconBtn}
                      type="button"
                      aria-label="Add to list"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListPlus size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* ───────── filters ───────── */}
        <aside className={styles.filterPanel}>
          <div className={styles.filterSection}>
            <h4 className={styles.filterTitle}>Genres</h4>
            <p className={styles.filterHint}>
              Pick genres — multiple selections are combined.
            </p>
            <div className={styles.filterChips}>
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`${styles.chip} ${genres.has(g) ? styles.chipOn : ""}`}
                  onClick={() => setGenres((s) => toggle(s, g))}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h4 className={styles.filterTitle}>Type</h4>
            <p className={styles.filterHint}>Filter releases by format.</p>
            <div className={styles.filterChips}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.chip} ${types.has(t) ? styles.chipOn : ""}`}
                  onClick={() => setTypes((s) => toggle(s, t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h4 className={styles.filterTitle}>Release status</h4>
            <p className={styles.filterHint}>Airing or finished.</p>
            <div className={styles.filterChips}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.chip} ${statuses.has(s) ? styles.chipOn : ""}`}
                  onClick={() => setStatuses((set) => toggle(set, s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.filterReset}
            type="button"
            onClick={clearAll}
            disabled={!hasFilters}
          >
            Reset filters
          </button>
        </aside>
      </div>
    </div>
  );
}
