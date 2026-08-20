import type { Event, Prisma } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler.ts';
import * as catalogService from '../catalog/catalog.service.ts';
import type { CreateEventInput, EventQueryInput, UpdateEventInput } from './events.schemas.ts';
import * as eventsRepository from './events.repository.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `price` is a Prisma Decimal, which would serialize as a string. Responses
 * expose it as a number so clients can compare and format it directly, while
 * the database keeps Decimal(10,2) precision.
 */
function toEventResponse(event: Event) {
  return {
    id: event.id,
    tmdb_id: event.tmdb_id,
    title: event.title,
    overview: event.overview,
    poster_path: event.poster_path,
    venue: event.venue,
    date: event.date,
    price: Number(event.price),
    capacity: event.capacity,
    available_seats: event.available_seats,
    status: event.status,
    organizer_id: event.organizer_id,
    created_at: event.created_at,
  };
}

function toEventSummary(event: Event) {
  return {
    id: event.id,
    title: event.title,
    poster_path: event.poster_path,
    venue: event.venue,
    date: event.date,
    price: Number(event.price),
    available_seats: event.available_seats,
    status: event.status,
  };
}

async function findOwnedEvent(eventId: string, organizerId: string): Promise<Event> {
  const event = await eventsRepository.findById(eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.organizer_id !== organizerId) {
    throw new ForbiddenError('Forbidden');
  }

  return event;
}

export async function createEvent(input: CreateEventInput, organizerId: string) {
  const movie = await catalogService.getMovieById(input.tmdb_id);

  const event = await eventsRepository.create({
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    overview: movie.overview,
    // The column is non-nullable while TMDb may omit a poster, so an absent
    // poster is stored as an empty string.
    poster_path: movie.poster_path ?? '',
    venue: input.venue,
    date: input.date,
    price: input.price,
    capacity: input.capacity,
    available_seats: input.capacity,
    status: 'draft',
    organizer_id: organizerId,
  });

  return toEventResponse(event);
}

export async function updateEvent(
  eventId: string,
  input: UpdateEventInput,
  organizerId: string,
) {
  const event = await findOwnedEvent(eventId, organizerId);

  if (event.status === 'published') {
    throw new ConflictError('Cannot update a published event');
  }

  const data: Prisma.EventUncheckedUpdateInput = { ...input };

  // A draft has no reservations yet, so its seat count always mirrors capacity.
  if (input.capacity !== undefined) {
    data.available_seats = input.capacity;
  }

  const updated = await eventsRepository.update(eventId, data);

  return toEventResponse(updated);
}

export async function publishEvent(eventId: string, organizerId: string) {
  const event = await findOwnedEvent(eventId, organizerId);

  if (event.status === 'published') {
    throw new ConflictError('Event is already published');
  }

  const published = await eventsRepository.update(eventId, { status: 'published' });

  return toEventResponse(published);
}

export async function deleteEvent(eventId: string, organizerId: string): Promise<void> {
  const event = await findOwnedEvent(eventId, organizerId);

  if (event.status === 'published') {
    throw new ConflictError('Cannot delete a published event');
  }

  const reservations = await eventsRepository.countReservations(eventId);

  if (reservations > 0) {
    throw new ConflictError('Cannot delete an event with reservations');
  }

  await eventsRepository.remove(eventId);
}

function buildListFilters(
  query: EventQueryInput,
  organizerId?: string,
): Prisma.EventWhereInput {
  // When an organizer is requesting, include their own drafts alongside published events.
  // Otherwise only published events are visible.
  const statusFilter: Prisma.EventWhereInput = organizerId
    ? { OR: [{ status: 'published' }, { status: 'draft', organizer_id: organizerId }] }
    : { status: 'published' };

  const where: Prisma.EventWhereInput = { ...statusFilter };

  if (query.date) {
    const dayStart = new Date(`${query.date}T00:00:00.000Z`);
    where.date = { gte: dayStart, lt: new Date(dayStart.getTime() + MS_PER_DAY) };
  }

  if (query.venue) {
    where.venue = { contains: query.venue, mode: 'insensitive' };
  }

  if (query.maxPrice !== undefined) {
    where.price = { lte: query.maxPrice };
  }

  return where;
}

export async function listEvents(query: EventQueryInput) {
  const { events, total } = await eventsRepository.findAll({
    where: buildListFilters(query),
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  return {
    data: events.map(toEventSummary),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function listOrganizerEvents(organizerId: string, query: EventQueryInput) {
  const { events, total } = await eventsRepository.findAll({
    where: buildListFilters(query, organizerId),
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  return {
    data: events.map(toEventSummary),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getEventById(eventId: string, requesterId?: string) {
  const event = await eventsRepository.findById(eventId);

  // A draft is invisible to everyone but its owner, and indistinguishable from
  // a non-existent event so its existence is not leaked.
  if (!event || (event.status === 'draft' && event.organizer_id !== requesterId)) {
    throw new NotFoundError('Event not found');
  }

  return toEventResponse(event);
}
