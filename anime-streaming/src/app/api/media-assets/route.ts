import { NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

type TmdbMediaType = "tv" | "movie";

interface TmdbSearchResult {
  id: number;
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
  popularity?: number;
  vote_count?: number;
  mediaType: TmdbMediaType;
}

interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average?: number;
  vote_count?: number;
  width?: number;
  height?: number;
}

interface MediaAssets {
  tmdbId?: number;
  mediaType?: TmdbMediaType;
  logoImageUrl?: string;
  backdropImageUrl?: string;
}

const assetCache = new Map<string, Promise<MediaAssets>>();

function normalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getYear(date?: string): string | null {
  return date?.match(/^\d{4}/)?.[0] ?? null;
}

function imageUrl(path?: string): string | undefined {
  return path ? `${TMDB_IMAGE_BASE}${path}` : undefined;
}

function languageRank(image: TmdbImage): number {
  if (image.iso_639_1 === "en") return 0;
  if (image.iso_639_1 === null) return 1;
  if (image.iso_639_1 === "ja") return 2;
  return 3;
}

function scoreSearchResult(result: TmdbSearchResult, query: string, year?: string): number {
  const queryTitle = normalizeTitle(query);
  const resultTitle = normalizeTitle(result.name ?? result.title ?? "");
  const resultYear = getYear(result.first_air_date ?? result.release_date);
  const exact = resultTitle === queryTitle ? 80 : 0;
  const partial =
    resultTitle.includes(queryTitle) || queryTitle.includes(resultTitle) ? 24 : 0;
  const yearMatch = year && resultYear === year ? 18 : 0;
  const tvBias = result.mediaType === "tv" ? 8 : 0;
  const votes = Math.min(result.vote_count ?? 0, 1200) / 80;
  const popularity = Math.min(result.popularity ?? 0, 1000) / 25;

  return exact + partial + yearMatch + tvBias + votes + popularity;
}

function pickLogo(images: TmdbImage[] = []): TmdbImage | undefined {
  return [...images]
    .filter((image) => image.file_path)
    .sort((a, b) => {
      const language = languageRank(a) - languageRank(b);
      if (language !== 0) return language;
      return (
        (b.vote_count ?? 0) - (a.vote_count ?? 0) ||
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.width ?? 0) - (a.width ?? 0)
      );
    })[0];
}

function pickBackdrop(images: TmdbImage[] = []): TmdbImage | undefined {
  return [...images]
    .filter((image) => image.file_path && (image.width ?? 0) >= (image.height ?? 0))
    .sort((a, b) => {
      const score = (image: TmdbImage) =>
        (image.vote_average ?? 0) * 2 +
        Math.log10((image.vote_count ?? 0) + 1) * 6 +
        (image.width ?? 0) / 1000;
      return score(b) - score(a);
    })[0];
}

async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Missing TMDB_API_KEY");

  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const res = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

async function searchMedia(
  mediaType: TmdbMediaType,
  title: string,
  year?: string
): Promise<TmdbSearchResult[]> {
  const params: Record<string, string> = {
    query: title,
    include_adult: "false",
    language: "en-US",
  };
  if (year) {
    params[mediaType === "tv" ? "first_air_date_year" : "year"] = year;
  }

  const data = await tmdbFetch<{ results?: Omit<TmdbSearchResult, "mediaType">[] }>(
    `/search/${mediaType}`,
    params
  );

  return (data.results ?? []).map((result) => ({
    ...result,
    mediaType,
  }));
}

async function loadAssets(title: string, year?: string): Promise<MediaAssets> {
  const [tvResults, movieResults] = await Promise.all([
    searchMedia("tv", title, year),
    searchMedia("movie", title, year),
  ]);

  const best = [...tvResults, ...movieResults].sort(
    (a, b) => scoreSearchResult(b, title, year) - scoreSearchResult(a, title, year)
  )[0];

  if (!best) return {};

  const images = await tmdbFetch<{ logos?: TmdbImage[]; backdrops?: TmdbImage[] }>(
    `/${best.mediaType}/${best.id}/images`,
    { include_image_language: "en,null,ja" }
  );

  return {
    tmdbId: best.id,
    mediaType: best.mediaType,
    logoImageUrl: imageUrl(pickLogo(images.logos)?.file_path),
    backdropImageUrl: imageUrl(pickBackdrop(images.backdrops)?.file_path),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const year = searchParams.get("year")?.match(/^\d{4}$/)?.[0];

  if (!title || !process.env.TMDB_API_KEY) {
    return NextResponse.json({});
  }

  const cacheKey = `${normalizeTitle(title)}:${year ?? ""}`;
  let cached = assetCache.get(cacheKey);
  if (!cached) {
    cached = loadAssets(title, year).catch(() => ({}));
    assetCache.set(cacheKey, cached);
  }

  const assets = await cached;
  return NextResponse.json(assets, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
