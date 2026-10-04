import assert from 'node:assert/strict';
import test from 'node:test';
import { paths, screenFromPath } from '../src/app/paths.js';

test('maps every URL to the screen that drives navigation highlighting', () => {
  const expectations: Array<[string, string | null]> = [
    ['/', 'explorer'],
    ['/trajets/trip-1', 'seat-selection'],
    ['/evenements/evt-1', 'event-selection'],
    ['/paiement', 'payment'],
    ['/paiement/retour', 'payment-result'],
    ['/billets', 'tickets-wallet'],
    ['/billets/TKH-AAAAAA-BBBBBB', 'digital-pass'],
    ['/partenaire', 'partner-dashboard'],
    ['/partenaire/scanner', 'partner-scanner'],
    ['/partenaire/manifeste', 'partner-manifest'],
    ['/inconnu', null],
  ];
  for (const [path, screen] of expectations) assert.equal(screenFromPath(path), screen, path);
});

test('builds URLs that round-trip through screenFromPath and escape identifiers', () => {
  assert.equal(screenFromPath(paths.trip('trip-1')), 'seat-selection');
  assert.equal(screenFromPath(paths.event('evt-1')), 'event-selection');
  assert.equal(screenFromPath(paths.ticket('TKH-AAAAAA-BBBBBB')), 'digital-pass');
  assert.equal(paths.trip('a/b?c'), '/trajets/a%2Fb%3Fc');
  assert.equal(paths.ticket('x y'), '/billets/x%20y');
});
