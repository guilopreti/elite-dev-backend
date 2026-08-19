import { Router } from 'express';
import { validateBody } from '../../middlewares/validate.ts';
import * as authController from './auth.controller.ts';
import { LoginSchema, RegisterSchema } from './auth.schemas.ts';

export const authRouter = Router();

authRouter.post('/register', validateBody(RegisterSchema), authController.register);
authRouter.post('/login', validateBody(LoginSchema), authController.login);
