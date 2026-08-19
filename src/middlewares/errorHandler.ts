import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = env.NODE_ENV === 'development';

  res.status(500).json({
    status: 500,
    message: 'Internal server error',
    ...(isDev && err instanceof Error ? { detail: err.message } : {}),
  });
}
