// Tests unitaires : affichage de la recherche de domaine multi-extensions (aucun reseau).
//   node --test scripts/site-interface/domainSearchModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRows, checkedCount, describeRow, formatMoney, parseSearchResponse, precheckSearchQuery, remainingCount, restrictionLabel,
  retryText, searchNotice, searchSummary, unknownPage, type SearchRow,
} from '../../src/lib/domainSearchModel.ts';

const ok = (result: Record<string, unknown>) => ({ ok: true, result });
const page = (over: Record<string, unknown> = {}) => ok({
  status: 'ok', reason: null, name: 'dior', requested_tld: null, requested_tld_offered: null, catalog_status: 'ok',
  total_tlds: 406, offset: 0, next_offset: 6, retry_after_seconds: null, results: [], ...over,
});
const row = (over: Partial<SearchRow> & { domain: string; tld: string }): SearchRow =>
  ({ status: 'available', restricted: false, popular: true, client_price: null, ...over });

test('reponse serveur : seules les formes attendues sont acceptees', () => {
  assert.equal(parseSearchResponse(401, {}, 0).reason, 'unauthenticated');
  assert.equal(parseSearchResponse(403, {}, 6).reason, 'forbidden');
  assert.equal(parseSearchResponse(403, {}, 6).next_offset, 6, 'meme position pour reessayer');
  assert.equal(parseSearchResponse(500, {}, 0).status, 'unknown');
  assert.equal(parseSearchResponse(200, ok({ status: 'peut-etre' }), 0).status, 'unknown');

  const parsed = parseSearchResponse(200, page({ results: [
    { domain: 'dior.com', tld: 'com', status: 'unavailable', restricted: false, popular: true, client_price: null },
    { domain: 'dior.net', tld: 'net', status: 'available', restricted: false, popular: true, client_price: null, provider_price: { currency: 'EUR', first_year_cents: 1399, renewal_cents: 1699 } },
    { domain: 'dior.fr', tld: 'com', status: 'available' },           // extension incoherente : ignoree
    { domain: 'DIOR.org', tld: 'org', status: 'available' },          // nom non normalise : ignore
    { domain: 'dior.eu', tld: 'eu', status: 'libre' },                // statut inconnu : ignore
  ] }), 0);
  assert.equal(parsed.status, 'ok');
  assert.deepEqual(parsed.results.map((r) => r.domain), ['dior.com', 'dior.net']);
  assert.deepEqual(parsed.results[1].provider_price, { currency: 'EUR', first_year_cents: 1399, renewal_cents: 1699 });
  assert.equal(parsed.results[1].client_price, null);
  assert.equal(parsed.total_tlds, 406);
  assert.equal(parsed.next_offset, 6);
});

test('saisie : nom seul accepte (le serveur extrait le nom principal)', () => {
  assert.equal(precheckSearchQuery('   ').ok, false);
  assert.deepEqual(precheckSearchQuery(' dior '), { ok: true, value: 'dior' });
  assert.deepEqual(precheckSearchQuery('dior.com'), { ok: true, value: 'dior.com' });
  assert.equal(precheckSearchQuery('a'.repeat(300)).ok, false);
});

test('Talvex : cout Hostinger 1re annee, renouvellement et devise', () => {
  const v = describeRow(row({ domain: 'dior.net', tld: 'net', provider_price: { currency: 'EUR', first_year_cents: 1399, renewal_cents: 1699 } }), true);
  assert.equal(v.label, 'Disponible');
  assert.equal(v.tone, 'success');
  assert.equal(v.showBuyPlaceholder, true);
  assert.match(v.priceLines[0], /^Coût Hostinger 1re année : 13,99\s€$/);
  assert.match(v.priceLines[1], /^Renouvellement : 16,99\s€ \/ an · EUR$/);
  assert.deepEqual(describeRow(row({ domain: 'dior.xyz', tld: 'xyz', provider_price: null }), true).priceLines, ['Coût Hostinger : non disponible']);
});

test('Groupe/Societe : jamais le cout Hostinger, « Prix client : bientot disponible »', () => {
  const leaked = row({ domain: 'dior.net', tld: 'net', provider_price: { currency: 'EUR', first_year_cents: 1399, renewal_cents: 1699 }, restriction_note: 'requires_eu_residence', restricted: true });
  const v = describeRow(leaked, false);
  assert.deepEqual(v.priceLines, ['Prix client : bientôt disponible']);
  assert.equal(v.condition, "Conditions d'enregistrement particulières");
  assert.doesNotMatch([v.label, v.condition, ...v.priceLines].join(' '), /Hostinger|13,99|16,99|requires/);
  assert.equal(describeRow(leaked, true).condition, "Conditions : réservé aux résidents de l'Union européenne");
});

test('indisponible et inconnu : pas de prix, pas de bouton', () => {
  const taken = describeRow(row({ domain: 'dior.com', tld: 'com', status: 'unavailable' }), true);
  assert.deepEqual([taken.label, taken.showBuyPlaceholder, taken.priceLines.length], ['Indisponible', false, 0]);
  const unknown = describeRow(row({ domain: 'dior.be', tld: 'be', status: 'unknown' }), false);
  assert.deepEqual([unknown.label, unknown.tone, unknown.showBuyPlaceholder], ['Impossible de vérifier', 'warning', false]);
});

test('messages d ensemble : extension non vendue, invalide, service indisponible', () => {
  const coIl = parseSearchResponse(200, page({ requested_tld: 'co.il', requested_tld_offered: false, results: [{ domain: 'dior.co.il', tld: 'co.il', status: 'not_offered', restricted: false, popular: false, client_price: null }] }), 0);
  assert.equal(searchNotice(coIl), null, 'la ligne « non proposée » suffit');
  const notOffered = describeRow(coIl.results[0], false);
  assert.deepEqual([notOffered.label, notOffered.tone, notOffered.showBuyPlaceholder, notOffered.condition], ['Non proposée', 'neutral', false, "L'extension .co.il n'est pas proposée."]);
  assert.notEqual(notOffered.label, 'Indisponible');
  assert.equal(searchNotice(parseSearchResponse(200, page({ requested_tld: 'com', requested_tld_offered: true }), 0)), null);
  assert.match(String(searchNotice(parseSearchResponse(200, page({ status: 'invalid', reason: 'unsupported_characters', name: null }), 0))?.text), /accentuées/);
  assert.match(String(searchNotice(parseSearchResponse(200, page({ catalog_status: 'unavailable', total_tlds: null, next_offset: null }), 0))?.text), /extensions principales/);
  assert.match(String(searchNotice(unknownPage('provider_not_configured'))?.text), /bientôt disponible/);
  assert.match(retryText('rate_limited', 37), /Trop de recherches.*37 s/);
  assert.match(retryText('busy', 12), /Beaucoup de recherches.*12 s/);
  assert.equal(retryText('provider_unavailable', null), 'Réessayez dans quelques instants.');
});

test('pages : ajout sans doublon, compteur restant, resume', () => {
  const first = [row({ domain: 'dior.com', tld: 'com', status: 'unavailable' }), row({ domain: 'dior.net', tld: 'net' })];
  const merged = appendRows(first, [row({ domain: 'dior.net', tld: 'net' }), row({ domain: 'dior.shop', tld: 'shop', popular: false })]);
  assert.deepEqual(merged.map((r) => r.domain), ['dior.com', 'dior.net', 'dior.shop']);
  const p = parseSearchResponse(200, page({ total_tlds: 406, next_offset: 16 }), 6);
  assert.equal(remainingCount(p, 16), 390);
  assert.equal(remainingCount(parseSearchResponse(200, page({ next_offset: null }), 0), 6), null);
  assert.equal(searchSummary(merged), '3 extensions vérifiées, 2 disponibles.');
  const withNotOffered = [row({ domain: 'dior.co.il', tld: 'co.il', status: 'not_offered', popular: false }), ...merged];
  assert.equal(checkedCount(withNotOffered), 3, 'la ligne non proposée ne compte pas');
  assert.equal(searchSummary(withNotOffered), '3 extensions vérifiées, 2 disponibles.');
});

test('aucun jargon pour Groupe/Societe, format monetaire', () => {
  const jargon = /dns|cname|whois|registrar|api|token|vercel|supabase|company_id|http|hostinger/i;
  for (const status of ['available', 'unavailable', 'unknown'] as const) {
    const v = describeRow(row({ domain: 'dior.com', tld: 'com', status, restricted: true }), false);
    assert.doesNotMatch([v.label, v.condition ?? '', ...v.priceLines].join(' '), jargon);
  }
  assert.match(formatMoney(999, 'EUR'), /^9,99\s€$/);
  assert.equal(restrictionLabel('code_inconnu'), 'code_inconnu');
});
