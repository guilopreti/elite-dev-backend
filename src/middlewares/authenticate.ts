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

function verifyAuthToken(token: string): AuthUser | null {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  const payload = AuthPayloadSchema.safeParse(decoded);

  return payload.success ? payload.data : null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(new UnauthorizedError('Unauthorized'));
    return;
  }

  try {
    const user = verifyAuthToken(token);

    if (!user) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
      return;
    }

    next(new UnauthorizedError('Invalid token'));
  }
}

/**
 * For public routes whose response varies for the resource owner, such as an
 * Organizer reading back their own draft event. A missing or unusable token is
 * not an error here — the request simply proceeds as anonymous.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const user = verifyAuthToken(token);

    if (user) {
      req.user = user;
    }
  } catch {
    // Anonymous access is valid on these routes, so an invalid or expired
    // token is ignored rather than rejected.
  }

  next();
}

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  return req.user;
}
