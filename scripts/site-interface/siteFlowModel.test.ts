// Tests unitaires : parcours Site (Domaine -> Template -> Site) et connexion d'un domaine (aucun reseau).
//   node --test scripts/site-interface/siteFlowModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachMessage, autoRetryDelay, connectMessage, connectStepState, lookupFeedback, parseAttachResponse, parseConnectResponse,
  parseLookupResponse, precheckDomainInput, reachableSteps, resolveStep, siteFlowState,
} from '../../src/lib/siteFlowModel.ts';


test('etape deduite de l etat reel : aucun assistant quand tout est configure', () => {
  assert.equal(siteFlowState({ domain: null, hasTemplate: false }).step, 'domaine', 'pas de domaine');
  assert.equal(siteFlowState({ domain: null, hasTemplate: true }).step, 'domaine', 'template sans domaine : domaine d abord');
  assert.equal(siteFlowState({ domain: '', hasTemplate: true }).step, 'domaine', 'domaine vide = pas de domaine');
  assert.equal(siteFlowState({ domain: 'johanna.com', hasTemplate: false }).step, 'template', 'domaine sans template');
  const done = siteFlowState({ domain: 'johanna.com', hasTemplate: true });
  assert.deepEqual([done.step, done.hasDomain, done.hasTemplate, done.domain], ['site', true, true, 'johanna.com']);
});

test('site deja cree sans domaine : il reste accessible (regression a ne jamais reintroduire)', () => {
  // Cas reel : deux societes ont un site avec template et aucun domaine.
  const orphan = siteFlowState({ domain: null, hasTemplate: true });
  assert.deepEqual([orphan.step, orphan.hasDomain, orphan.hasTemplate], ['domaine', false, true]);
  assert.deepEqual(reachableSteps(orphan), ['domaine', 'template', 'site'], 'son site et ses templates restent atteignables');
  assert.equal(resolveStep(orphan, 'site'), 'site');
  assert.equal(resolveStep(orphan, 'template'), 'template');
  assert.equal(resolveStep(orphan, null), 'domaine', 'a l ouverture on propose quand meme de connecter le domaine');
});

test('navigation : on revient en arriere, jamais on ne saute une etape', () => {
  const empty = siteFlowState({ domain: null, hasTemplate: false });
  assert.deepEqual(reachableSteps(empty), ['domaine']);
  assert.equal(resolveStep(empty, 'site'), 'domaine', 'site jamais cree : rien a montrer');
  assert.equal(resolveStep(empty, 'site'), 'domaine', 'sans domaine, le site reste inaccessible');
  assert.equal(resolveStep(empty, 'template'), 'domaine');
  const withDomain = siteFlowState({ domain: 'johanna.com', hasTemplate: false });
  assert.deepEqual(reachableSteps(withDomain), ['domaine', 'template']);
  assert.equal(resolveStep(withDomain, 'domaine'), 'domaine', 'gerer son domaine reste possible');
  const full = siteFlowState({ domain: 'johanna.com', hasTemplate: true });
  assert.deepEqual(reachableSteps(full), ['domaine', 'template', 'site']);
  assert.equal(resolveStep(full, null), 'site', 'retour plus tard : directement le site');
  assert.equal(resolveStep(full, 'template'), 'template', 'changer de template reste possible');
});

test('saisie du domaine : nettoyage et refus du nom incomplet', () => {
  assert.deepEqual(precheckDomainInput('  HTTPS://WWW.Johanna.com/accueil '), { ok: true, value: 'johanna.com' });
  assert.deepEqual(precheckDomainInput('beauty-tlv.co.il'), { ok: true, value: 'beauty-tlv.co.il' });
  assert.equal(precheckDomainInput('').ok, false);
  assert.equal(precheckDomainInput('johanna').ok, false, 'un nom sans extension n est pas un domaine');
  assert.equal(precheckDomainInput('johanna .com').ok, false);
});

test('verdict serveur : jamais de detail sur une autre entreprise', () => {
  const ok = (result: Record<string, unknown>) => ({ ok: true, result });
  const found = parseLookupResponse(200, ok({ status: 'available', domain: 'johanna.com', expires_at: '2027-09-17T00:00:00Z' }), 'johanna.com');
  assert.deepEqual([found.status, found.domain, found.expiresAt], ['available', 'johanna.com', '2027-09-17T00:00:00Z']);
  assert.equal(lookupFeedback(found).canChoose, true);

  const taken = parseLookupResponse(200, ok({ status: 'taken', domain: 'johanna.com' }), 'johanna.com');
  const takenView = lookupFeedback(taken);
  assert.equal(takenView.canChoose, false);
  assert.match(takenView.title, /déjà utilisé/);
  assert.doesNotMatch(JSON.stringify([taken, takenView]), /company|societe|société|groupe|owner|entreprise/i, 'aucune trace du proprietaire');

  assert.equal(lookupFeedback(parseLookupResponse(200, ok({ status: 'not_found' }), 'x.com')).canChoose, false);
  assert.equal(parseLookupResponse(401, null, 'x.com').status, 'unavailable');
  assert.equal(parseLookupResponse(403, null, 'x.com').reason, 'forbidden');
  assert.equal(parseLookupResponse(200, ok({ status: 'n importe quoi' }), 'x.com').status, 'unavailable');
  assert.equal(parseLookupResponse(500, {}, 'x.com').status, 'unavailable');
  assert.equal(lookupFeedback(parseLookupResponse(200, ok({ status: 'already_yours' }), 'x.com')).canChoose, false);
});

test('association : messages clairs, aucune promesse fausse', () => {
  const ok = (result: Record<string, unknown>) => ({ ok: true, result });
  const attached = parseAttachResponse(200, ok({ status: 'attached', domain: 'johanna.com' }), 'johanna.com');
  assert.deepEqual([attached.status, attachMessage(attached).tone], ['attached', 'success']);
  assert.match(attachMessage(attached).text, /johanna\.com/);
  assert.equal(parseAttachResponse(200, ok({ status: 'taken' }), 'johanna.com').status, 'taken');
  assert.equal(attachMessage(parseAttachResponse(200, ok({ status: 'taken' }), 'johanna.com')).tone, 'danger');
  assert.equal(parseAttachResponse(200, ok({ status: 'inconnu' }), 'johanna.com').status, 'unavailable');
  assert.equal(parseAttachResponse(500, null, 'johanna.com').status, 'unavailable');
  const busy = parseAttachResponse(200, ok({ status: 'unavailable', reason: 'rate_limited', retry_after_seconds: 30 }), 'johanna.com');
  assert.match(attachMessage(busy).text, /30 s/);
});

test('raccordement : avancement lisible, jamais « connecte » sans confirmation du serveur', () => {
  const ok = (result: Record<string, unknown>) => ({ ok: true, result });
  const done = parseConnectResponse(200, ok({ status: 'ok', step: 'done', connection_status: 'active', message: 'Domaine connecte.' }));
  assert.deepEqual([done.status, done.step, done.connectionStatus], ['ok', 'done', 'active']);
  assert.equal(connectMessage(done).tone, 'success');
  assert.match(connectMessage(done).text, /en ligne/);

  const pending = parseConnectResponse(200, ok({ status: 'pending', step: 'verify', connection_status: 'verifying', message: 'Verification en cours.' }));
  assert.equal(connectMessage(pending).canRetry, true);
  assert.equal(connectStepState('dns', pending.step, pending.status), 'done', 'les etapes franchies restent cochees');
  assert.equal(connectStepState('verify', pending.step, pending.status), 'current');
  assert.equal(connectStepState('https', pending.step, pending.status), 'todo');

  const blocked = parseConnectResponse(200, ok({ status: 'blocked', step: 'dns', connection_status: 'dns_failed', reason: 'dns_conflict', message: 'Un enregistrement bloque.' }));
  assert.equal(connectStepState('dns', blocked.step, blocked.status), 'failed');
  assert.equal(connectMessage(blocked).canRetry, false);

  const disabled = parseConnectResponse(200, ok({ status: 'blocked', step: 'dns', connection_status: 'not_started', reason: 'connect_disabled' }));
  assert.match(connectMessage(disabled).text, /bien associé/);

  assert.equal(parseConnectResponse(500, null).status, 'unavailable');
  assert.equal(parseConnectResponse(200, ok({ status: 'n importe quoi' })).status, 'unavailable');
  assert.equal(parseConnectResponse(403, null).reason, 'forbidden');
});

/* ---------- Reconnexion : refus temporaire du serveur (bug du 18/09/2026) ---------- */

const refusTemporaire = { ok: true, result: { status: 'unavailable', step: 'attach', connection_status: 'not_started', reason: 'rate_limited', retry_after_seconds: 37 } };

test('raccordement refuse temporairement : le delai annonce par le serveur est conserve', () => {
  const p = parseConnectResponse(200, refusTemporaire);
  assert.equal(p.retryAfterSeconds, 37, 'avant le correctif, ce delai etait jete');
  assert.equal(autoRetryDelay(p), 37);
  // Delai absent, trop long, ou autre raison : pas de reprise automatique.
  assert.equal(autoRetryDelay(parseConnectResponse(200, { ok: true, result: { ...refusTemporaire.result, retry_after_seconds: 3600 } })), null);
  assert.equal(autoRetryDelay(parseConnectResponse(200, { ok: true, result: { ...refusTemporaire.result, reason: 'provider_unavailable' } })), null);
  assert.equal(autoRetryDelay(parseConnectResponse(200, { ok: true, result: { status: 'ok', step: 'done' } })), null);
});

test('raccordement refuse temporairement : jamais un « Réessayez » dans le vide', () => {
  const p = parseConnectResponse(200, refusTemporaire);
  const auto = connectMessage(p, true);
  assert.match(auto.text, /reprise automatique dans 37 s/i);
  assert.equal(auto.canRetry, false, 'la reprise se fait seule : pas de bouton qui ferait double emploi');
  const manuel = connectMessage(p, false);
  assert.match(manuel.text, /Réessayez dans 37 s/);
  assert.equal(manuel.canRetry, true);
  assert.doesNotMatch(auto.text + manuel.text, /quota|Hostinger|Vercel|DNS/i, 'aucun jargon pour le client');
});
