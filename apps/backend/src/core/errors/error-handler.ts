import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';
import { AppError } from './AppError.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let normalized = error instanceof AppError ? error : null;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') normalized = new AppError('Cette valeur existe déjà.', 409, 'UNIQUE_CONSTRAINT');
    else if (error.code === 'P2025') normalized = new AppError('Ressource introuvable.', 404, 'NOT_FOUND');
  }
  if (!normalized && error instanceof SyntaxError && 'body' in error) normalized = new AppError('Corps JSON invalide.', 400, 'INVALID_JSON');
  if (!normalized && typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    normalized = new AppError('Le corps de la requête dépasse la taille autorisée.', 413, 'PAYLOAD_TOO_LARGE');
  }
  const status = normalized?.statusCode ?? 500;
  const code = normalized?.code ?? 'INTERNAL_ERROR';
  const message = normalized?.isOperational ? normalized.message : 'Une erreur interne est survenue.';
  logger[status >= 500 ? 'error' : 'warn']({ err: error, requestId: request.id, method: request.method, path: request.path, status }, 'Requête API en erreur');
  response.status(status).json({
    error: {
      code,
      message,
      ...(normalized?.details && env.NODE_ENV !== 'production' ? { details: normalized.details } : {}),
      requestId: request.id,
    },
  });
};
