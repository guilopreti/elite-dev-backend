import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';

export interface TicketTokenPayload {
  ticketId: string;
  eventId: string;
  customerId: string;
}

export function signTicketToken(payload: TicketTokenPayload): string {
  return jwt.sign(payload, env.TICKET_JWT_SECRET);
}

export function verifyTicketToken(token: string): TicketTokenPayload {
  const decoded = jwt.verify(token, env.TICKET_JWT_SECRET);

  if (typeof decoded === 'string' || decoded === null) {
    throw new Error('Invalid ticket token');
  }

  const { ticketId, eventId, customerId } = decoded;

  if (
    typeof ticketId !== 'string' ||
    typeof eventId !== 'string' ||
    typeof customerId !== 'string'
  ) {
    throw new Error('Invalid ticket token payload');
  }

  return { ticketId, eventId, customerId };
}
