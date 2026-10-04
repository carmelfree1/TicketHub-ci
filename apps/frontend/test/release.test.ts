import assert from 'node:assert/strict';
import test from 'node:test';
import { missingFields, REQUIRED_LEGAL_FIELDS, siteUrlProblem } from '../build/legal-guard.js';
import { robotsTxt, sitemapXml } from '../build/seo.js';
import { documentTitle, HOME_TITLE, routeMeta, SITEMAP_PATHS } from '../src/app/route-meta.js';

const complete = Object.fromEntries(REQUIRED_LEGAL_FIELDS.map((name) => [name, name === 'VITE_SITE_URL' ? 'https://tickethub.example' : 'valeur']));

test('a release needs every legal field, and blank values do not count', () => {
  assert.deepEqual(missingFields(complete), []);
  assert.deepEqual(missingFields({}), [...REQUIRED_LEGAL_FIELDS]);
  assert.deepEqual(missingFields({ ...complete, VITE_LEGAL_ADDRESS: '   ' }), ['VITE_LEGAL_ADDRESS']);
});

test('the public address must be an https origin', () => {
  assert.equal(siteUrlProblem('https://tickethub.example'), null);
  assert.equal(siteUrlProblem('https://tickethub.example/'), null);
  assert.equal(siteUrlProblem(undefined), null, 'absence is reported separately as a missing field');
  assert.match(siteUrlProblem('http://tickethub.example') ?? '', /https/);
  assert.match(siteUrlProblem('https://tickethub.example/app') ?? '', /path/);
  assert.match(siteUrlProblem('not a url') ?? '', /valid/);
});

test('robots.txt hides private areas and the API, and points to the sitemap once the address is known', () => {
  const withSite = robotsTxt('https://tickethub.example');
  for (const path of ['/api/', '/partenaire', '/billets', '/paiement']) assert.match(withSite, new RegExp(`Disallow: ${path}`));
  assert.match(withSite, /Sitemap: https:\/\/tickethub\.example\/sitemap\.xml/);
  assert.doesNotMatch(robotsTxt(''), /Sitemap/);
});

test('the sitemap lists exactly the public pages', () => {
  const xml = sitemapXml('https://tickethub.example', '2026-10-04');
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, SITEMAP_PATHS.map((path) => `https://tickethub.example${path}`));
  assert.ok(!xml.includes('/billets') && !xml.includes('/paiement') && !xml.includes('/partenaire'));
});

test('only public pages may be indexed and each has a title and description', () => {
  for (const path of SITEMAP_PATHS) {
    const meta = routeMeta(path);
    assert.equal(meta.indexable, true, path);
    assert.ok(meta.description.length > 40, path);
  }
  for (const path of ['/billets', '/billets/TKH-AAAAAA-BBBBBB', '/paiement', '/paiement/retour', '/partenaire', '/partenaire/scanner', '/trajets/x', '/evenements/y', '/inconnue']) {
    assert.equal(routeMeta(path).indexable, false, path);
  }
  assert.equal(documentTitle(routeMeta('/')), HOME_TITLE);
  assert.equal(documentTitle(routeMeta('/conditions')), 'Conditions d’utilisation | TicketHub CI');
  assert.equal(documentTitle(routeMeta('/page-qui-nexiste-pas')), 'Page introuvable | TicketHub CI');
});

test('titles contain no em dash', () => {
  for (const path of ['/', ...SITEMAP_PATHS, '/billets', '/paiement', '/partenaire']) assert.ok(!documentTitle(routeMeta(path)).includes('—'), path);
});
