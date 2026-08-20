import { prisma } from '../../config/prisma.ts';
import type { CheckinInput } from './checkin.schemas.ts';

export type CheckinOutcome = 'valid' | 'already_used' | 'event_mismatch' | 'not_found';

export async function checkIn(input: CheckinInput): Promise<{ outcome: CheckinOutcome }> {
  return prisma.$transaction(async (tx): Promise<{ outcome: CheckinOutcome }> => {
    const ticket = await tx.ticket.findUnique({
      where: { code: input.code },
      select: { id: true, event_id: true },
    });

    if (!ticket) {
      return { outcome: 'not_found' };
    }

    if (ticket.event_id !== input.eventId) {
      return { outcome: 'event_mismatch' };
    }

    // The `status: 'valid'` predicate lives in the UPDATE itself: PostgreSQL
    // re-evaluates it after taking the row lock, so exactly one of two
    // concurrent check-ins can flip the ticket. A prior SELECT would not lock
    // the row and would let both requests succeed.
    const consumed = await tx.ticket.updateMany({
      where: { id: ticket.id, status: 'valid' },
      data: { status: 'used' },
    });

    return { outcome: consumed.count === 0 ? 'already_used' : 'valid' };
  });
}
