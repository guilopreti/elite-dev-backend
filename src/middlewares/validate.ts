import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

function formatZodError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return {
    status: 422,
    message: 'Validation error',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(formatZodError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(422).json(formatZodError(result.error));
      return;
    }
    req.query = result.data as Request['query'];
    next();
  };
}
