import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router.ts';
import { catalogRouter } from '../modules/catalog/catalog.router.ts';

export const router = Router();

router.use('/auth', authRouter);
router.use('/catalog', catalogRouter);
