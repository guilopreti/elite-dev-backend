import { z } from 'zod';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/** ISO 8601 date-time, with or without offset. Converted to a Date for Prisma. */
const eventDate = z.iso.datetime({ offset: true, local: true }).transform((v) => new Date(v));

export const CreateEventSchema = z.object({
  tmdb_id: z.int().positive(),
  venue: z.string().min(1),
  date: eventDate,
  price: z.number().nonnegative(),
  capacity: z.int().positive(),
});

export const UpdateEventSchema = z
  .object({
    venue: z.string().min(1),
    date: eventDate,
    price: z.number().nonnegative(),
    capacity: z.int().positive(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const EventQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  date: z.iso.date().optional(),
  venue: z.string().min(1).optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

export const EventIdParamSchema = z.object({
  id: z.uuid(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type EventQueryInput = z.infer<typeof EventQuerySchema>;
