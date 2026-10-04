import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startE2eContext, type Session } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/** A customer and a partner signed in together in one browser: the browser sends both cookies on every request. */
describe('customer and partner signed in at the same time', { skip: !testDatabaseUrl, timeout: 120_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  let traveler: Session;
  let partner: Session;
  let both: string;

  before(async () => {
    ctx = await startE2eContext(testDatabaseUrl!);
    traveler = await ctx.registerTraveler('Client Double');
    partner = await ctx.registerPartnerFor(await ctx.providerIdByCode('UTB'), 'manager', 'Partenaire Double');
    both = `${traveler.cookie}; ${partner.cookie}`;
  });

  after(async () => {
    await ctx?.close();
  });

  const call = (path: string, headers: Record<string, string> = {}, init: RequestInit = {}) =>
    ctx.api(path, { ...init, headers: { Cookie: both, ...headers } });
  const json = async <T = Record<string, any>>(response: Response) => (await response.json()) as T; // eslint-disable-line @typescript-eslint/no-explicit-any

  it('signs each kind of account in with its own cookie', () => {
    assert.ok(traveler.cookie.startsWith('tickethub_session='));
    assert.ok(partner.cookie.startsWith('tickethub_partner_session='));
    assert.notEqual(traveler.cookie.split('=')[0], partner.cookie.split('=')[0]);
  });

  it('answers as the account the request names, even with both cookies present', async () => {
    const asCustomer = await json(await call('/api/auth/me'));
    assert.equal(asCustomer.user.role, 'traveler');
    assert.equal(asCustomer.user.fullName, 'Client Double');
    const asCustomerExplicit = await json(await call('/api/auth/me', { 'X-Account': 'traveler' }));
    assert.equal(asCustomerExplicit.user.role, 'traveler');
    const asPartner = await json(await call('/api/auth/me', { 'X-Account': 'partner' }));
    assert.equal(asPartner.user.role, 'partner');
    assert.equal(asPartner.user.fullName, 'Partenaire Double');
  });

  it('uses the customer session for customer routes and the partner session for partner routes', async () => {
    const wallet = await call('/api/tickets');
    assert.equal(wallet.status, 200, 'the wallet belongs to the customer account');
    const company = await json<{ data: { providers: unknown[] } }>(await call('/api/partner/me'));
    assert.equal(company.data.providers.length, 1, 'partner routes use the partner account without any header');
  });

  it('does not let one account act with the other one\'s powers', async () => {
    const onlyTraveler = await ctx.api('/api/partner/me', {}, traveler);
    // A customer alone on a partner route is signed in but not allowed.
    assert.equal(onlyTraveler.status, 403);
    const partnerCookieAsCustomer = await ctx.api('/api/auth/me', { headers: { Cookie: partner.cookie.replace('tickethub_partner_session', 'tickethub_session'), 'X-Account': 'traveler' } });
    assert.equal((await json(partnerCookieAsCustomer)).user, null, 'a partner session is not valid for the customer account');
    const customerCookieAsPartner = await ctx.api('/api/partner/me', { headers: { Cookie: traveler.cookie.replace('tickethub_session', 'tickethub_partner_session'), 'X-Account': 'partner' } });
    assert.equal(customerCookieAsPartner.status, 403, 'a customer session in the partner cookie still has no partner rights');
  });

  it('signs out one account and keeps the other', async () => {
    const outPartner = await call('/api/auth/logout', { 'X-Account': 'partner' }, { method: 'POST' });
    assert.equal(outPartner.status, 204);
    const cleared = outPartner.headers.get('set-cookie') ?? '';
    assert.match(cleared, /tickethub_partner_session=;/, 'only the partner cookie is cleared');
    assert.doesNotMatch(cleared, /(^|, )tickethub_session=;/);

    // The server revoked the partner session, so even the old cookie no longer works.
    const stale = await json(await call('/api/auth/me', { 'X-Account': 'partner' }));
    assert.equal(stale.user, null);
    const customer = await json(await call('/api/auth/me', { 'X-Account': 'traveler' }));
    assert.equal(customer.user.role, 'traveler');
    assert.equal((await call('/api/tickets')).status, 200);
  });

  it('signing in as a partner leaves the customer cookie untouched', async () => {
    const response = await ctx.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone: partner.phone, password: partner.password }) });
    assert.equal(response.status, 200);
    const cookies = response.headers.get('set-cookie') ?? '';
    assert.match(cookies, /^tickethub_partner_session=/);
    assert.doesNotMatch(cookies, /tickethub_session=/);
  });
});
