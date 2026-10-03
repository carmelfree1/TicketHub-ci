import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../core/logger/logger.js';

export const requestId: RequestHandler = (request, response, next) => {
  const incoming = request.get('x-request-id');
  request.id = incoming && /^[A-Za-z0-9_-]{8,80}$/.test(incoming) ? incoming : randomUUID();
  response.setHeader('X-Request-Id', request.id);
  logger.info({ requestId: request.id, method: request.method, path: request.path }, 'Requête API');
  next();
};
