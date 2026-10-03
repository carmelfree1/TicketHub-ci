import assert from 'node:assert/strict';
import test from 'node:test';
import { eventReservationSchema, transportReservationSchema } from '../../src/modules/reservations/reservation.schema.js';
import { paymentMethodSchema } from '../../src/modules/payments/payment.schema.js';
import { scanTicketSchema } from '../../src/modules/tickets/ticket.schema.js';
import { createRefundSchema } from '../../src/modules/refunds/refund.schema.js';
import { catalogQuerySchema } from '../../src/modules/catalog/catalog.schema.js';
import { hasPermission } from '../../src/core/security/permissions.js';
import { mapPaymentMethod, paymentMethodLabel } from '../../src/integrations/geniuspay/geniuspay.mapper.js';

test('transport reservations accept a bounded unique seat selection', () => {
  assert.equal(transportReservationSchema.safeParse({ tripId: 'trip-1', seats: [1, 4, 12] }).success, true);
  assert.equal(transportReservationSchema.safeParse({ tripId: 'trip-1', seats: [4, 4] }).success, false);
  // The dynamic upper bound (the trip's actual capacity) is enforced transactionally against PostgreSQL.
  assert.equal(transportReservationSchema.safeParse({ tripId: 'trip-1', seats: [] }).success, false);
  assert.equal(transportReservationSchema.safeParse({ tripId: 'trip-1', seats: [1, 2, 3, 4, 5] }).success, false);
});

test('event reservations and refunds enforce safe quantity and reason limits', () => {
  assert.equal(eventReservationSchema.safeParse({ eventId: 'event-1', categoryId: 'cat-1', quantity: 10 }).success, true);
  assert.equal(eventReservationSchema.safeParse({ eventId: 'event-1', categoryId: 'cat-1', quantity: 0 }).success, false);
  assert.equal(createRefundSchema.safeParse({ bookingId: 'booking-1', reason: 'Le trajet a été annulé.' }).success, true);
  assert.equal(createRefundSchema.safeParse({ bookingId: 'booking-1', reason: 'Non.' }).success, false);
});

test('payment methods are allow-listed and mapped to GeniusPay identifiers', () => {
  assert.equal(paymentMethodSchema.safeParse({ paymentMethod: 'wave' }).success, true);
  assert.equal(paymentMethodSchema.safeParse({ paymentMethod: 'unknown-wallet' }).success, false);
  assert.equal(mapPaymentMethod('orange'), 'orange_money');
  assert.equal(mapPaymentMethod('moov'), undefined);
  assert.equal(paymentMethodLabel('cb'), 'Carte bancaire');
});

test('scanner accepts either a QR token or manual ticket code', () => {
  assert.equal(scanTicketSchema.safeParse({ token: 'signed.token' }).success, true);
  assert.equal(scanTicketSchema.safeParse({ ticketCode: 'TKH-ABC-123' }).success, true);
  assert.equal(scanTicketSchema.safeParse({}).success, false);
});

test('catalog date filter validates the ISO date shape', () => {
  assert.equal(catalogQuerySchema.safeParse({ from: 'Abidjan', date: '2026-10-03' }).success, true);
  assert.equal(catalogQuerySchema.safeParse({ date: '03-10-2026' }).success, false);
  assert.equal(catalogQuerySchema.safeParse({ date: '2026-02-30' }).success, false);
});

test('permission matrix separates travelers from partner operations', () => {
  assert.equal(hasPermission('traveler', 'booking:create'), true);
  assert.equal(hasPermission('traveler', 'partner:scan'), false);
  assert.equal(hasPermission('partner', 'partner:scan'), true);
  assert.equal(hasPermission('partner', 'refund:request'), false);
});
