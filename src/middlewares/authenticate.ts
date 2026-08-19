import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.ts';
import type { AuthUser } from '../types/auth.ts';
import { UnauthorizedError } from './errorHandler.ts';

const AuthPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().min(1),
  role: z.enum(['organizer', 'customer', 'gate']),
});

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(new UnauthorizedError('Unauthorized'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const payload = AuthPayloadSchema.safeParse(decoded);

    if (!payload.success) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }

    req.user = payload.data;
    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
      return;
    }

    next(new UnauthorizedError('Invalid token'));
  }
}

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  return req.user;
}
