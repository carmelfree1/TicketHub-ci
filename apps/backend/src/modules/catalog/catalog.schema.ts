import { z } from 'zod';

export const catalogQuerySchema = z.object({
  from: z.string().trim().max(100).optional(),
  to: z.string().trim().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, { message: 'La date doit exister au format AAAA-MM-JJ.' }).optional(),
});
