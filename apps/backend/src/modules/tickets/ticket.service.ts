import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import { BusinessError } from '../../core/errors/BusinessError.js';
import { ticketRepository } from './ticket.repository.js';
import { createTicketCode, signTicketQr, verifyTicketQr } from './qr.service.js';
import type { ManualTicketValidation, TicketQrClaims } from './ticket.types.js';

const db = prisma as any;

export async function issueTicketsForBooking(tx: any, bookingId: string): Promise<void> {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true, quantity: true } });
  if (!booking) throw new AppError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
  for (let ordinal = 0; ordinal < booking.quantity; ordinal += 1) {
    const existing = await tx.ticket.findUnique({ where: { bookingId_ordinal: { bookingId, ordinal } }, select: { id: true } });
    if (existing) continue;

    let created = false;
    for (let attempt = 0; attempt < 10 && !created; attempt += 1) {
      const result = await tx.ticket.createMany({
        data: [{ id: randomUUID(), bookingId, ordinal, code: createTicketCode() }],
        skipDuplicates: true,
      });
      created = result.count === 1;
    }
    if (!created) {
      throw new AppError('Impossible de generer un code billet unique.', 500, 'TICKET_CODE_GENERATION_FAILED');
    }
  }
}

export const ticketService = {
  async listUserTickets(userId: string) {
    const tickets = await ticketRepository.listUserTickets(userId);
    return tickets.map((ticket: any) => ({
      ...ticket,
      qrPayload: signTicketQr({
        v: 1,
        ticketId: ticket.id,
        bookingId: ticket.commandRef,
        exp: Math.floor(new Date(ticket.validUntil).getTime() / 1000),
      }),
    }));
  },

  async listManifest(tripId: string) {
    return ticketRepository.listManifest(tripId);
  },

  async consume(input: ManualTicketValidation) {
    let ticketId: string | undefined;
    let bookingId: string | undefined;
    let claims: TicketQrClaims | undefined;
    if (input.token) {
      claims = verifyTicketQr(input.token);
      ticketId = claims.ticketId;
      bookingId = claims.bookingId;
    } else if (input.ticketCode) {
      const code = input.ticketCode.trim().toUpperCase();
      const match = await ticketRepository.findByCode(code);
      ticketId = match?.id;
      bookingId = match?.bookingId;
    } else {
      throw new AppError('Scannez un QR valide ou saisissez son code.', 400, 'TICKET_REQUIRED');
    }
    if (!ticketId || !bookingId) throw new AppError('Billet introuvable.', 404, 'TICKET_NOT_FOUND');

    return db.$transaction(async (tx: any) => {
      const ticket = await ticketRepository.findForScan(tx, ticketId!);
      if (!ticket || ticket.bookingId !== bookingId) throw new AppError('Billet introuvable.', 404, 'TICKET_NOT_FOUND');
      const booking = ticket.booking;
      if (booking.status !== 'paid') throw new AppError('Réservation non réglée.', 409, 'BOOKING_NOT_PAID');
      if (claims && (claims.ticketId !== ticket.id || claims.bookingId !== booking.id)) {
        throw new AppError('Le jeton ne correspond pas au billet.', 401, 'TICKET_BINDING_INVALID');
      }
      const details = ticketRepository.dto(ticket);
      if (Date.now() >= new Date(details.validUntil).getTime()) throw new AppError('Ce billet a expiré.', 410, 'TICKET_EXPIRED');
      if (ticket.status === 'used') throw new AppError('Ce billet a déjà été utilisé.', 409, 'TICKET_ALREADY_USED');
      if (ticket.status !== 'active') throw new AppError('Ce billet n’est pas actif.', 409, 'TICKET_INACTIVE');
      const update = await tx.ticket.updateMany({ where: { id: ticket.id, status: 'active' }, data: { status: 'used', usedAt: new Date() } });
      if (update.count !== 1) throw new BusinessError('Ce billet a déjà été utilisé.', 'TICKET_ALREADY_USED');
      return {
        ticketId: ticket.id,
        ticketCode: ticket.code,
        status: 'used',
        usedAt: new Date().toISOString(),
        productType: booking.productType,
        passengerName: booking.user.fullName,
        passengerPhone: booking.user.phone,
        carrier: booking.busTrip?.carrier ?? null,
        departCity: booking.busTrip?.departCity ?? null,
        departStation: booking.busTrip?.departStation ?? null,
        arrivalCity: booking.busTrip?.arrivalCity ?? null,
        arrivalStation: booking.busTrip?.arrivalStation ?? null,
        departureAt: booking.busTrip?.departAt?.toISOString() ?? null,
        eventTitle: booking.event?.title ?? null,
        venue: booking.event?.venue ?? null,
        city: booking.event?.city ?? null,
        startsAt: booking.event?.startsAt?.toISOString() ?? null,
        category: booking.ticketCategory?.name ?? null,
        seats: booking.productType === 'transport' && booking.seats[ticket.ordinal] !== undefined ? [booking.seats[ticket.ordinal]] : [],
        price: booking.amountXof / booking.quantity,
        paymentMethod: details.paymentMethod,
      };
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 });
  },
};
