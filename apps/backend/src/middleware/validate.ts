import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../core/errors/AppError.js';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      next(new AppError('Les données envoyées sont invalides.', 400, 'VALIDATION_ERROR', parsed.error.flatten()));
      return;
    }
    request.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) {
      next(new AppError('Les paramètres de recherche sont invalides.', 400, 'VALIDATION_ERROR', parsed.error.flatten()));
      return;
    }
    request.validatedQuery = parsed.data;
    next();
  };
}
