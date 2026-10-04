/**
 * Lists what needs a human decision: payments the gateway confirmed after the seats were released, payments that
 * stayed unresolved, and refund requests. Run it daily (or wire it to your alerting) until an admin screen exists.
 */
import '../src/load-env.js';
import { prisma } from '../src/config/database.js';

async function main(): Promise<void> {
  const payments = await prisma.payment.findMany({
    where: { status: 'needs_review' },
    include: { booking: { include: { user: true } } },
    orderBy: { updatedAt: 'asc' },
    take: 200,
  });
  console.log(`\nPayments to review: ${payments.length}`);
  console.table(payments.map((p) => ({
    booking: p.bookingId, reference: p.providerReference ?? '', amountXof: p.amountXof, customer: p.booking.user.phone, since: p.updatedAt.toISOString(),
  })));

  const refunds = await prisma.refund.findMany({
    where: { status: { in: ['requested', 'reviewing', 'approved', 'processing'] } },
    include: { order: true, user: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  console.log(`\nOpen refund requests: ${refunds.length}`);
  console.table(refunds.map((r) => ({
    refund: r.id, status: r.status, booking: r.order.bookingId, amountXof: r.order.amountXof, customer: r.user.phone, reason: r.reason.slice(0, 60), since: r.createdAt.toISOString(),
  })));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
