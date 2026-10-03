import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authRateLimit } from '../../core/security/rate-limit.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';

export const authRoutes = Router();
authRoutes.post('/auth/register', authRateLimit, validateBody(registerSchema), asyncHandler(authController.register));
authRoutes.post('/auth/login', authRateLimit, validateBody(loginSchema), asyncHandler(authController.login));
authRoutes.get('/auth/me', asyncHandler(authController.me));
authRoutes.post('/auth/logout', requireAuth, asyncHandler(authController.logout));
