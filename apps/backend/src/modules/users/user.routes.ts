import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { userController } from './user.controller.js';
import { updateProfileSchema } from './user.schema.js';

export const userRoutes = Router();
userRoutes.get('/users/me', requireAuth, asyncHandler(userController.me));
userRoutes.patch('/users/me', requireAuth, validateBody(updateProfileSchema), asyncHandler(userController.update));
