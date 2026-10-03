import { z } from 'zod';

export const settlementPeriodSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine((value) => value.periodEnd > value.periodStart, { message: 'La fin de période doit suivre le début.' });
