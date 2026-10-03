import { z } from 'zod';

export const scanTicketSchema = z.object({
  token: z.string().min(1).max(3000).optional(),
  ticketCode: z.string().trim().min(1).max(40).optional(),
}).refine((value) => Boolean(value.token || value.ticketCode), { message: 'Fournissez le QR ou le code du billet.' });
