import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router.ts';

export const router = Router();

router.use('/auth', authRouter);
