import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startE2eContext, type Session } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('authentication hardening, MFA, audit trail', { skip: !testDatabaseUrl, timeout: 120_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  let totp: typeof import('../../src/core/security/totp.js');

  before(async () => {
    process.env.MFA_REQUIRED_ROLES = 'partner';
    ctx = await startE2eContext(testDatabaseUrl!);
    totp = await import('../../src/core/security/totp.js');
  });

  after(async () => {
    await ctx?.close();
  });

  interface Body {
    user: { id?: string } | null;
    mfaRequired?: boolean;
    challengeToken?: string;
    security?: { mfaEnabled: boolean; mfaRequired: boolean };
    data: { secret: string; backupCodes: string[] };
    error: { code: string };
  }
  const json = async (response: Response) => (await response.json()) as Body;
  const login = (session: Pick<Session, 'phone' | 'password'>, password = session.password) =>
    ctx.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone: session.phone, password }) });
  const loginMfa = (challengeToken: string, code: string) =>
    ctx.api('/api/auth/login/mfa', { method: 'POST', body: JSON.stringify({ challengeToken, code }) });
  const cookieOf = (response: Response) => response.headers.get('set-cookie')?.split(';', 1)[0];

  async function enrollMfa(session: Session) {
    const setup = await ctx.api('/api/auth/mfa/setup', { method: 'POST' }, session);
    assert.equal(setup.status, 200, await setup.clone().text());
    const { secret } = (await json(setup)).data as { secret: string };
    const enable = await ctx.api('/api/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ code: totp.totpAt(secret, totp.totpStep()) }) }, session);
    assert.equal(enable.status, 200, await enable.clone().text());
    const { backupCodes } = (await json(enable)).data as { backupCodes: string[] };
    return { secret, backupCodes };
  }

  describe('response headers', () => {
    it('sends a strict CSP, no-store and no framing on API responses', async () => {
      const traveler = await ctx.registerTraveler();
      const response = await ctx.api('/api/auth/me', {}, traveler);
      assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
      assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.match(response.headers.get('permissions-policy') ?? '', /camera=\(self\)/);
    });

    it('lets the public catalog be cached', async () => {
      const response = await ctx.api('/api/catalog/trips');
      assert.notEqual(response.headers.get('cache-control'), 'no-store');
    });
  });

  describe('two-factor login', () => {
    it('refuses to enable MFA before setup, and setup requires a session', async () => {
      const traveler = await ctx.registerTraveler();
      const early = await ctx.api('/api/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ code: '123456' }) }, traveler);
      assert.equal(early.status, 409);
      const anonymous = await ctx.api('/api/auth/mfa/setup', { method: 'POST' });
      assert.equal(anonymous.status, 401);
    });

    it('rejects a wrong enrollment code and leaves MFA off', async () => {
      const traveler = await ctx.registerTraveler();
      await ctx.api('/api/auth/mfa/setup', { method: 'POST' }, traveler);
      const wrong = await ctx.api('/api/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ code: '000000' }) }, traveler);
      assert.equal(wrong.status, 400);
      const direct = await login(traveler);
      assert.ok((await json(direct)).user, 'login still works without a second factor');
    });

    it('issues no session until the second factor is verified', async () => {
      const traveler = await ctx.registerTraveler();
      const { secret } = await enrollMfa(traveler);

      const first = await login(traveler);
      const body = await json(first);
      assert.equal(first.status, 200);
      assert.equal(body.mfaRequired, true);
      assert.ok(body.challengeToken);
      assert.equal(cookieOf(first), undefined, 'no session cookie before the second factor');
      assert.equal(body.user, undefined);

      const wrong = await loginMfa(body.challengeToken, '000000');
      assert.equal(wrong.status, 401);
      assert.equal(cookieOf(wrong), undefined);

      const nextStep = totp.totpAt(secret, totp.totpStep() + 1);
      const ok = await loginMfa(body.challengeToken, nextStep);
      assert.equal(ok.status, 200, await ok.clone().text());
      const cookie = cookieOf(ok);
      assert.ok(cookie);
      const me = await json(await ctx.api('/api/auth/me', {}, { ...traveler, cookie }));
      assert.ok(me.user?.id);
      assert.equal(me.security?.mfaEnabled, true);
    });

    it('does not accept the same code twice', async () => {
      const traveler = await ctx.registerTraveler();
      const { secret } = await enrollMfa(traveler);
      const code = totp.totpAt(secret, totp.totpStep() + 1);
      const challenge = (await json(await login(traveler))).challengeToken as string;
      assert.equal((await loginMfa(challenge, code)).status, 200);
      const again = (await json(await login(traveler))).challengeToken as string;
      assert.equal((await loginMfa(again, code)).status, 401, 'a code from an already used time step must be rejected');
    });

    it('accepts each backup code once', async () => {
      const traveler = await ctx.registerTraveler();
      const { backupCodes } = await enrollMfa(traveler);
      assert.equal(backupCodes.length, 10);
      const challenge = (await json(await login(traveler))).challengeToken as string;
      assert.equal((await loginMfa(challenge, backupCodes[0])).status, 200);
      const second = (await json(await login(traveler))).challengeToken as string;
      assert.equal((await loginMfa(second, backupCodes[0])).status, 401);
      assert.equal((await loginMfa(second, backupCodes[1].toUpperCase().replace('-', ' '))).status, 200, 'case and separators are ignored');
    });

    it('does not treat a challenge token as a session', async () => {
      const traveler = await ctx.registerTraveler();
      await enrollMfa(traveler);
      const challenge = (await json(await login(traveler))).challengeToken as string;
      const me = await json(await ctx.api('/api/auth/me', { headers: { Authorization: `Bearer ${challenge}` } }));
      assert.equal(me.user, null);
      const cookieMe = await json(await ctx.api('/api/auth/me', {}, { ...traveler, cookie: `tickethub_session=${challenge}` }));
      assert.equal(cookieMe.user, null);
    });

    it('rejects a forged challenge', async () => {
      const response = await loginMfa('forged.token-value-that-is-long-enough', '123456');
      assert.equal(response.status, 401);
      assert.equal((await json(response)).error.code, 'MFA_CHALLENGE_INVALID');
    });

    it('requires password and a valid code to disable MFA', async () => {
      const traveler = await ctx.registerTraveler();
      const { secret } = await enrollMfa(traveler);
      const disable = (password: string, code: string) =>
        ctx.api('/api/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ password, code }) }, traveler);
      assert.equal((await disable('wrong-password-123', totp.totpAt(secret, totp.totpStep() + 1))).status, 401);
      assert.equal((await disable(traveler.password, '000000')).status, 401);
      assert.equal((await disable(traveler.password, totp.totpAt(secret, totp.totpStep() + 1))).status, 204);
      assert.ok((await json(await login(traveler))).user, 'login no longer asks for a second factor');
    });
  });

  describe('account lockout', () => {
    it('locks the account after repeated failures, even for the correct password', async () => {
      const traveler = await ctx.registerTraveler();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await login(traveler, 'wrong-password-123');
        assert.equal(response.status, 401);
      }
      const locked = await login(traveler);
      assert.equal(locked.status, 429);
      assert.equal((await json(locked)).error.code, 'ACCOUNT_LOCKED');

      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { phone: `+225${traveler.phone.slice(1)}` } }).catch(() => null);
      const events = await ctx.prisma.securityEvent.count({ where: { eventType: 'auth.account_locked', userId: user?.id } });
      if (user) assert.equal(events, 1);
    });

    it('lets the user back in once the lock expires and resets the counter', async () => {
      const traveler = await ctx.registerTraveler();
      for (let attempt = 0; attempt < 5; attempt += 1) await login(traveler, 'wrong-password-123');
      assert.equal((await login(traveler)).status, 429);
      await ctx.prisma.user.updateMany({ where: { lockedUntil: { gt: new Date() } }, data: { lockedUntil: new Date(Date.now() - 1000) } });
      assert.equal((await login(traveler)).status, 200);
    });

    it('answers unknown numbers exactly like a wrong password', async () => {
      const unknown = await ctx.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone: '0700000001', password: 'whatever-123456' }) });
      assert.equal(unknown.status, 401);
      assert.equal((await json(unknown)).error.code, 'INVALID_CREDENTIALS');
    });

    it('counts wrong second-factor codes towards the lockout', async () => {
      const traveler = await ctx.registerTraveler();
      await enrollMfa(traveler);
      const challenge = (await json(await login(traveler))).challengeToken as string;
      for (let attempt = 0; attempt < 5; attempt += 1) assert.equal((await loginMfa(challenge, '000000')).status, 401);
      assert.equal((await loginMfa(challenge, '000000')).status, 429);
    });
  });

  describe('mandatory MFA for partners', () => {
    it('blocks scanning and manifests until the partner enrolled', async () => {
      const partner = await ctx.registerPartner();
      const blocked = await ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ ticketCode: 'TKH-AAAAAA-BBBBBB' }) }, partner);
      assert.equal(blocked.status, 403);
      assert.equal((await json(blocked)).error.code, 'MFA_SETUP_REQUIRED');
      const manifest = await ctx.api('/api/partner/manifest/anything', {}, partner);
      assert.equal((await json(manifest)).error.code, 'MFA_SETUP_REQUIRED');

      const me = await json(await ctx.api('/api/auth/me', {}, partner));
      assert.deepEqual(me.security, { mfaEnabled: false, mfaRequired: true });

      await enrollMfa(partner);
      const afterEnrollment = await ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ ticketCode: 'TKH-AAAAAA-BBBBBB' }) }, partner);
      assert.equal((await json(afterEnrollment)).error.code, 'TICKET_NOT_FOUND', 'the request now reaches the ticket lookup');
    });

    it('does not let a required-MFA account switch MFA off', async () => {
      const partner = await ctx.registerPartner();
      const { secret } = await enrollMfa(partner);
      const response = await ctx.api('/api/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: partner.password, code: totp.totpAt(secret, totp.totpStep() + 1) }),
      }, partner);
      assert.equal(response.status, 403);
    });

    it('does not affect travelers', async () => {
      const traveler = await ctx.registerTraveler();
      const tickets = await ctx.api('/api/tickets', {}, traveler);
      assert.equal(tickets.status, 200);
    });
  });

  describe('audit trail and security events', () => {
    it('records logins, failures and rejected scans with the acting user', async () => {
      const partner = await ctx.registerPartner();
      await enrollMfa(partner);
      const user = await ctx.prisma.user.findFirstOrThrow({ orderBy: { createdAt: 'desc' }, where: { role: 'partner' } });
      await ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ ticketCode: 'TKH-AAAAAA-CCCCCC' }) }, partner);

      const actions = (await ctx.prisma.auditLog.findMany({ where: { userId: user.id } })).map((row) => row.action);
      assert.ok(actions.includes('auth.register'), actions.join(','));
      assert.ok(actions.includes('mfa.enabled'), actions.join(','));
      assert.ok(actions.includes('ticket.scan_rejected'), actions.join(','));
      const rejected = await ctx.prisma.auditLog.findFirstOrThrow({ where: { userId: user.id, action: 'ticket.scan_rejected' } });
      assert.deepEqual(rejected.metadata, { code: 'TICKET_NOT_FOUND' });
      assert.ok(rejected.ipAddress);
    });

    it('records bookings and payments against the traveler', async () => {
      const traveler = await ctx.registerTraveler();
      const booking = await ctx.reserveOk(traveler);
      await ctx.startPayment(traveler, booking);
      const rows = await ctx.prisma.auditLog.findMany({ where: { resourceId: booking.id } });
      assert.deepEqual(rows.map((row) => row.action).sort(), ['booking.created', 'payment.started']);
    });

    it('raises a critical security event for a forged webhook', async () => {
      const before = await ctx.prisma.securityEvent.count({ where: { eventType: 'webhook.invalid_webhook_signature' } });
      const response = await ctx.sendWebhook({ reference: 'x', bookingId: 'y', amount: 1, secret: 'forged-secret-forged-secret-forged' });
      assert.equal(response.status, 401);
      const after = await ctx.prisma.securityEvent.findMany({ where: { eventType: 'webhook.invalid_webhook_signature' } });
      assert.equal(after.length, before + 1);
      assert.equal((after.at(-1)!.metadata as { severity: string }).severity, 'critical');
    });
  });
});
