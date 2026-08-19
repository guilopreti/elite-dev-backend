import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.ts';
import { authorize } from '../../middlewares/authorize.ts';
import { validateQuery } from '../../middlewares/validate.ts';
import * as catalogController from './catalog.controller.ts';
import { CatalogSearchSchema } from './catalog.schemas.ts';

export const catalogRouter = Router();

catalogRouter.get(
  '/search',
  authenticate,
  authorize('organizer'),
  validateQuery(CatalogSearchSchema),
  catalogController.search,
);
