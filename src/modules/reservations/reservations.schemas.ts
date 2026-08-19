import { z } from 'zod';

export const CreateReservationSchema = z.object({
  eventId: z.uuid(),
  quantity: z.int().positive(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
