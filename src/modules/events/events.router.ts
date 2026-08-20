import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.ts';
import * as eventsController from './events.controller.ts';
import {
  CreateEventSchema,
  EventIdParamSchema,
  EventQuerySchema,
  UpdateEventSchema,
} from './events.schemas.ts';

export const eventsRouter = Router();

eventsRouter.post(
  '/',
  authenticate,
  authorize('organizer'),
  validateBody(CreateEventSchema),
  eventsController.create,
);

eventsRouter.patch(
  '/:id',
  authenticate,
  authorize('organizer'),
  validateParams(EventIdParamSchema),
  validateBody(UpdateEventSchema),
  eventsController.update,
);

eventsRouter.patch(
  '/:id/publish',
  authenticate,
  authorize('organizer'),
  validateParams(EventIdParamSchema),
  eventsController.publish,
);

eventsRouter.delete(
  '/:id',
  authenticate,
  authorize('organizer'),
  validateParams(EventIdParamSchema),
  eventsController.remove,
);

eventsRouter.get(
  '/me',
  authenticate,
  authorize('organizer'),
  validateQuery(EventQuerySchema),
  eventsController.listMyEvents,
);

eventsRouter.get('/', validateQuery(EventQuerySchema), eventsController.list);

eventsRouter.get(
  '/:id',
  optionalAuthenticate,
  validateParams(EventIdParamSchema),
  eventsController.getById,
);
