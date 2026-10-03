import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(8).max(24).optional(),
}).refine((value) => value.fullName !== undefined || value.phone !== undefined, { message: 'Modifiez au moins un champ.' });
