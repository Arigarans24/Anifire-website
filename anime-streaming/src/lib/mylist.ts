"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side "My List" + likes, persisted to localStorage. No backend table
 * exists for these yet, so we keep them on the device and broadcast changes via
 * a custom event so every card / the navbar stay in sync.
 */
const LIST_KEY = "anifire.mylist.v1";
const LIKES_KEY = "anifire.likes.v1";
const EVENT = "anifire:lists";

function read(key: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, ids: number[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage disabled — non-fatal */
  }
}

function toggle(key: string, id: number): void {
  const ids = read(key);
  write(key, ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
}

export function useMyList() {
  const [list, setList] = useState<number[]>([]);
  const [likes, setLikes] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => {
      setList(read(LIST_KEY));
      setLikes(read(LIKES_KEY));
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleList = useCallback((id: number) => toggle(LIST_KEY, id), []);
  const toggleLike = useCallback((id: number) => toggle(LIKES_KEY, id), []);

  return {
    list,
    likes,
    inList: useCallback((id: number) => list.includes(id), [list]),
    isLiked: useCallback((id: number) => likes.includes(id), [likes]),
    toggleList,
    toggleLike,
  };
}
