import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, OversellError } from '../../middlewares/errorHandler.ts';
import * as eventsRepository from '../events/events.repository.ts';
import type { CreateReservationInput } from './reservations.schemas.ts';
import * as reservationsRepository from './reservations.repository.ts';

export async function createReservation(input: CreateReservationInput, customerId: string) {
  const event = await eventsRepository.findById(input.eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.status !== 'published') {
    throw new ConflictError('Event is not available');
  }

  // A reservation only reserves intent: `available_seats` is decremented when
  // the payment is approved, so this check is an early rejection, not a lock.
  if (input.quantity > event.available_seats) {
    throw new OversellError();
  }

  // Decimal arithmetic keeps the total exact — 50.10 * 3 in floating point
  // would yield 150.29999999999998.
  const totalPrice = new Prisma.Decimal(event.price).mul(input.quantity);

  const reservation = await reservationsRepository.create({
    event_id: event.id,
    customer_id: customerId,
    quantity: input.quantity,
    total_price: totalPrice,
    status: 'pending',
  });

  return {
    reservationId: reservation.id,
    totalPrice: Number(reservation.total_price),
    status: reservation.status,
  };
}
