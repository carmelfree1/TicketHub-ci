import { z } from 'zod';

export const transportReservationSchema = z.object({
  tripId: z.string().trim().min(1).max(100),
  seats: z.array(z.number().int().positive()).min(1).max(4)
    .refine((seats) => new Set(seats).size === seats.length, { message: 'Un siège ne peut être sélectionné qu’une seule fois.' }),
});

export const eventReservationSchema = z.object({
  eventId: z.string().trim().min(1).max(100),
  categoryId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(10),
});
