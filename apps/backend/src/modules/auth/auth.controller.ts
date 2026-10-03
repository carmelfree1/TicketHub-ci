import type { RequestHandler } from 'express';
import { appConfig } from '../../config/app.config.js';
import { sendNoContent } from '../../core/http/response.js';
import { authService } from './auth.service.js';

function attachSessionCookie(response: Parameters<RequestHandler>[1], token: string): void {
  response.cookie(appConfig.cookieName, token, {
    httpOnly: true,
    secure: appConfig.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: appConfig.sessionTtlSeconds * 1000,
  });
}

export const authController = {
  register: (async (request, response) => {
    const result = await authService.register(request.body);
    attachSessionCookie(response, result.token);
    response.status(201).json({ user: result.user });
  }) as RequestHandler,

  login: (async (request, response) => {
    const result = await authService.login(request.body);
    attachSessionCookie(response, result.token);
    response.json({ user: result.user });
  }) as RequestHandler,

  me: ((request, response) => {
    response.json({ user: request.authUser ?? null });
  }) as RequestHandler,

  logout: (async (request, response) => {
    await authService.logout(request.sessionTokenHash);
    response.clearCookie(appConfig.cookieName, {
      httpOnly: true,
      secure: appConfig.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    sendNoContent(response);
  }) as RequestHandler,
};
