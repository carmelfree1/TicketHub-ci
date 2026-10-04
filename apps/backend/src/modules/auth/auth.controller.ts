import type { RequestHandler, Response } from 'express';
import { appConfig } from '../../config/app.config.js';
import { sendNoContent } from '../../core/http/response.js';
import { requestContext } from '../audit/audit.service.js';
import { authService, isMfaRequiredFor } from './auth.service.js';
import { mfaService } from './mfa.service.js';

function attachSessionCookie(response: Response, token: string): void {
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
    const result = await authService.register(request.body, requestContext(request));
    attachSessionCookie(response, result.token);
    response.status(201).json({ user: result.user });
  }) as RequestHandler,

  login: (async (request, response) => {
    const result = await authService.login(request.body, requestContext(request));
    if (result.mfaRequired) {
      response.json({ mfaRequired: true, challengeToken: result.challengeToken });
      return;
    }
    attachSessionCookie(response, result.token);
    response.json({ user: result.user });
  }) as RequestHandler,

  loginMfa: (async (request, response) => {
    const result = await authService.completeMfaLogin(request.body.challengeToken, request.body.code, requestContext(request));
    attachSessionCookie(response, result.token);
    response.json({ user: result.user });
  }) as RequestHandler,

  me: ((request, response) => {
    const user = request.authUser;
    response.json({
      user: user ? { id: user.id, fullName: user.fullName, phone: user.phone, role: user.role } : null,
      security: user ? { mfaEnabled: user.mfaEnabled, mfaRequired: isMfaRequiredFor(user.role) } : null,
    });
  }) as RequestHandler,

  logout: (async (request, response) => {
    await authService.logout(request.sessionTokenHash, request.authUser?.id, requestContext(request));
    response.clearCookie(appConfig.cookieName, {
      httpOnly: true,
      secure: appConfig.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    sendNoContent(response);
  }) as RequestHandler,

  mfaSetup: (async (request, response) => {
    response.json({ data: await mfaService.setup(request.authUser!.id, request.authUser!.phone) });
  }) as RequestHandler,

  mfaEnable: (async (request, response) => {
    response.json({ data: await mfaService.enable(request.authUser!.id, request.body.code, requestContext(request)) });
  }) as RequestHandler,

  mfaDisable: (async (request, response) => {
    await mfaService.disable(request.authUser!.id, request.body.password, request.body.code, requestContext(request));
    sendNoContent(response);
  }) as RequestHandler,
};
