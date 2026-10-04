import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { collectIconNames, knownIconNames, materialSymbolsUrl } from '../build/material-icons.js';

const known = knownIconNames();

test('knows the real icon catalogue', () => {
  assert.ok(known.size > 3000);
  for (const name of ['search', 'close', 'qr_code_scanner', 'directions_bus', 'confirmation_number']) assert.ok(known.has(name), name);
});

test('finds icon names in JSX text, string literals and conditionals, ignoring ordinary text', () => {
  const source = `
    <span className="material-symbols-outlined">search</span>
    const icon = isBusy ? 'sync' : 'lock';
    const tabs = [{ icon: "directions_bus" }, { icon: \`music_note\` }];
    <p>Bonjour tout le monde</p>
    const className = "flex items-center";
  `;
  assert.deepEqual(collectIconNames([source], known), ['directions_bus', 'lock', 'music_note', 'search', 'sync']);
});

test('returns names sorted and unique, as Google requires', () => {
  const names = collectIconNames([`'search' 'close' 'search' 'arrow_back'`], known);
  assert.deepEqual(names, ['arrow_back', 'close', 'search']);
  assert.match(materialSymbolsUrl(names), /icon_names=arrow_back,close,search&display=block$/);
});

test('covers every icon the application actually renders', () => {
  const src = path.resolve(import.meta.dirname, '../src');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.tsx')) files.push(full);
    }
  };
  walk(src);
  const sources = files.map((file) => readFileSync(file, 'utf8'));
  const requested = new Set(collectIconNames(sources, known));

  // Everything written as the content of an icon element must be requested.
  const rendered = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(/material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]*)\s*</g)) rendered.add(match[1]);
  }
  assert.ok(rendered.size > 20, 'the scan should find the icons used in JSX');
  for (const name of rendered) assert.ok(requested.has(name), `icon "${name}" is rendered but would not be requested`);
});
