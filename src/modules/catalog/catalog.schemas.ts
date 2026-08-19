import { z } from 'zod';

export const CatalogSearchSchema = z.object({
  query: z.string().min(1),
});

export type CatalogSearchInput = z.infer<typeof CatalogSearchSchema>;
