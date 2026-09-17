// Tests unitaires : affichage de la recherche de domaine (aucun reseau).
//   node --test scripts/site-interface/domainSearchModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeAvailability, formatMoney, parseAvailabilityResponse, precheckDomainQuery, restrictionLabel, unknownResult,
  type DomainAvailabilityResult,
} from '../../src/lib/domainSearchModel.ts';

const ok = (result: Record<string, unknown>) => ({ ok: true, result });
const base = { alternatives: [], restricted: false, from_cache: false, checked_at: '2026-09-17T12:00:00Z', retry_after_seconds: null, client_price: null };

test('reponse serveur : seules les formes attendues sont acceptees', () => {
  assert.equal(parseAvailabilityResponse(401, {}).reason, 'unauthenticated');
  assert.equal(parseAvailabilityResponse(403, { ok: false, error: 'forbidden' }).reason, 'forbidden');
  assert.equal(parseAvailabilityResponse(500, { ok: false }).status, 'unknown');
  assert.equal(parseAvailabilityResponse(200, null).status, 'unknown');
  assert.equal(parseAvailabilityResponse(200, ok({ ...base, status: 'peut-etre', domain: 'a.com' })).status, 'unknown');
  assert.equal(parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: null })).status, 'unknown', 'disponible sans nom = invente');

  const parsed = parseAvailabilityResponse(200, ok({
    ...base, status: 'available', domain: 'mon-entreprise.com', reason: null,
    provider_price: { status: 'found', prices: [{ currency: 'ILS', first_year_cents: 3490, renewal_cents: 5990 }, { currency: 'ils', first_year_cents: -1, renewal_cents: 1 }] },
  }));
  assert.equal(parsed.status, 'available');
  assert.deepEqual(parsed.provider_price?.prices, [{ currency: 'ILS', first_year_cents: 3490, renewal_cents: 5990 }]);
  assert.equal(parsed.client_price, null);
});

test('Groupe/Societe : Disponible, jamais le cout Hostinger', () => {
  const result = parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'mon-entreprise.com' }));
  const view = describeAvailability(result, false);
  assert.equal(view.label, 'Disponible');
  assert.equal(view.tone, 'success');
  assert.equal(view.showBuyPlaceholder, true);
  assert.deepEqual(view.priceLines, ['Le prix vous sera indiqué ici avant tout achat.']);

  // Meme si un cout arrivait par erreur, il n'est pas affiche hors Talvex.
  const leaked: DomainAvailabilityResult = { ...result, provider_price: { status: 'found', prices: [{ currency: 'ILS', first_year_cents: 3490, renewal_cents: 5990 }] } };
  assert.ok(!describeAvailability(leaked, false).priceLines.join(' ').includes('34,90'));
});

test('Talvex : prix Hostinger reel separe du prix client', () => {
  const found = parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'mon-entreprise.com',
    provider_price: { status: 'found', prices: [{ currency: 'ILS', first_year_cents: 3490, renewal_cents: 5990 }] } }));
  const lines = describeAvailability(found, true).priceLines;
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Coût Talvex \(tarif Hostinger de l'extension \.com\) : 34,90\s₪ la 1re année, puis 59,90\s₪ \/ an$/);
  assert.match(lines[1], /à reconfirmer pour ce nom précis/);
  assert.equal(lines[2], 'Prix client : pas encore défini.');

  const same = parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'a-b.org',
    provider_price: { status: 'found', prices: [{ currency: 'USD', first_year_cents: 1599, renewal_cents: 1599 }] } }));
  assert.match(describeAvailability(same, true).priceLines[0], /^Coût Talvex \(tarif Hostinger de l'extension \.org\) : 15,99\s\$US \/ an$/);

  for (const status of ['not_found', 'ambiguous', 'unavailable']) {
    const r = parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'a-b.org', provider_price: { status, prices: [] } }));
    const text = describeAvailability(r, true).priceLines.join(' ');
    assert.doesNotMatch(text, /\d/, `aucun chiffre invente (${status})`);
  }
});

test('Indisponible (avec noms proches) et Impossible de verifier', () => {
  const taken = parseAvailabilityResponse(200, ok({ ...base, status: 'unavailable', domain: 'google.com', alternatives: ['google-shop.com', 42] }));
  const view = describeAvailability(taken, false);
  assert.equal(view.label, 'Indisponible');
  assert.deepEqual(view.alternatives, ['google-shop.com']);
  assert.equal(view.showBuyPlaceholder, false);
  assert.deepEqual(view.priceLines, []);

  for (const reason of ['provider_not_configured', 'provider_unavailable', 'timeout', 'network', 'forbidden']) {
    const v = describeAvailability(unknownResult(reason), true);
    assert.equal(v.label, 'Impossible de vérifier pour le moment.');
    assert.equal(v.showBuyPlaceholder, false);
    assert.deepEqual(v.priceLines, []);
  }
  const limited = describeAvailability({ ...unknownResult('rate_limited'), retry_after_seconds: 37 }, false);
  assert.match(String(limited.detail), /Trop de vérifications.*37 s/);
  const busy = describeAvailability({ ...unknownResult('busy'), retry_after_seconds: 12 }, false);
  assert.match(String(busy.detail), /Beaucoup de vérifications sont en cours.*12 s/);
  assert.equal(describeAvailability(unknownResult('provider_unavailable'), false).detail, 'Réessayez dans quelques instants.');
  assert.equal(describeAvailability({ ...unknownResult('provider_unavailable'), retry_after_seconds: 90 }, false).detail, 'Réessayez dans 90 s.');
  // Causes ou « reessayer » ne changerait rien : message honnete.
  assert.equal(describeAvailability(unknownResult('provider_not_configured'), false).detail, 'La vérification des noms de domaine sera bientôt disponible.');
  assert.match(String(describeAvailability(unknownResult('forbidden'), false).detail), /pas accès/);
  assert.match(String(describeAvailability(unknownResult('unauthenticated'), false).detail), /session a expiré/);
});

test('cas REELS constates : .co.il non vendu et restriction .fr', () => {
  // Hostinger repond « indisponible » pour un .co.il qu'il ne vend pas : jamais « deja utilise ».
  const coIl = describeAvailability(parseAvailabilityResponse(200, ok({ ...base, status: 'unavailable', domain: 'talvex-essai.co.il', alternatives: ['talvex-essai.io'] })), false);
  assert.equal(coIl.label, 'Indisponible');
  assert.equal(coIl.detail, 'Ce nom de domaine ne peut pas être enregistré.');
  assert.doesNotMatch(String(coIl.detail), /utilisé/);

  const fr = parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'talvex-essai.fr', restricted: true, restriction_note: 'requires_eu_residence',
    provider_price: { status: 'found', prices: [{ currency: 'EUR', first_year_cents: 699, renewal_cents: 1099 }] } }));
  const talvex = describeAvailability(fr, true);
  assert.match(String(talvex.detail), /réservé aux résidents de l'Union européenne/);
  assert.doesNotMatch(String(talvex.detail), /requires_eu_residence/);
  assert.match(talvex.priceLines[0], /^Coût Talvex \(tarif Hostinger de l'extension \.fr\) : 6,99\s€ la 1re année, puis 10,99\s€ \/ an$/);
  const client = describeAvailability({ ...fr, provider_price: undefined, restriction_note: undefined }, false);
  assert.equal(client.detail, "Cette extension a des conditions d'enregistrement particulières.");
  assert.deepEqual(client.priceLines, ['Le prix vous sera indiqué ici avant tout achat.']);
  assert.equal(restrictionLabel('code_inconnu'), 'code_inconnu');
});

test('nom invalide : messages simples', () => {
  const r = (reason: string) => describeAvailability({ ...unknownResult(reason), status: 'invalid', reason }, false);
  assert.match(String(r('unsupported_characters').detail), /accentuées/);
  assert.match(String(r('unsupported_extension').detail), /extension/);
  assert.match(String(r('invalid_domain').detail), /monentreprise\.com/);
});

test('aucun jargon fournisseur hors ligne de cout Talvex', () => {
  const jargon = /dns|cname|whois|registrar|api|token|vercel|supabase|company_id|http/i;
  const results: DomainAvailabilityResult[] = [
    parseAvailabilityResponse(200, ok({ ...base, status: 'available', domain: 'a-b.com', restricted: true })),
    parseAvailabilityResponse(200, ok({ ...base, status: 'unavailable', domain: 'a-b.com' })),
    unknownResult('rate_limited'),
    { ...unknownResult('invalid_domain'), status: 'invalid' },
  ];
  for (const result of results) {
    const v = describeAvailability(result, false);
    assert.doesNotMatch([v.label, v.detail ?? '', ...v.priceLines].join(' '), jargon);
    assert.doesNotMatch([v.label, v.detail ?? '', ...v.priceLines].join(' '), /hostinger/i, 'Groupe/Societe ne voient jamais le fournisseur');
  }
});

test('verification locale minimale et format monetaire', () => {
  assert.equal(precheckDomainQuery('   ').ok, false);
  assert.equal(precheckDomainQuery('monentreprise').ok, false);
  assert.deepEqual(precheckDomainQuery(' monentreprise.com '), { ok: true, value: 'monentreprise.com' });
  assert.match(formatMoney(5990, 'ILS'), /^59,90\s₪$/);
  assert.match(formatMoney(1234, 'EUR'), /^12,34\s€$/);
});
