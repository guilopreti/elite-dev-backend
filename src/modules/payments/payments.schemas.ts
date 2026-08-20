import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  reservationId: z.uuid(),
  // Digits only: the outcome is decided by the last digit and `card_last_digit`
  // is a CHAR(1) column, so a non-numeric card would corrupt both.
  cardNumber: z.string().regex(/^\d+$/, 'Card number must contain digits only'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
