import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { userService } from './user.service.js';

export const userController = {
  me: (async (request, response) => sendSuccess(response, { user: await userService.getProfile(request.authUser!.id) })) as RequestHandler,
  update: (async (request, response) => sendSuccess(response, { user: await userService.updateProfile(request.authUser!.id, request.body) })) as RequestHandler,
};
