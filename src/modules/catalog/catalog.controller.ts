import type { Request, Response } from 'express';
import type { CatalogSearchInput } from './catalog.schemas.ts';
import * as catalogService from './catalog.service.ts';

export async function search(req: Request, res: Response): Promise<void> {
  const { query } = req.query as unknown as CatalogSearchInput;
  const results = await catalogService.searchMovies(query);

  res.status(200).json({ results });
}
