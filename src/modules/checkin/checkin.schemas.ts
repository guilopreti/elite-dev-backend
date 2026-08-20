import { z } from 'zod';

export const CheckinSchema = z.object({
  // Gate agents may type the code by hand instead of scanning it, so it is
  // normalized to the stored form before lookup.
  code: z
    .string()
    .min(1)
    .transform((value) => value.trim().toUpperCase()),
  eventId: z.uuid(),
});

export type CheckinInput = z.infer<typeof CheckinSchema>;
