import { DigitalTicket } from '@/types';
import { INITIAL_DIGITAL_TICKET } from '@/features/catalog/data/mockData';
import { TicketRecord } from './api';

export function toDigitalTicket(ticket: TicketRecord): DigitalTicket {
  const isEvent = ticket.productType === 'event';
  const start = ticket.departureDate ? new Date(ticket.departureDate) : new Date();
  const safeDate = Number.isNaN(start.getTime()) ? new Date() : start;
  return {
    ...INITIAL_DIGITAL_TICKET,
    ticketCode: ticket.ticketCode,
    commandRef: ticket.commandRef,
    carrier: isEvent ? 'TicketHub Événements' : ticket.carrier || 'Transporteur',
    category: isEvent ? ticket.category || 'Billet événementiel' : 'Transport interurbain',
    departCity: (isEvent ? ticket.city : ticket.departCity)?.toUpperCase() || 'CÔTE D’IVOIRE',
    departStation: isEvent ? ticket.venue || '' : ticket.departStation || '',
    arrivalCity: isEvent ? 'ÉVÉNEMENT' : ticket.arrivalCity?.toUpperCase() || '',
    arrivalStation: isEvent ? ticket.eventTitle || '' : ticket.arrivalStation || '',
    departureDate: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(safeDate),
    departureTime: ticket.departureTime || '—',
    boardingTime: ticket.departureTime || '—',
    duration: isEvent ? 'Entrée événementielle' : 'Trajet direct',
    seats: ticket.seats || [],
    passengerName: ticket.passengerName,
    passengerPhone: ticket.passengerPhone,
    price: Number(ticket.price || 0),
    paymentMethod: ticket.paymentMethod || 'GeniusPay',
    status: ticket.status === 'used' ? 'used' : ticket.status === 'cancelled' ? 'cancelled' : 'active',
    qrPayload: ticket.qrPayload,
    issuedAt: ticket.issuedAt
      ? `Émis le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.issuedAt))}`
      : new Date().toLocaleString('fr-FR'),
    productType: ticket.productType,
    eventTitle: ticket.eventTitle,
    venue: ticket.venue,
    eventCategory: ticket.category,
    startsAt: ticket.departureDate,
    quantity: ticket.quantity,
  };
}
