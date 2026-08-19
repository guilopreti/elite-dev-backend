import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateBody } from '../../middlewares/validate.ts';
import * as reservationsController from './reservations.controller.ts';
import { CreateReservationSchema } from './reservations.schemas.ts';

export const reservationsRouter = Router();

reservationsRouter.post(
  '/',
  authenticate,
  authorize('customer'),
  validateBody(CreateReservationSchema),
  reservationsController.create,
);
