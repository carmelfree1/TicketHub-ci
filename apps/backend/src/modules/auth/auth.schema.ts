import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(24),
  password: z.string().min(10).max(128),
  partnerInviteCode: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  phone: z.string().trim().min(8).max(24),
  password: z.string().min(1).max(128),
});
