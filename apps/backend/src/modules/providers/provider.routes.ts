import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { providerController } from './provider.controller.js';

export const providerRoutes = Router();
providerRoutes.get('/providers', asyncHandler(providerController.list));
providerRoutes.get('/providers/:id', asyncHandler(providerController.get));
