import { z } from 'zod';
import { env } from '../../config/env.ts';
import { UpstreamError } from '../../middlewares/errorHandler.ts';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 8000;

const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullable().default(null),
  overview: z.string().default(''),
});

const TmdbSearchResponseSchema = z.object({
  results: z.array(TmdbMovieSchema),
});

export interface CatalogMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  overview: string;
}

/**
 * Single point of contact with TMDb. Every outward call goes through here so a
 * provider change stays contained in this module.
 */
async function tmdbRequest(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', env.TMDB_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;

  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) });
  } catch {
    throw new UpstreamError('Upstream TMDb error');
  }

  if (!response.ok) {
    throw new UpstreamError('Upstream TMDb error');
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamError('Upstream TMDb error');
  }
}

function toCatalogMovie(movie: z.infer<typeof TmdbMovieSchema>): CatalogMovie {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    overview: movie.overview,
  };
}

export async function searchMovies(query: string): Promise<CatalogMovie[]> {
  const payload = await tmdbRequest('/search/movie', { query });
  const parsed = TmdbSearchResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new UpstreamError('Upstream TMDb error');
  }

  return parsed.data.results.map(toCatalogMovie);
}
