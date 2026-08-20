import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateBody } from '../../middlewares/validate.ts';
import * as paymentsController from './payments.controller.ts';
import { CreatePaymentSchema } from './payments.schemas.ts';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/',
  authenticate,
  authorize('customer'),
  validateBody(CreatePaymentSchema),
  paymentsController.create,
);
