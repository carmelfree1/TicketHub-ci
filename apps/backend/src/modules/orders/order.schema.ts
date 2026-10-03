import { z } from 'zod';

export const bookingIdSchema = z.object({ bookingId: z.string().min(1).max(100) });
