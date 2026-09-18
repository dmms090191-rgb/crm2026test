// Tests unitaires : filtre « Filtrer par extension » (aucun reseau).
//   node --test scripts/site-interface/domainFilterModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkExtensions, filterRows, matchExtensions, missingExtensions, normalizeExtensionTerm, orderByCatalog, parseExtensionsResponse,
  SELECTED_BATCH_SIZE, toggleExtension,
} from '../../src/lib/domainFilterModel.ts';
import type { SearchRow } from '../../src/lib/domainSearchModel.ts';

const row = (tld: string, over: Partial<SearchRow> = {}): SearchRow =>
  ({ domain: `popolera.${tld}`, tld, status: 'available', restricted: false, popular: false, client_price: null, ...over });
const CATALOG = ['com', 'fr', 'net', 'org', 'eu', 'io', 'co', 'info', 'shop', 'store', 'co.uk', 'company', 'computer', 'eco', 'zone'];

test('liste serveur : seules les extensions valides, sans doublon ; tout le reste = impossible de charger', () => {
  const ok = parseExtensionsResponse(200, { ok: true, result: { status: 'ok', tlds: ['com', 'co.uk', 'COM', 'com', '', 'a..b', 42, 'shop'], total_tlds: 5 } });
  assert.deepEqual(ok, { status: 'ok', reason: null, tlds: ['com', 'co.uk', 'shop'], retry_after_seconds: null });
  assert.equal(parseExtensionsResponse(401, null).reason, 'unauthenticated');
  assert.equal(parseExtensionsResponse(403, null).reason, 'forbidden');
  assert.equal(parseExtensionsResponse(500, {}).status, 'unknown');
  assert.equal(parseExtensionsResponse(200, { ok: true, result: { status: 'ok', tlds: [] } }).status, 'unknown', 'liste vide : jamais un menu vide trompeur');
  const refused = parseExtensionsResponse(200, { ok: true, result: { status: 'unknown', reason: 'rate_limited', tlds: [], retry_after_seconds: 37 } });
  assert.deepEqual([refused.status, refused.reason, refused.retry_after_seconds], ['unknown', 'rate_limited', 37]);
  assert.doesNotMatch(JSON.stringify(ok), /price|cents|EUR/);
});

test('recherche dans le menu : « co » -> exacte, puis debut, puis contenu ; « .CO » equivalent', () => {
  assert.equal(normalizeExtensionTerm('  .CO '), 'co');
  assert.deepEqual(matchExtensions(CATALOG, 'co'), ['co', 'com', 'co.uk', 'company', 'computer', 'eco']);
  assert.deepEqual(matchExtensions(CATALOG, '.CO'), matchExtensions(CATALOG, 'co'));
  assert.deepEqual(matchExtensions(CATALOG, ''), CATALOG);
  assert.deepEqual(matchExtensions(CATALOG, 'co.il'), [], 'extension non vendue absente du menu');
});

test('selection multiple, retrait, « Tout afficher »', () => {
  let selected = toggleExtension([], 'co');
  selected = toggleExtension(selected, 'io');
  selected = toggleExtension(selected, 'net');
  assert.deepEqual(selected, ['co', 'io', 'net']);
  assert.deepEqual(toggleExtension(selected, 'io'), ['co', 'net']);
  const rows = [row('com', { popular: true }), row('net', { popular: true }), row('io', { popular: true }), row('co'), row('shop')];
  assert.deepEqual(filterRows(rows, ['co']).map((r) => r.domain), ['popolera.co']);
  assert.deepEqual(filterRows(rows, ['co', 'io', 'net']).map((r) => r.domain), ['popolera.net', 'popolera.io', 'popolera.co']);
  assert.equal(filterRows(rows, []), rows, 'aucun filtre : toutes les lignes');
  assert.deepEqual(filterRows([row('co.il', { status: 'not_offered' }), ...rows], ['co']).map((r) => r.tld), ['co'], 'ligne non proposee masquee');
});

test('verification ciblee : seulement les extensions ni chargees, ni en cours, ni en echec ; lots de 10', () => {
  const rows = [row('com'), row('fr'), row('co')];
  assert.deepEqual(missingExtensions(['co', 'shop', 'zone', 'eco'], rows, ['zone'], ['eco']), ['shop']);
  assert.deepEqual(missingExtensions(['co'], rows, [], []), [], 'deja charge : aucun appel');
  const many = Array.from({ length: 23 }, (_, i) => `t${i}x`);
  const chunks = chunkExtensions(many);
  assert.equal(SELECTED_BATCH_SIZE, 10);
  assert.deepEqual(chunks.map((c) => c.length), [10, 10, 3]);
  assert.deepEqual(chunks.flat(), many);
});

test('ordre du catalogue : une extension verifiee depuis le filtre reprend sa place, sans doublon ni perte', () => {
  const others = [row('co'), row('info'), row('zone'), row('shop'), row('hors-catalogue')];
  const ordered = orderByCatalog(others, CATALOG);
  assert.deepEqual(ordered.map((r) => r.tld), ['co', 'info', 'shop', 'zone', 'hors-catalogue']);
  assert.equal(new Set(ordered.map((r) => r.domain)).size, others.length);
  assert.equal(orderByCatalog(others, []), others, 'catalogue pas encore charge : ordre recu conserve');
});
