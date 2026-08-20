import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares/authenticate.ts';
import type { TicketQueryInput } from './tickets.schemas.ts';
import * as ticketsService from './tickets.service.ts';

export async function list(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const { eventId } = req.query as unknown as TicketQueryInput;
  const tickets = await ticketsService.listTickets(userId, eventId);

  res.status(200).json(tickets);
}

export async function share(req: Request, res: Response): Promise<void> {
  const ticket = await ticketsService.getSharedTicket(req.params.token as string);

  res.status(200).json(ticket);
}
