import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateBody } from '../../middlewares/validate.ts';
import * as checkinController from './checkin.controller.ts';
import { CheckinSchema } from './checkin.schemas.ts';

export const checkinRouter = Router();

checkinRouter.post(
  '/',
  authenticate,
  authorize('gate'),
  validateBody(CheckinSchema),
  checkinController.checkIn,
);
