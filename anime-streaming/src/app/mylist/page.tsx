"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Play, Star, Trash2 } from "lucide-react";
import StreamNav from "@/components/stream/StreamNav";
import StreamFooter from "@/components/stream/StreamFooter";
import RequireAuth from "@/components/auth/RequireAuth";
import { useMyList } from "@/lib/mylist";
import { fetchMovies } from "@/data/animeApi";
import type { Movie } from "@/data/mockAnime";
import styles from "./mylist.module.css";

function MyListContent() {
  const { list, toggleList } = useMyList();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMovies().then((all) => {
      if (cancelled) return;
      setMovies(all);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => movies.filter((m) => list.includes(m.id)),
    [movies, list]
  );

  return (
    <div className={styles.page}>
      <StreamNav />

      <header className={styles.header}>
        <div className={styles.headIcon}>
          <Bookmark size={26} fill="currentColor" />
        </div>
        <div>
          <p className={styles.eyebrow}>Your collection</p>
          <h1 className={styles.title}>My List</h1>
          <p className={styles.sub}>
            {list.length > 0
              ? `${list.length} ${list.length === 1 ? "title" : "titles"} saved for later.`
              : "Save titles to watch them later."}
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={styles.skel} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Bookmark size={40} />
            <h2>Nothing here yet</h2>
            <p>Tap the + on any title to add it to your list.</p>
            <Link href="/stream" className={styles.browseBtn}>
              <Play size={16} fill="currentColor" /> Browse catalog
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((m) => (
              <div key={m.id} className={styles.card}>
                <Link href={`/anime/${m.id}`} className={styles.poster}>
                  <img src={m.imageUrl} alt={m.title} />
                  <span className={styles.playOverlay}>
                    <Play size={22} fill="currentColor" />
                  </span>
                  {m.match ? (
                    <span className={styles.score}>
                      <Star size={12} fill="currentColor" /> {(m.match / 10).toFixed(1)}
                    </span>
                  ) : null}
                </Link>
                <div className={styles.meta}>
                  <Link href={`/anime/${m.id}`} className={styles.name}>
                    {m.title}
                  </Link>
                  <span className={styles.genre}>{m.genre}</span>
                </div>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label="Remove from My List"
                  onClick={() => toggleList(m.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <StreamFooter />
    </div>
  );
}

export default function MyListPage() {
  return (
    <RequireAuth>
      <MyListContent />
    </RequireAuth>
  );
}
