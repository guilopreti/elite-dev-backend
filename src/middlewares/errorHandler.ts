import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';

export class AppError extends Error {
  statusCode: number;
  errors: unknown[] | undefined;

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super(502, message);
    this.name = 'UpstreamError';
  }
}

export class OversellError extends ConflictError {
  constructor() {
    super('Insufficient seats available');
    this.name = 'OversellError';
  }
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (isPrismaUniqueConstraintError(err)) {
    res.status(409).json({ status: 409, message: 'Resource already exists' });
    return;
  }

  const isDev = env.NODE_ENV === 'development';
  res.status(500).json({
    status: 500,
    message: 'Internal server error',
    ...(isDev && err instanceof Error ? { detail: err.message } : {}),
  });
}
