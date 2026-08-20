import type { PaymentStatus } from '@prisma/client';

/**
 * Simulated payment rule (ADR-0001): a card number ending in `0` is declined,
 * any other digit is approved. Pure and deterministic — no gateway is involved.
 */
export function determinePaymentOutcome(cardNumber: string): PaymentStatus {
  const lastDigit = cardNumber.trim().at(-1);

  return lastDigit === '0' ? 'declined' : 'approved';
}

export function extractLastDigit(cardNumber: string): string {
  return cardNumber.trim().slice(-1);
}
