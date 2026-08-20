import { NotFoundError, UnauthorizedError } from '../../middlewares/errorHandler.ts';
import { verifyTicketToken } from '../../utils/ticketSigner.ts';
import * as ticketsRepository from './tickets.repository.ts';
import type { TicketWithEvent } from './tickets.repository.ts';

function toTicketResponse(ticket: TicketWithEvent) {
  return {
    id: ticket.id,
    code: ticket.code,
    token: ticket.token,
    status: ticket.status,
    event: {
      id: ticket.event.id,
      title: ticket.event.title,
      date: ticket.event.date,
      venue: ticket.event.venue,
      poster_path: ticket.event.poster_path,
    },
  };
}

/**
 * The customer id comes from the auth token, never from the request, so a
 * customer cannot reach another customer's tickets by construction.
 */
export async function listTickets(customerId: string, eventId?: string) {
  const tickets = await ticketsRepository.findByCustomerId(customerId, eventId);

  return tickets.map(toTicketResponse);
}

export async function getSharedTicket(token: string) {
  let payload;

  try {
    payload = verifyTicketToken(token);
  } catch {
    throw new UnauthorizedError('Invalid ticket token');
  }

  const ticket = await ticketsRepository.findByIdWithEvent(payload.ticketId);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Display-safe fields only: this endpoint is public, so nothing that
  // identifies the customer may appear here.
  return {
    eventTitle: ticket.event.title,
    eventDate: ticket.event.date,
    venue: ticket.event.venue,
    ticketStatus: ticket.status,
    posterPath: ticket.event.poster_path,
  };
}
