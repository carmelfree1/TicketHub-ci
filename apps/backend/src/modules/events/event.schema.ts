import { z } from 'zod';

export const eventQuerySchema = z.object({ type: z.enum(['concert', 'sport', 'show']).optional() });
