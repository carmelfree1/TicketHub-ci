import { z } from 'zod';

export const providerIdSchema = z.object({ id: z.string().min(1).max(80) });
