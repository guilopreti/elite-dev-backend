import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateParams, validateQuery } from '../../middlewares/validate.ts';
import * as ticketsController from './tickets.controller.ts';
import { ShareTokenParamSchema, TicketQuerySchema } from './tickets.schemas.ts';

export const ticketsRouter = Router();

ticketsRouter.get(
  '/',
  authenticate,
  authorize('customer'),
  validateQuery(TicketQuerySchema),
  ticketsController.list,
);

// Public on purpose: the signed token is the only credential a shared link has.
ticketsRouter.get(
  '/share/:token',
  validateParams(ShareTokenParamSchema),
  ticketsController.share,
);
