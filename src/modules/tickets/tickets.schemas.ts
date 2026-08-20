import { z } from 'zod';

export const TicketQuerySchema = z.object({
  eventId: z.uuid().optional(),
});

export const ShareTokenParamSchema = z.object({
  token: z.string().min(1),
});

export type TicketQueryInput = z.infer<typeof TicketQuerySchema>;
export type ShareTokenParamInput = z.infer<typeof ShareTokenParamSchema>;
