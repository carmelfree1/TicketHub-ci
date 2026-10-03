import type { Response } from 'express';

export function sendSuccess<T>(response: Response, data: T, status = 200): Response {
  return response.status(status).json({ data });
}

export function sendCreated<T>(response: Response, data: T): Response {
  return sendSuccess(response, data, 201);
}

export function sendNoContent(response: Response): Response {
  return response.status(204).end();
}
