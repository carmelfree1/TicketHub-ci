import { z } from 'zod';

export const createRefundSchema = z.object({
  bookingId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(8).max(1000),
});
