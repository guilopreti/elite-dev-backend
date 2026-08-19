import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '../types/auth.ts';
import { ForbiddenError, UnauthorizedError } from './errorHandler.ts';

export function authorize(required: Role): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError('Unauthorized'));
      return;
    }

    if (req.user.role !== required) {
      next(new ForbiddenError('Forbidden'));
      return;
    }

    next();
  };
}
