import { formatXof } from '@tickethub/shared';

export type NotificationTemplate = 'payment_confirmed' | 'payment_under_review' | 'payment_failed' | 'refund_completed';

export interface TemplateData {
  /** Short, non secret booking reference shown to the traveler. */
  reference: string;
  quantity?: number;
  amountXof?: number;
  title?: string;
}

/** Short reference such as "A1B2C3D4", safe to print in a text message and easy to read out loud. */
export function shortReference(bookingId: string): string {
  return bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
}

/**
 * French text messages. They never contain a ticket code or QR token: those stay inside the signed-in account so a
 * message forwarded or read on a lock screen cannot be used to enter.
 */
export function renderNotification(template: NotificationTemplate, data: TemplateData): string {
  const ref = `Réf. ${data.reference}`;
  switch (template) {
    case 'payment_confirmed': {
      const count = data.quantity ?? 1;
      const amount = data.amountXof !== undefined ? ` (${formatXof(data.amountXof)} FCFA)` : '';
      return `TicketHub CI : paiement confirmé${amount}. Vos ${count} billet${count > 1 ? 's sont disponibles' : ' est disponible'} dans Mes billets. ${ref}`;
    }
    case 'payment_under_review':
      return `TicketHub CI : nous avons reçu votre paiement mais la réservation avait expiré. Notre équipe vérifie votre commande et revient vers vous. ${ref}`;
    case 'payment_failed':
      return `TicketHub CI : votre paiement n'a pas abouti et aucun billet n'a été émis. Vous pouvez réessayer depuis le catalogue. ${ref}`;
    case 'refund_completed':
      return `TicketHub CI : votre remboursement a été effectué par la passerelle de paiement et les billets associés sont annulés. ${ref}`;
  }
}
