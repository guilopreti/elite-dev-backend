import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router.ts';
import { catalogRouter } from '../modules/catalog/catalog.router.ts';
import { eventsRouter } from '../modules/events/events.router.ts';
import { paymentsRouter } from '../modules/payments/payments.router.ts';
import { reservationsRouter } from '../modules/reservations/reservations.router.ts';

export const router = Router();

router.use('/auth', authRouter);
router.use('/catalog', catalogRouter);
router.use('/events', eventsRouter);
router.use('/reservations', reservationsRouter);
router.use('/payments', paymentsRouter);
