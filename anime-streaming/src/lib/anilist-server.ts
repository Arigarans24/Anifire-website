/**
 * Server-side MAL → AniList id resolver for the subtitle routes.
 *
 * Doing this on the server (one shared cache, one IP) instead of in every client
 * navigation avoids AniList's aggressive per-client rate limiting (429), which
 * was silently breaking jimaku subtitle lookups. Results are cached for the life
 * of the server process and retried a couple of times on transient failures.
 */
const ANILIST_URL = "https://graphql.anilist.co";
const cache = new Map<number, number>();

export async function resolveAnilistId(malId: number): Promise<number | null> {
  if (!malId) return null;
  const hit = cache.get(malId);
  if (hit) return hit;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { id } }`,
          variables: { idMal: malId },
        }),
        cache: "no-store",
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) || 1.5;
        await sleep(retryAfter * 1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { Media?: { id?: number } | null } };
      const id = data.data?.Media?.id ?? null;
      if (id) cache.set(malId, id);
      return id;
    } catch {
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
