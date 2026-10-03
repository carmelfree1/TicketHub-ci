import { z } from 'zod';

export const paymentMethodSchema = z.object({
  paymentMethod: z.enum(['wave', 'orange', 'mtn', 'moov', 'cb']),
});
