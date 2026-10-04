import { z } from 'zod';
import { TERMS_VERSION } from '@tickethub/shared';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(24),
  password: z.string().min(10).max(128),
  partnerInviteCode: z.string().trim().max(120).optional(),
  acceptTerms: z.literal(true, { error: 'Vous devez accepter les conditions d’utilisation et la politique de confidentialité.' }),
  termsVersion: z.literal(TERMS_VERSION, { error: 'Les conditions ont changé. Rechargez la page puis réessayez.' }),
});

export const loginSchema = z.object({
  phone: z.string().trim().min(8).max(24),
  password: z.string().min(1).max(128),
});

export const mfaCodeSchema = z.object({ code: z.string().trim().min(6).max(16) });

export const mfaLoginSchema = z.object({
  challengeToken: z.string().min(20).max(1000),
  code: z.string().trim().min(6).max(16),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code: z.string().trim().min(6).max(16),
});
