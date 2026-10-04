import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authRateLimit, mfaRateLimit } from '../../core/security/rate-limit.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema, mfaCodeSchema, mfaDisableSchema, mfaLoginSchema, registerSchema } from './auth.schema.js';

export const authRoutes = Router();
authRoutes.post('/auth/register', authRateLimit, validateBody(registerSchema), asyncHandler(authController.register));
authRoutes.post('/auth/login', authRateLimit, validateBody(loginSchema), asyncHandler(authController.login));
authRoutes.post('/auth/login/mfa', mfaRateLimit, validateBody(mfaLoginSchema), asyncHandler(authController.loginMfa));
authRoutes.get('/auth/me', asyncHandler(authController.me));
authRoutes.post('/auth/logout', requireAuth, asyncHandler(authController.logout));
authRoutes.post('/auth/mfa/setup', requireAuth, mfaRateLimit, asyncHandler(authController.mfaSetup));
authRoutes.post('/auth/mfa/enable', requireAuth, mfaRateLimit, validateBody(mfaCodeSchema), asyncHandler(authController.mfaEnable));
authRoutes.post('/auth/mfa/disable', requireAuth, mfaRateLimit, validateBody(mfaDisableSchema), asyncHandler(authController.mfaDisable));
