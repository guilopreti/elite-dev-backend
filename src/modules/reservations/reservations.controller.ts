import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares/authenticate.ts';
import type { CreateReservationInput } from './reservations.schemas.ts';
import * as reservationsService from './reservations.service.ts';

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const reservation = await reservationsService.createReservation(
    req.body as CreateReservationInput,
    userId,
  );

  res.status(201).json(reservation);
}
