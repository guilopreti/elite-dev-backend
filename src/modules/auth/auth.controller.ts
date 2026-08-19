import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput } from './auth.schemas.ts';
import * as authService from './auth.service.ts';

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.register(req.body as RegisterInput);
  res.status(201).json(user);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  res.status(200).json(result);
}
