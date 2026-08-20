import type { Event, Ticket } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';

export type TicketWithEvent = Ticket & { event: Event };

/** Always scoped to a single customer — tickets are never listed across owners. */
export function findByCustomerId(customerId: string, eventId?: string): Promise<TicketWithEvent[]> {
  return prisma.ticket.findMany({
    where: { customer_id: customerId, ...(eventId ? { event_id: eventId } : {}) },
    include: { event: true },
    orderBy: { created_at: 'asc' },
  });
}

export function findByIdWithEvent(ticketId: string): Promise<TicketWithEvent | null> {
  return prisma.ticket.findUnique({ where: { id: ticketId }, include: { event: true } });
}
