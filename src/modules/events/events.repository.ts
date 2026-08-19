import type { Event, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';

export function create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
  return prisma.event.create({ data });
}

export function findById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } });
}

export function update(id: string, data: Prisma.EventUncheckedUpdateInput): Promise<Event> {
  return prisma.event.update({ where: { id }, data });
}

export function remove(id: string): Promise<Event> {
  return prisma.event.delete({ where: { id } });
}

export function countReservations(eventId: string): Promise<number> {
  return prisma.reservation.count({ where: { event_id: eventId } });
}

export interface FindAllParams {
  where: Prisma.EventWhereInput;
  skip: number;
  take: number;
}

export async function findAll({
  where,
  skip,
  take,
}: FindAllParams): Promise<{ events: Event[]; total: number }> {
  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({ where, skip, take, orderBy: { date: 'asc' } }),
    prisma.event.count({ where }),
  ]);

  return { events, total };
}
