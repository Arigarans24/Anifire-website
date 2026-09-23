/**
 * Tiny persistent TTL cache (in-memory + localStorage) so the detail page,
 * episode list and player sources don't re-hit Jikan / AniList / the backend on
 * every navigation. Stale-while-revalidate: a fresh entry is returned instantly;
 * an expired one is dropped and the loader runs again.
 *
 * In-flight requests are de-duped so two components asking for the same key in
 * the same tick share a single network round-trip.
 */

const PREFIX = "anifire.cache.";

interface Entry<T> {
  v: T;
  exp: number; // epoch ms when this entry goes stale
}

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function read<T>(key: string): Entry<T> | null {
  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem) return mem;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function write<T>(key: string, entry: Entry<T>): void {
  memory.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

/**
 * Return the cached value for `key` if still fresh, otherwise run `loader`,
 * cache the result for `ttlMs`, and return it. `null`/`undefined` results are
 * not cached so a transient failure can be retried.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = read<T>(key);
  if (hit && hit.exp > Date.now()) return hit.v;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = (async () => {
    try {
      const value = await loader();
      if (value != null) write(key, { v: value, exp: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

export const TTL = {
  /** Anime detail / episode lists rarely change — keep for a day. */
  long: 24 * 60 * 60 * 1000,
  /** Playback sources (signed HLS URLs may expire) — keep for 30 min. */
  short: 30 * 60 * 1000,
} as const;
