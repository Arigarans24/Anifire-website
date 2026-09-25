import { MOCK_MOVIES, ROWS } from "./mockAnime";
import type { Movie, Row } from "./mockAnime";
import { API_BASE, authFetch } from "@/lib/auth-client";
import { cached, TTL } from "./cache";
import type { SubtitleTrack } from "@/components/player/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/v1/animes";
const JIKAN_URL = "https://api.jikan.moe/v4";
const ANILIST_URL = "https://graphql.anilist.co";

interface BackendAnime {
  id: number;
  malId: number;
  title: string;
  synopsis: string;
  imageUrl: string;
  rating: number | null;
  deleted: boolean;
  creationDate: string;
  creatorUserId: number | null;
  categories?: Category[];
}

interface AniListMedia {
  id: number | null;
  bannerImage: string | null;
  seasonYear: number | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
  } | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  } | null;
  trailer: {
    id: string | null;
    site: string | null;
    thumbnail: string | null;
  } | null;
  streamingEpisodes:
    | {
        title: string | null;
        thumbnail: string | null;
      }[]
    | null;
}

interface TmdbAssets {
  logoImageUrl?: string | null;
  backdropImageUrl?: string | null;
}

const aniListCache = new Map<number, Promise<AniListMedia | null>>();
const tmdbAssetsCache = new Map<string, Promise<TmdbAssets | null>>();

export interface Category {
  id: number;
  name: string;
  deleted: boolean;
  creationDate: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AnimeFormInput {
  title: string;
  description: string;
  imageUrl: string;
  rating: number | null;
  categoryIds: number[];
}

export interface Comment {
  id: number;
  animeId: number;
  description: string;
  creationDate: string;
  deleted: boolean;
  creatorUserId: number | null;
  authorName: string | null;
  authorRole: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
}

export interface AdminAnalytics {
  users: {
    total: number;
    admins: number;
    regularUsers: number;
    verified: number;
    unverified: number;
  };
  content: {
    anime: number;
    categories: number;
    comments: number;
    averageCommentsPerAnime: number;
  };
  categories: {
    id: number;
    name: string;
    animeCount: number;
  }[];
  activity: {
    label: string;
    value: number;
  }[];
  watch: {
    totalViews: number;
    viewsToday: number;
    views7d: number;
    uniqueViewers: number;
    uniqueViewers7d: number;
  };
  topAnime: {
    animeKey: string;
    title: string;
    views: number;
  }[];
  dailyViews: {
    date: string;
    views: number;
  }[];
  recentViews: {
    user: string;
    animeKey: string;
    animeTitle: string;
    episode: number;
    provider: string | null;
    watchedAt: string | null;
  }[];
}

// MAL CDN posters come in three sizes encoded in the filename:
//   .../94745.jpg (medium) · .../94745t.jpg (thumb) · .../94745l.jpg (large)
// The backend stores the medium one — upgrade to the large WebP for hero/backdrop
// so the full-bleed banner isn't a stretched, blurry thumbnail.
function heroImage(url: string): string {
  if (!url.includes("myanimelist.net")) return url;
  return url.replace(/\/([^/]+)\.(jpg|jpeg|png|webp)$/i, "/$1l.webp");
}

function mapToMovie(a: BackendAnime): Movie {
  const categories = a.categories?.map((c) => c.name) ?? [];
  return {
    id: Number(a.id),
    malId: a.malId,
    title: a.title,
    description: a.synopsis || "",
    year: "—",
    rating: "16+",
    duration: "24 min",
    genre: categories.length ? categories.join(" • ") : "Anime",
    match: a.rating ? Math.round(a.rating * 10) : 90,
    imageUrl: a.imageUrl || "/hero-1.png",
    heroImageUrl: heroImage(a.imageUrl || "/hero-1.png"),
    tags: categories,
  };
}

async function fetchAniListMedia(malId: number): Promise<AniListMedia | null> {
  if (!malId) return null;
  const cached = aniListCache.get(malId);
  if (cached) return cached;

  const request = fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($idMal: Int) {
          Media(idMal: $idMal, type: ANIME) {
            id
            bannerImage
            seasonYear
            coverImage { extraLarge large }
            title { romaji english native }
            trailer { id site thumbnail }
            streamingEpisodes { title thumbnail }
          }
        }
      `,
      variables: { idMal: malId },
    }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`AniList ${res.status}`);
      const data = (await res.json()) as { data?: { Media?: AniListMedia | null } };
      return data.data?.Media ?? null;
    })
    .catch(() => null);

  aniListCache.set(malId, request);
  // Don't poison the cache with a transient failure (AniList 429s a lot) —
  // drop null results so the next call retries.
  request.then((media) => {
    if (!media) aniListCache.delete(malId);
  });
  return request;
}

async function fetchTmdbAssets(
  title: string,
  year?: string | number | null
): Promise<TmdbAssets | null> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const cleanYear = String(year ?? "").match(/^\d{4}$/)?.[0];
  const cacheKey = `${trimmedTitle.toLowerCase()}:${cleanYear ?? ""}`;
  const cached = tmdbAssetsCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ title: trimmedTitle });
  if (cleanYear) params.set("year", cleanYear);

  const request = fetch(`/api/media-assets?${params}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`TMDB assets ${res.status}`);
      return (await res.json()) as TmdbAssets;
    })
    .catch(() => null);

  tmdbAssetsCache.set(cacheKey, request);
  return request;
}

/**
 * Resolve a YouTube/Dailymotion trailer embed URL for an anime via AniList.
 * Used as a placeholder on the watch page when no real dub source exists.
 */
export async function fetchTrailerEmbedUrl(malId?: number): Promise<string | null> {
  if (!malId) return null;
  const media = await fetchAniListMedia(malId);
  const trailer = media?.trailer;
  if (!trailer?.id) return null;
  if (trailer.site === "youtube") {
    return `https://www.youtube.com/embed/${trailer.id}?autoplay=1&rel=0&modestbranding=1`;
  }
  if (trailer.site === "dailymotion") {
    return `https://www.dailymotion.com/embed/video/${trailer.id}?autoplay=1`;
  }
  return null;
}

async function enrichMovieMedia(movie: Movie): Promise<Movie> {
  if (!movie.malId) return movie;
  const media = await fetchAniListMedia(movie.malId);
  const tmdbTitle = media?.title?.english ?? media?.title?.romaji ?? movie.title;
  const tmdbAssets = await fetchTmdbAssets(
    tmdbTitle,
    media?.seasonYear ?? movie.year
  );

  if (!media && !tmdbAssets) return movie;

  return {
    ...movie,
    imageUrl: media?.coverImage?.extraLarge ?? media?.coverImage?.large ?? movie.imageUrl,
    heroImageUrl:
      tmdbAssets?.backdropImageUrl ??
      media?.bannerImage ??
      media?.trailer?.thumbnail ??
      media?.coverImage?.extraLarge ??
      movie.heroImageUrl,
    logoImageUrl: tmdbAssets?.logoImageUrl ?? movie.logoImageUrl,
    year: media?.seasonYear ? String(media.seasonYear) : movie.year,
  };
}

async function enrichMoviesMedia(movies: Movie[]): Promise<Movie[]> {
  return Promise.all(movies.map(enrichMovieMedia));
}

async function fetchMovies(): Promise<Movie[]> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data: BackendAnime[] = await res.json();
    if (!data || data.length === 0) return MOCK_MOVIES;
    return enrichMoviesMedia(data.map(mapToMovie));
  } catch {
    return MOCK_MOVIES;
  }
}

/** Build Netflix-style rows: a couple of curated rows + one row per genre. */
export function buildRows(movies: Movie[]): Row[] {
  if (movies.length === 0) return [];

  // Group titles by genre (category names live on movie.tags).
  const byGenre = new Map<string, Movie[]>();
  for (const m of movies) {
    for (const tag of m.tags) {
      if (tag.toLowerCase() === "top anime") continue; // catch-all, not a real genre
      const list = byGenre.get(tag) ?? [];
      list.push(m);
      byGenre.set(tag, list);
    }
  }

  const topRated = [...movies].sort((a, b) => b.match - a.match);
  const rows: Row[] = [
    { title: "Trending Now", items: topRated },
    { title: "New Releases", items: [...movies].reverse() },
  ];

  // Genres with enough titles to scroll, biggest first.
  const genreRows = [...byGenre.entries()]
    .filter(([, items]) => items.length >= 4)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([title, items]) => ({ title, items }));

  return [...rows, ...genreRows];
}

async function fetchRows(): Promise<Row[]> {
  const movies = await fetchMovies();
  if (movies === MOCK_MOVIES) return ROWS;
  return buildRows(movies);
}

async function parseApi<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: unknown }).message)
        : "Request failed.";
    throw new Error(message);
  }
  return data as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/v1/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPagedMovies(input: {
  page?: number;
  size?: number;
  search?: string;
  categoryId?: number | null;
}): Promise<PagedResponse<Movie>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 0),
    size: String(input.size ?? 12),
    search: input.search ?? "",
  });
  if (input.categoryId) params.set("categoryId", String(input.categoryId));
  const res = await fetch(`${API_BASE}/api/v1/animes/paged?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const fallback = MOCK_MOVIES.slice(0, input.size ?? 12);
    return {
      items: fallback,
      page: 0,
      size: fallback.length,
      totalItems: fallback.length,
      totalPages: 1,
      first: true,
      last: true,
    };
  }
  const page = (await res.json()) as PagedResponse<BackendAnime>;
  return { ...page, items: page.items.map(mapToMovie) };
}

export async function createAnime(input: AnimeFormInput): Promise<Movie> {
  const res = await authFetch(`${API_BASE}/api/v1/animes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapToMovie(await parseApi<BackendAnime>(res));
}

export async function updateAnime(id: number, input: AnimeFormInput): Promise<Movie> {
  const res = await authFetch(`${API_BASE}/api/v1/animes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return mapToMovie(await parseApi<BackendAnime>(res));
}

export async function deleteAnime(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/v1/animes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete anime.");
}

export async function createCategory(name: string): Promise<Category> {
  const res = await authFetch(`${API_BASE}/api/v1/categories`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return parseApi(res);
}

export async function updateCategory(id: number, name: string): Promise<Category> {
  const res = await authFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  return parseApi(res);
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category.");
}

export async function fetchComments(animeId: number): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/api/v1/animes/${animeId}/comments`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addComment(animeId: number, description: string): Promise<Comment> {
  const res = await authFetch(`${API_BASE}/api/v1/animes/${animeId}/comments`, {
    method: "POST",
    body: JSON.stringify({ description }),
  });
  return parseApi(res);
}

export async function updateComment(id: number, description: string): Promise<Comment> {
  const res = await authFetch(`${API_BASE}/api/v1/comments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ description }),
  });
  return parseApi(res);
}

export async function deleteComment(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/v1/comments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete comment.");
}

/**
 * Record a "user started watching" event for the admin dashboard stats.
 * Fire-and-forget: failures (not signed in, backend down) are swallowed so
 * playback is never affected.
 */
export async function recordWatchEvent(input: {
  animeKey: string;
  animeTitle: string;
  episode: number;
  provider?: string;
}): Promise<void> {
  try {
    await authFetch(`${API_BASE}/api/v1/watch-events`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    /* non-fatal */
  }
}

/** Generate a short AI viewer review locally (Ollama). Returns null on failure. */
export async function fetchAiReview(
  title: string,
  synopsis: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/ai-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, synopsis }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { review: string | null };
    return data.review ?? null;
  } catch {
    return null;
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await authFetch(`${API_BASE}/api/v1/admin/users`);
  return parseApi(res);
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const res = await authFetch(`${API_BASE}/api/v1/admin/analytics`);
  return parseApi(res);
}

export async function updateAdminUser(
  id: number,
  input: Partial<Pick<AdminUser, "displayName" | "email" | "role" | "emailVerified">>
): Promise<AdminUser> {
  const res = await authFetch(`${API_BASE}/api/v1/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return parseApi(res);
}

/* ───────────────────── Detail page (live Jikan data) ───────────────────── */

export interface AnimeDetail {
  malId: number;
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  synopsis: string;
  background: string;
  type: string | null;
  source: string | null;
  status: string | null;
  episodes: number | null;
  duration: string | null;
  rating: string | null;
  score: number | null;
  rank: number | null;
  popularity: number | null;
  season: string | null;
  year: number | null;
  airedString: string | null;
  broadcastDay: string | null;
  genres: string[];
  studios: string[];
  heroImageUrl: string;
  posterImageUrl: string;
  logoImageUrl: string | null;
  trailerEmbedUrl: string | null;
}

interface JikanNamed {
  name: string;
}

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  background: string | null;
  type: string | null;
  source: string | null;
  status: string | null;
  episodes: number | null;
  duration: string | null;
  rating: string | null;
  score: number | null;
  rank: number | null;
  popularity: number | null;
  season: string | null;
  year: number | null;
  aired: { string: string | null } | null;
  broadcast: { day: string | null } | null;
  genres: JikanNamed[];
  studios: JikanNamed[];
  images: { jpg: { large_image_url: string; image_url: string } };
  trailer: { embed_url: string | null } | null;
}

export interface Episode {
  number: number;
  title: string;
  duration: string;
  thumbnail: string | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function fetchAnimeDetail(
  malId: number
): Promise<AnimeDetail | null> {
  return cached(`detail:${malId}`, TTL.long, () => loadAnimeDetail(malId));
}

async function loadAnimeDetail(malId: number): Promise<AnimeDetail | null> {
  try {
    const res = await fetch(`${JIKAN_URL}/anime/${malId}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    const { data: a }: { data: JikanAnime } = await res.json();
    const media = await fetchAniListMedia(malId);
    const tmdbAssets = await fetchTmdbAssets(
      a.title_english ?? media?.title?.english ?? media?.title?.romaji ?? a.title,
      media?.seasonYear ?? a.year
    );
    return {
      malId: a.mal_id,
      title: a.title,
      titleEnglish: a.title_english,
      titleJapanese: a.title_japanese,
      synopsis: a.synopsis ?? "",
      background: a.background ?? "",
      type: a.type,
      source: a.source,
      status: a.status,
      episodes: a.episodes,
      duration: a.duration,
      rating: a.rating,
      score: a.score,
      rank: a.rank,
      popularity: a.popularity,
      season: a.season ? cap(a.season) : null,
      year: a.year,
      airedString: a.aired?.string ?? null,
      broadcastDay: a.broadcast?.day ?? null,
      genres: a.genres.map((g) => g.name),
      studios: a.studios.map((s) => s.name),
      heroImageUrl:
        tmdbAssets?.backdropImageUrl ?? media?.bannerImage ?? a.images.jpg.large_image_url,
      posterImageUrl: media?.coverImage?.extraLarge ?? a.images.jpg.large_image_url,
      logoImageUrl: tmdbAssets?.logoImageUrl ?? null,
      trailerEmbedUrl: a.trailer?.embed_url ?? null,
    };
  } catch {
    return null;
  }
}

// MAL often has no per-episode metadata; the caller falls back to a generated
// list when this returns an empty array. Per-episode thumbnails come from
// AniList's streamingEpisodes (Jikan has none), matched by position. Result is
// cached so we don't re-hit Jikan + AniList on every visit.
export async function fetchEpisodes(malId: number): Promise<Episode[]> {
  // `null` (transient failure) is not cached, so we can retry next visit.
  return (await cached(`episodes:${malId}`, TTL.long, () => loadEpisodes(malId))) ?? [];
}

async function loadEpisodes(malId: number): Promise<Episode[] | null> {
  try {
    const [res, media] = await Promise.all([
      fetch(`${JIKAN_URL}/anime/${malId}/episodes`, { cache: "no-store" }),
      fetchAniListMedia(malId),
    ]);
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    const { data }: { data: { title: string }[] } = await res.json();
    const thumbs = media?.streamingEpisodes ?? [];
    return (data ?? []).map((e, i) => ({
      number: i + 1,
      title: e.title || thumbs[i]?.title || `Episode ${i + 1}`,
      duration: "24:00",
      thumbnail: thumbs[i]?.thumbnail ?? null,
    }));
  } catch {
    return null;
  }
}

/* ─────────────── Subtitles (jimaku via our /api proxy) ─────────────── */

/** AniList id for a MAL id — needed to look up jimaku subtitle entries. */
export async function fetchAniListId(malId: number): Promise<number | null> {
  if (!malId) return null;
  const media = await fetchAniListMedia(malId);
  return media?.id ?? null;
}

/**
 * Real subtitle tracks (up to two languages) for an episode, fetched from
 * jimaku through our server route and cached so we download each .srt only
 * once. Returns [] when nothing is available (caller keeps demo tracks).
 */
/**
 * Fetch a locally LLM-translated subtitle track (e.g. Polish) for an episode.
 * Backed by `/api/translate-subs` (Ollama). Slow on first request per episode,
 * then served from the on-disk cache. Returns null when unavailable.
 */
/** Identify an episode by anilistId and/or malId (server resolves malId). */
export interface SubtitleRef {
  anilistId?: number | null;
  malId?: number | null;
  episode: number;
}

function subtitleQuery(ref: SubtitleRef): string | null {
  const p = new URLSearchParams({ episode: String(ref.episode) });
  if (ref.anilistId) p.set("anilistId", String(ref.anilistId));
  if (ref.malId) p.set("malId", String(ref.malId));
  return ref.anilistId || ref.malId ? p.toString() : null;
}

export async function fetchTranslatedTrack(
  ref: SubtitleRef,
  to: string
): Promise<SubtitleTrack | null> {
  const query = subtitleQuery(ref);
  if (!query) return null;
  const key = `tsub:${ref.anilistId ?? `m${ref.malId}`}:${ref.episode}:${to}`;
  return (
    (await cached(key, TTL.long, async () => {
      try {
        const res = await fetch(`/api/translate-subs?${query}&to=${to}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { track: SubtitleTrack | null };
        return data.track ?? null;
      } catch {
        return null;
      }
    })) ?? null
  );
}

export async function fetchSubtitleTracks(ref: SubtitleRef): Promise<SubtitleTrack[]> {
  const query = subtitleQuery(ref);
  if (!query) return [];
  const key = `subs:${ref.anilistId ?? `m${ref.malId}`}:${ref.episode}`;
  return (
    (await cached(key, TTL.long, async () => {
      try {
        const res = await fetch(`/api/subtitles?${query}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { tracks: SubtitleTrack[] };
        return data.tracks?.length ? data.tracks : null;
      } catch {
        return null;
      }
    })) ?? []
  );
}

/* ─────────────── New episodes (live AniLiberty data) ─────────────── */

const ANILIBERTY_BASE = "https://aniliberty.top";

export interface LatestRelease {
  id: number;
  title: string;
  year: number | null;
  ageLabel: string | null;
  poster: string;
  episodeNumber: number | null;
  /** Internal watch route that plays this release in our own player. */
  href: string;
}

interface AniLatestRelease {
  id: number;
  alias: string | null;
  year: number | null;
  name: { main: string | null; english: string | null } | null;
  age_rating: { label: string | null } | null;
  poster: {
    src: string | null;
    thumbnail: string | null;
    optimized: { src: string | null; thumbnail: string | null } | null;
  } | null;
  latest_episode: { ordinal: number | null } | null;
}

function aniUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${ANILIBERTY_BASE}${path}`;
}

// AniLiberty allows CORS for the dev origin, so we read its "latest" feed
// directly from the browser. Cached (short TTL) so the sidebar doesn't refetch
// on every navigation; falls back to an empty list the caller can replace.
export async function fetchLatestReleases(limit = 6): Promise<LatestRelease[]> {
  return (
    (await cached(`aniliberty:latest:${limit}`, TTL.short, () =>
      loadLatestReleases(limit)
    )) ?? []
  );
}

async function loadLatestReleases(limit: number): Promise<LatestRelease[] | null> {
  try {
    const res = await fetch(
      `${ANILIBERTY_BASE}/api/v1/anime/releases/latest?limit=${limit}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`AniLiberty ${res.status}`);
    const data = (await res.json()) as AniLatestRelease[];
    return (data ?? [])
      .map((r) => {
        const poster = aniUrl(
          r.poster?.optimized?.src ?? r.poster?.src ?? r.poster?.thumbnail
        );
        const title = r.name?.english || r.name?.main;
        const slug = r.alias ?? String(r.id);
        if (!poster || !title) return null;
        const ep = r.latest_episode?.ordinal ?? null;
        return {
          id: r.id,
          title,
          year: r.year ?? null,
          ageLabel: r.age_rating?.label ?? null,
          poster,
          episodeNumber: ep,
          // Opens the anime's detail page on our site (alias-aware /anime/[id]),
          // not the external aniliberty.top and not straight into playback.
          href: `/anime/${slug}`,
        } satisfies LatestRelease;
      })
      .filter((r): r is LatestRelease => r !== null);
  } catch {
    return null;
  }
}

/* ───────────────── AniLiberty direct playback ───────────────── */

/** One playable AniLiberty episode (HLS qualities + intro/outro timecodes). */
export interface AniEpisode {
  ordinal: number;
  name: string | null;
  duration: number | null;
  poster: string | null;
  opening: { start: number | null; stop: number | null } | null;
  ending: { start: number | null; stop: number | null } | null;
  hls: { label: string; height: number; src: string }[];
}

/** A full AniLiberty release resolved for in-app playback + detail view. */
export interface AniReleaseFull {
  alias: string;
  title: string;
  subtitle: string | null;
  year: number | null;
  poster: string | null;
  description: string;
  genres: string[];
  typeLabel: string | null;
  ageLabel: string | null;
  seasonLabel: string | null;
  episodesTotal: number | null;
  avgDuration: number | null; // minutes
  isOngoing: boolean;
  episodes: AniEpisode[];
}

interface AniPoster {
  src?: string | null;
  thumbnail?: string | null;
  optimized?: { src?: string | null; thumbnail?: string | null } | null;
}

interface AniReleaseApi {
  id: number;
  alias: string | null;
  year: number | null;
  name: { main: string | null; english: string | null } | null;
  poster: AniPoster | null;
  description: string | null;
  is_ongoing: boolean | null;
  episodes_total: number | null;
  average_duration_of_episode: number | null;
  type: { description: string | null; value: string | null } | null;
  season: { description: string | null } | null;
  age_rating: { label: string | null } | null;
  genres: { name: string | null }[] | null;
  episodes:
    | {
        ordinal: number | null;
        name: string | null;
        name_english: string | null;
        duration: number | null;
        hls_480: string | null;
        hls_720: string | null;
        hls_1080: string | null;
        opening: { start: number | null; stop: number | null } | null;
        ending: { start: number | null; stop: number | null } | null;
        preview: AniPoster | null;
      }[]
    | null;
}

function aniPosterUrl(p: AniPoster | null | undefined): string | null {
  return aniUrl(
    p?.optimized?.src ?? p?.src ?? p?.optimized?.thumbnail ?? p?.thumbnail
  );
}

/** Resolve an AniLiberty release (by alias or numeric id) with playable episodes. */
export async function fetchAniLibertyRelease(
  idOrAlias: string
): Promise<AniReleaseFull | null> {
  return cached(`aniliberty:release:${idOrAlias}`, TTL.short, () =>
    loadAniLibertyRelease(idOrAlias)
  );
}

async function loadAniLibertyRelease(
  idOrAlias: string
): Promise<AniReleaseFull | null> {
  try {
    const res = await fetch(
      `${ANILIBERTY_BASE}/api/v1/anime/releases/${idOrAlias}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`AniLiberty ${res.status}`);
    const r = (await res.json()) as AniReleaseApi;
    const episodes: AniEpisode[] = (r.episodes ?? [])
      .map((e) => {
        const hls = [
          { label: "1080p", height: 1080, src: e.hls_1080 },
          { label: "720p", height: 720, src: e.hls_720 },
          { label: "480p", height: 480, src: e.hls_480 },
        ].filter(
          (q): q is { label: string; height: number; src: string } => !!q.src
        );
        return {
          ordinal: e.ordinal ?? 0,
          name: e.name_english || e.name,
          duration: e.duration ?? null,
          poster: aniPosterUrl(e.preview),
          opening: e.opening ?? null,
          ending: e.ending ?? null,
          hls,
        };
      })
      .filter((e) => e.hls.length > 0)
      .sort((a, b) => a.ordinal - b.ordinal);

    const title = r.name?.english || r.name?.main;
    if (!title || episodes.length === 0) return null;
    return {
      alias: r.alias ?? idOrAlias,
      title,
      subtitle:
        r.name?.main && r.name?.english && r.name.main !== r.name.english
          ? r.name.main
          : null,
      year: r.year ?? null,
      poster: aniPosterUrl(r.poster),
      description: r.description ?? "",
      genres: (r.genres ?? [])
        .map((g) => g.name)
        .filter((n): n is string => !!n),
      typeLabel: r.type?.description ?? r.type?.value ?? null,
      ageLabel: r.age_rating?.label ?? null,
      seasonLabel: r.season?.description ?? null,
      episodesTotal: r.episodes_total ?? null,
      avgDuration: r.average_duration_of_episode
        ? Math.round(r.average_duration_of_episode / 60)
        : null,
      isOngoing: r.is_ongoing ?? false,
      episodes,
    };
  } catch {
    return null;
  }
}

export { fetchMovies, fetchRows, API_URL };
