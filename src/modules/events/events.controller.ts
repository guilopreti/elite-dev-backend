import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares/authenticate.ts';
import type { CreateEventInput, EventQueryInput, UpdateEventInput } from './events.schemas.ts';
import * as eventsService from './events.service.ts';

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const event = await eventsService.createEvent(req.body as CreateEventInput, userId);

  res.status(201).json(event);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const event = await eventsService.updateEvent(
    req.params.id as string,
    req.body as UpdateEventInput,
    userId,
  );

  res.status(200).json(event);
}

export async function publish(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const event = await eventsService.publishEvent(req.params.id as string, userId);

  res.status(200).json(event);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  await eventsService.deleteEvent(req.params.id as string, userId);

  res.status(204).send();
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await eventsService.listEvents(req.query as unknown as EventQueryInput);

  res.status(200).json(result);
}

export async function listMyEvents(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const result = await eventsService.listOrganizerEvents(userId, req.query as unknown as EventQueryInput);

  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const event = await eventsService.getEventById(req.params.id as string, req.user?.userId);

  res.status(200).json(event);
}
