import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.ts';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  OversellError,
} from '../../middlewares/errorHandler.ts';
import { generateTicketCode } from '../../utils/codeGenerator.ts';
import { signTicketToken } from '../../utils/ticketSigner.ts';
import * as reservationsRepository from '../reservations/reservations.repository.ts';
import type { ReservationWithEvent } from '../reservations/reservations.repository.ts';
import { determinePaymentOutcome, extractLastDigit } from './payments.rules.ts';
import type { CreatePaymentInput } from './payments.schemas.ts';

interface TicketResponse {
  id: string;
  code: string;
  token: string;
}

const NO_LONGER_PAYABLE = 'Reservation is no longer payable';

function buildTickets(reservation: ReservationWithEvent) {
  return Array.from({ length: reservation.quantity }, () => {
    const id = randomUUID();

    return {
      id,
      reservation_id: reservation.id,
      event_id: reservation.event_id,
      customer_id: reservation.customer_id,
      code: generateTicketCode(),
      // The token carries the ticket id, so the id must exist before the insert.
      token: signTicketToken({
        ticketId: id,
        eventId: reservation.event_id,
        customerId: reservation.customer_id,
      }),
      status: 'valid' as const,
    };
  });
}

async function declinePayment(reservation: ReservationWithEvent, cardLastDigit: string) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: { id: reservation.id, status: 'pending' },
      data: { status: 'declined' },
    });

    if (updated.count === 0) {
      throw new ConflictError(NO_LONGER_PAYABLE);
    }

    await tx.payment.create({
      data: {
        reservation_id: reservation.id,
        card_last_digit: cardLastDigit,
        status: 'declined',
      },
    });
  });

  return { status: 'declined' as const };
}

async function approvePayment(reservation: ReservationWithEvent, cardLastDigit: string) {
  const tickets = await prisma.$transaction(async (tx) => {
    // Guarded decrement: if a concurrent payment already took the last seats,
    // the predicate fails, zero rows change and the whole transaction aborts.
    const seatsTaken = await tx.event.updateMany({
      where: { id: reservation.event_id, available_seats: { gte: reservation.quantity } },
      data: { available_seats: { decrement: reservation.quantity } },
    });

    if (seatsTaken.count === 0) {
      throw new OversellError();
    }

    // Same guard on the reservation: only a still-pending row may be paid, so a
    // concurrent duplicate payment is rejected here instead of at the unique
    // constraint on payments.reservation_id.
    const paid = await tx.reservation.updateMany({
      where: { id: reservation.id, status: 'pending' },
      data: { status: 'paid' },
    });

    if (paid.count === 0) {
      throw new ConflictError(NO_LONGER_PAYABLE);
    }

    await tx.payment.create({
      data: {
        reservation_id: reservation.id,
        card_last_digit: cardLastDigit,
        status: 'approved',
      },
    });

    const generated = buildTickets(reservation);
    await tx.ticket.createMany({ data: generated });

    return generated;
  });

  const response: TicketResponse[] = tickets.map(({ id, code, token }) => ({ id, code, token }));

  return { status: 'approved' as const, tickets: response };
}

export async function processPayment(input: CreatePaymentInput, customerId: string) {
  const reservation = await reservationsRepository.findByIdWithEvent(input.reservationId);

  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }

  if (reservation.customer_id !== customerId) {
    throw new ForbiddenError('Forbidden');
  }

  if (reservation.status !== 'pending') {
    throw new ConflictError(NO_LONGER_PAYABLE);
  }

  const cardLastDigit = extractLastDigit(input.cardNumber);

  return determinePaymentOutcome(input.cardNumber) === 'declined'
    ? declinePayment(reservation, cardLastDigit)
    : approvePayment(reservation, cardLastDigit);
}
