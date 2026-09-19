// Tests de « Mes domaines enregistres » (module pur, aucun reseau).
//   node --test scripts/site-interface/siteDomainListModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COPIED_MS, copyAnnouncement, copyLabel, hideAllConfirm, hideAllMessage, hideConfirm, hideMessage, hideableCount, liveBadge,
  parseRegisteredDomains, toHideAllOutcome, toHideOutcome, type CurrentDomain,
} from '../../src/lib/siteDomainListModel.ts';
import { summarizeSiteDomain } from '../../src/lib/siteWorkspaceModel.ts';
import type { SiteDomainRecord } from '../../src/lib/siteDomainTypes.ts';

const row = (domain_name: string, over: Record<string, unknown> = {}) => ({
  domain_name, is_active: false, is_live: false, connection_status: 'disconnected', registration_status: 'released',
  last_registered_at: '2026-09-18T10:00:00Z', ...over,
});
const ACTIVE = row('barbiewellness.com', { is_active: true, is_live: true, connection_status: 'active', registration_status: 'external' });
const RELEASED = row('rgpd-solutions.fr');
const current = (domain: string | null, over: Partial<CurrentDomain> = {}): CurrentDomain =>
  ({ domain, state: 'active', label: 'Actif', tone: 'success', ...over });

test('le domaine actif porte le badge « Actif » et ne peut pas etre retire', () => {
  const [active, released] = parseRegisteredDomains([ACTIVE, RELEASED]);
  assert.deepEqual(active, { name: 'barbiewellness.com', active: true, live: true, canHide: false, badge: { label: 'Actif', tone: 'success' } });
  assert.deepEqual(released, { name: 'rgpd-solutions.fr', active: false, live: false, canHide: true, badge: null });
});

test('un domaine en service non actif reste protege (aucun « Supprimer »)', () => {
  const [live] = parseRegisteredDomains([row('nouveau.fr', { is_live: true, connection_status: 'verifying', registration_status: 'external' })]);
  assert.equal(live.canHide, false);
  assert.deepEqual(live.badge, { label: 'Mise en service à terminer', tone: 'warning' });
});

test('badges des domaines en service : memes libelles que le panneau, mot pour mot', () => {
  const registrations = ['registered', 'external', 'pending', 'expired', 'suspended', 'transfer_out'];
  const connections = ['not_started', 'dns_configuring', 'verifying', 'active', 'dns_failed', 'verification_failed', 'disconnected'];
  for (const registration_status of registrations) {
    for (const connection_status of connections) {
      const panel = summarizeSiteDomain({
        domain_name: 'a.fr', registration_status, connection_status, expires_at: null, renewal_due: false,
      } as unknown as SiteDomainRecord);
      assert.deepEqual(liveBadge(registration_status, connection_status), { label: panel.label, tone: panel.tone },
        `${registration_status} / ${connection_status}`);
    }
  }
});

test('le domaine du panneau est toujours en tete, protege, avec exactement l etat du panneau', () => {
  // Present dans la liste mais seulement en ligne liberee (ancien outil) : il devient protege.
  const list = parseRegisteredDomains([RELEASED, row('derlumeo.com')], current('Derlumeo.com', { state: 'attention', label: 'Non relié', tone: 'danger' }));
  assert.deepEqual(list[0], { name: 'derlumeo.com', active: false, live: true, canHide: false, badge: { label: 'Non relié', tone: 'danger' } });
  assert.equal(list.length, 2);
  // Absent de la liste (domaine rattache par l'ancien outil) : il est ajoute en tete.
  const added = parseRegisteredDomains([RELEASED], current('ancien.fr'));
  assert.deepEqual(added.map(d => [d.name, d.badge?.label, d.canHide]), [['ancien.fr', 'Actif', false], ['rgpd-solutions.fr', undefined, true]]);
  // Aucun domaine au panneau : rien n'est ajoute.
  assert.equal(parseRegisteredDomains([RELEASED], current(null, { state: 'none' })).length, 1);
  assert.equal(parseRegisteredDomains([RELEASED], current('x.fr', { state: 'none' })).length, 1);
});

test('ordre : domaine du panneau, puis actifs, puis en service, puis les autres dans l ordre du serveur', () => {
  const list = parseRegisteredDomains([RELEASED, row('b.fr'), ACTIVE, row('c.fr', { is_live: true, registration_status: 'external' })]);
  assert.deepEqual(list.map(d => d.name), ['barbiewellness.com', 'c.fr', 'rgpd-solutions.fr', 'b.fr']);
  const pinned = parseRegisteredDomains([ACTIVE, row('c.fr', { is_live: true, registration_status: 'external' })], current('c.fr', { state: 'pending', label: 'Transfert en cours', tone: 'warning' }));
  assert.deepEqual(pinned.map(d => d.name), ['c.fr', 'barbiewellness.com']);
});

test('lignes invalides ignorees, doublons fusionnes, noms normalises', () => {
  const list = parseRegisteredDomains([null, 42, {}, { domain_name: '  ' }, row(' Exemple.FR '), row('exemple.fr')]);
  assert.deepEqual(list.map(d => d.name), ['exemple.fr']);
  assert.deepEqual(parseRegisteredDomains(null), []);
  assert.deepEqual(parseRegisteredDomains({ domain_name: 'a.fr' }), []);
});

test('« Tout supprimer » ne compte jamais un domaine en service ni le domaine du panneau', () => {
  assert.equal(hideableCount(parseRegisteredDomains([ACTIVE])), 0);
  assert.equal(hideableCount(parseRegisteredDomains([ACTIVE, RELEASED, row('b.fr')])), 2);
  assert.equal(hideableCount(parseRegisteredDomains([RELEASED, row('b.fr')], current('b.fr'))), 1);
  assert.equal(hideableCount([]), 0);
});

test('chaque confirmation dit que le domaine n est pas deconnecte', () => {
  const one = hideConfirm('rgpd-solutions.fr');
  assert.equal(one.title, 'Retirer rgpd-solutions.fr de la liste ?');
  assert.match(one.text, /n'est pas déconnecté/);
  assert.match(one.text, /reste votre propriété/);
  const all = hideAllConfirm(parseRegisteredDomains([ACTIVE, RELEASED, row('b.fr')]));
  assert.equal(all.title, 'Retirer 2 domaines de la liste ?');
  assert.match(all.text, /^Votre domaine en service reste affiché\. /);
  assert.match(all.text, /Aucun domaine n'est déconnecté/);
  const single = hideAllConfirm(parseRegisteredDomains([RELEASED]));
  assert.equal(single.title, 'Retirer 1 domaine de la liste ?');
  assert.doesNotMatch(single.text, /en service/);
});

test('resultats du masquage : texte clair, jamais de jargon technique', () => {
  assert.deepEqual(hideMessage('hidden', 'a.fr'), { tone: 'success', text: "a.fr a été retiré de la liste. Il n'est pas déconnecté." });
  assert.equal(hideMessage('active', 'a.fr').tone, 'neutral');
  assert.equal(hideMessage('forbidden', 'a.fr').text, "Vous n'avez pas accès à cette entreprise.");
  assert.equal(hideMessage('error', 'a.fr').tone, 'danger');
  for (const outcome of ['hidden', 'active', 'not_found', 'invalid', 'forbidden', 'error'] as const) {
    assert.doesNotMatch(hideMessage(outcome, 'a.fr').text, /DNS|Hostinger|Vercel|registrar|h[ée]bergeur/i);
  }
});

test('reponse serveur inconnue = erreur (jamais un faux succes)', () => {
  assert.equal(toHideOutcome('hidden'), 'hidden');
  assert.equal(toHideOutcome('active'), 'active');
  assert.equal(toHideOutcome('deleted'), 'error');
  assert.equal(toHideOutcome(null), 'error');
  assert.equal(toHideOutcome(1), 'error');
});

test('« Tout supprimer » : refus d acces distinct de « rien a retirer »', () => {
  assert.equal(toHideAllOutcome(null), 'forbidden');
  assert.equal(toHideAllOutcome(0), 0);
  assert.equal(toHideAllOutcome(3), 3);
  assert.equal(toHideAllOutcome(-1), 'error');
  assert.equal(toHideAllOutcome('2'), 'error');
  assert.equal(toHideAllOutcome(undefined), 'error');
  assert.equal(hideAllMessage('forbidden').text, "Vous n'avez pas accès à cette entreprise.");
  assert.equal(hideAllMessage(0).text, 'Aucun domaine à retirer : un domaine en service reste toujours affiché.');
  assert.equal(hideAllMessage(1).text, '1 domaine retiré de la liste. Aucun n\'a été déconnecté.');
  assert.equal(hideAllMessage(3).text, '3 domaines retirés de la liste. Aucun n\'a été déconnecté.');
  assert.equal(hideAllMessage('error').tone, 'danger');
});

test('bouton Copier : « Copié » environ 2 secondes, succes comme echec annonces', () => {
  assert.equal(COPIED_MS, 2000);
  assert.equal(copyLabel('idle'), 'Copier');
  assert.equal(copyLabel('copied'), 'Copié');
  assert.equal(copyLabel('failed'), 'Copie impossible');
  assert.equal(copyAnnouncement('a.fr', true), 'a.fr copié.');
  assert.equal(copyAnnouncement('a.fr', false), 'Copie impossible de a.fr.');
});
