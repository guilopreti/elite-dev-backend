import type { Event, Prisma, Reservation } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';

export type ReservationWithEvent = Reservation & { event: Event };

export function create(data: Prisma.ReservationUncheckedCreateInput): Promise<Reservation> {
  return prisma.reservation.create({ data });
}

export function findById(id: string): Promise<Reservation | null> {
  return prisma.reservation.findUnique({ where: { id } });
}

/** The payment flow needs the event alongside the reservation to decrement seats. */
export function findByIdWithEvent(id: string): Promise<ReservationWithEvent | null> {
  return prisma.reservation.findUnique({ where: { id }, include: { event: true } });
}
