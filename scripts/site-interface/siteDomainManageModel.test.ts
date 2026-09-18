// Tests du modele « changer de domaine / deconnecter » (module pur, aucun reseau).
//   node --test scripts/site-interface/siteDomainManageModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCONNECT_CONFIRM, DOMAIN_STEPS, SWITCH_STEPS, disconnectMessage, domainStepState, parseDisconnectResponse,
  parseSwitchResponse, retryHint, switchMessage, switchPhase, type SwitchProgress,
} from '../../src/lib/siteDomainManageModel.ts';

const ok = (result: Record<string, unknown>) => ({ ok: true, result });

test('etapes montrees au client : les libelles demandes, sans jargon', () => {
  // Ajouter un domaine : quatre etapes.
  assert.deepEqual(DOMAIN_STEPS.map(s => s.label), ['Préparation du domaine', 'Connexion', 'Sécurisation', 'Terminé']);
  // Changer de domaine : une etape de plus, la bascule.
  assert.deepEqual(SWITCH_STEPS.map(s => s.label),
    ['Préparation du nouveau domaine', 'Connexion', 'Sécurisation', 'Activation', 'Terminé']);
  const texte = JSON.stringify([...DOMAIN_STEPS, ...SWITCH_STEPS].map(s => s.label));
  assert.doesNotMatch(texte, /DNS|Vercel|Hostinger|h[ée]bergeur|HTTPS|SSL|certificat|CNAME|IP\b/i);
});

test('changement : la bascule a son etape « Activation », jamais cochee avant l\'heure', () => {
  // Le nouveau domaine repond, il reste la bascule : « Activation » est l'etape en cours.
  const bascule = parseSwitchResponse(200, ok({ status: 'unavailable', step: 'promote', domain: 'nouvelle.fr', previous_domain: 'ancienne.fr' }), 'nouvelle.fr');
  assert.equal(switchPhase(bascule), 'activate');
  assert.equal(domainStepState(2, switchPhase(bascule), bascule.status, SWITCH_STEPS), 'done', 'la securisation est franchie');
  assert.equal(domainStepState(3, switchPhase(bascule), bascule.status, SWITCH_STEPS), 'failed', 'la bascule a echoue, cela se voit');
  assert.equal(domainStepState(4, switchPhase(bascule), bascule.status, SWITCH_STEPS), 'todo');

  // Pendant la preparation, « Activation » ne peut pas etre cochee.
  const enCours = parseSwitchResponse(200, ok({ status: 'pending', step: 'connect', connect_step: 'https', domain: 'nouvelle.fr' }), 'nouvelle.fr');
  assert.equal(domainStepState(3, switchPhase(enCours), enCours.status, SWITCH_STEPS), 'todo');

  // Termine : les cinq etapes sont cochees.
  const fini = parseSwitchResponse(200, ok({ status: 'ok', step: 'done', domain: 'nouvelle.fr', previous_state: 'detached' }), 'nouvelle.fr');
  for (const index of [0, 1, 2, 3, 4]) assert.equal(domainStepState(index, switchPhase(fini), fini.status, SWITCH_STEPS), 'done');
});

test('avancement : une etape franchie reste cochee, l\'etape en cours tourne, un echec est visible', () => {
  // Raccordement en cours de verification : « Connexion » est l'etape courante.
  assert.equal(domainStepState(0, 'verify', 'pending'), 'done');
  assert.equal(domainStepState(1, 'verify', 'pending'), 'current');
  assert.equal(domainStepState(2, 'verify', 'pending'), 'todo');
  // Certificat en cours.
  assert.equal(domainStepState(1, 'https', 'pending'), 'done');
  assert.equal(domainStepState(2, 'https', 'pending'), 'current');
  // Termine : tout est coche.
  for (const index of [0, 1, 2, 3]) assert.equal(domainStepState(index, 'done', 'ok'), 'done');
  // Echec pendant la connexion.
  assert.equal(domainStepState(1, 'dns', 'blocked'), 'failed');
  assert.equal(domainStepState(1, 'dns', 'unavailable'), 'failed');
});

test('changement : lecture de la reponse du serveur, toute forme inattendue devient « impossible »', () => {
  const good = parseSwitchResponse(200, ok({
    status: 'ok', step: 'done', domain: 'nouvelle.fr', previous_domain: 'ancienne.fr',
    previous_state: 'detached', message: 'nouvelle.fr est maintenant l\'adresse de votre site.',
  }), 'nouvelle.fr');
  assert.deepEqual([good.status, good.step, good.previousState], ['ok', 'done', 'detached']);
  assert.equal(good.previousDomain, 'ancienne.fr');

  for (const [status, body] of [[401, null], [403, null], [500, null], [200, { ok: false }], [200, ok({ status: 'bizarre' })]] as const) {
    const parsed = parseSwitchResponse(status as number, body, 'nouvelle.fr');
    assert.equal(parsed.status, 'unavailable', 'aucune reponse douteuse ne passe pour un succes');
  }
  // Un etat d'ancien domaine inconnu est ignore plutot que recopie tel quel.
  const odd = parseSwitchResponse(200, ok({ status: 'ok', step: 'done', previous_state: 'n_importe_quoi' }), 'nouvelle.fr');
  assert.equal(odd.previousState, null);
});

test('changement : tant que le nouveau domaine n\'est pas pret, le client est rassure sur l\'ancien', () => {
  const pending = parseSwitchResponse(200, ok({
    status: 'pending', step: 'connect', domain: 'nouvelle.fr', previous_domain: 'ancienne.fr',
    previous_state: 'kept', connect_step: 'https', reason: 'https_pending',
  }), 'nouvelle.fr');
  const message = switchMessage(pending);
  assert.equal(message.canRetry, true);
  assert.match(message.text, /ancienne\.fr/);
  assert.equal(switchPhase(pending), 'https', 'la sous-etape affichee vient du serveur');
  // Sans sous-etape connue, on n'anticipe pas : l'ecran reste sur « Connexion », jamais coche d'avance.
  const flou = parseSwitchResponse(200, ok({ status: 'pending', step: 'connect', domain: 'nouvelle.fr' }), 'nouvelle.fr');
  assert.equal(switchPhase(flou), 'dns');
  assert.equal(domainStepState(2, switchPhase(flou), 'pending'), 'todo', '« Activation HTTPS » ne peut pas etre cochee avant l\'heure');
});

test('changement reussi mais ancien domaine conserve : c\'est dit clairement, sans alarmer', () => {
  const kept: SwitchProgress = {
    status: 'ok', step: 'release', domain: 'nouvelle.fr', previousDomain: 'ancienne.fr', previousState: 'kept', connectStep: null,
    reason: 'dns_conflict', message: 'nouvelle.fr est maintenant l\'adresse de votre site. L\'ancienne adresse ancienne.fr n\'a pas pu etre detachee automatiquement et continue de fonctionner.',
  };
  const message = switchMessage(kept);
  assert.equal(message.tone, 'warning');
  assert.match(message.text, /nouvelle\.fr/);
  assert.match(message.text, /ancienne\.fr/);
  assert.equal(switchPhase(kept), 'done');
});

test('changement refuse : un domaine deja pris ne dit jamais par qui', () => {
  const taken = parseSwitchResponse(200, ok({ status: 'blocked', step: 'connect', reason: 'taken', message: 'Ce domaine est deja utilise.' }), 'pris.com');
  const message = switchMessage(taken);
  assert.equal(message.tone, 'danger');
  assert.equal(message.text, 'Ce domaine est déjà utilisé. Choisissez un autre domaine.');
  assert.doesNotMatch(message.text, /soci[ée]t[ée]|groupe|entreprise|appartient/i);
});

test('deconnexion : succes, et ce qui compte pour le client est rappele', () => {
  const result = parseDisconnectResponse(200, ok({ status: 'ok', step: 'done', message: 'Domaine deconnecte.' }));
  assert.deepEqual([result.status, result.step], ['ok', 'done']);
  const message = disconnectMessage(result);
  assert.equal(message.tone, 'success');
  assert.match(message.text, /propri[ée]t[ée]/i);
  assert.match(message.text, /e-mails?/i);
});

test('deconnexion : configuration modifiee a la main -> on ne force rien, message clair', () => {
  const result = parseDisconnectResponse(200, ok({ status: 'blocked', step: 'dns', reason: 'dns_conflict' }));
  const message = disconnectMessage(result);
  assert.equal(message.canRetry, false, 'reessayer ne reglerait rien : il faut une decision humaine');
  assert.match(message.text, /modifi[ée]e en dehors de Talvex/i);
  assert.doesNotMatch(message.text, /DNS|CNAME|enregistrement A/i);
});

test('deconnexion : verification de securite echouee -> on alerte, on ne propose pas de reessayer', () => {
  const result = parseDisconnectResponse(200, ok({ status: 'blocked', step: 'verify', reason: 'records_missing' }));
  const message = disconnectMessage(result);
  assert.equal(message.tone, 'danger');
  assert.equal(message.canRetry, false);
  assert.match(message.text, /[ée]quipe Talvex/i);
});

test('deconnexion : panne passagere -> on peut reessayer', () => {
  for (const body of [null, ok({ status: 'unavailable', step: 'vercel', reason: 'timeout' })]) {
    const result = parseDisconnectResponse(body === null ? 500 : 200, body);
    assert.equal(disconnectMessage(result).canRetry, true);
  }
  assert.equal(parseDisconnectResponse(401, null).reason, 'unauthenticated');
  assert.match(disconnectMessage(parseDisconnectResponse(401, null)).text, /session a expiré\. Reconnectez-vous/);
});

test('confirmation avant deconnexion : dit ce qui ne change pas, sans un mot de technique', () => {
  assert.equal(DISCONNECT_CONFIRM.title, 'Déconnecter ce domaine ?');
  const texte = DISCONNECT_CONFIRM.points.join(' ');
  assert.match(texte, /site et vos réglages seront conservés/i);
  assert.match(texte, /seule l’adresse personnalisée sera déconnectée/i);
  assert.match(texte, /propri[ée]t[ée]/i);
  assert.match(texte, /e-mail/i);
  // Jamais de restauration ni de configuration technique annoncee au client.
  assert.doesNotMatch(texte, /DNS|restaur|CNAME|Vercel|Hostinger|enregistrement/i);
  assert.equal(DISCONNECT_CONFIRM.confirm, 'Déconnecter');
  assert.equal(DISCONNECT_CONFIRM.cancel, 'Annuler');
});

test('erreurs : des phrases simples, identiques a celles demandees', async () => {
  const { connectMessage, parseConnectResponse, lookupFeedback, parseLookupResponse } = await import('../../src/lib/siteFlowModel.ts');

  // Connexion impossible (ajout comme changement).
  const ajoutKo = connectMessage(parseConnectResponse(200, ok({ status: 'unavailable', step: 'dns', connection_status: 'dns_failed', reason: 'timeout' })));
  assert.equal(ajoutKo.text, 'Impossible de connecter le domaine pour le moment. Réessayez.');
  const changeKo = switchMessage(parseSwitchResponse(200, ok({ status: 'unavailable', step: 'connect', reason: 'timeout', domain: 'nouvelle.fr' }), 'nouvelle.fr'));
  assert.match(changeKo.text, /^Impossible de connecter le domaine pour le moment\. Réessayez\./);

  // Deconnexion impossible.
  const decoKo = disconnectMessage(parseDisconnectResponse(200, ok({ status: 'unavailable', step: 'dns', reason: 'timeout' })));
  assert.equal(decoKo.text, 'Impossible de déconnecter le domaine pour le moment. Réessayez.');

  // Domaine absent du portefeuille / deja utilise : les deux verdicts demandes, sans jamais nommer autrui.
  const introuvable = lookupFeedback(parseLookupResponse(200, ok({ status: 'not_found', domain: 'inconnu.fr' }), 'inconnu.fr'));
  assert.equal(introuvable.title, 'Domaine introuvable');
  const pris = lookupFeedback(parseLookupResponse(200, ok({ status: 'taken', domain: 'pris.fr' }), 'pris.fr'));
  assert.equal(pris.title, 'Ce domaine est déjà utilisé');
  assert.equal(pris.canChoose, false);
  assert.doesNotMatch(pris.title + ' ' + pris.hint, /soci[ée]t[ée]|groupe|appartient|propri[ée]taire/i);
});

test('anti-derive : la phrase d\'attente est mot pour mot celle du parcours d\'ajout', async () => {
  const { connectRetryText } = await import('../../src/lib/siteFlowModel.ts');
  for (const reason of ['unauthenticated', 'forbidden', 'rate_limited', 'busy', 'provider_not_configured', 'timeout', null]) {
    assert.equal(retryHint(reason), connectRetryText(reason, null), `divergence de message pour « ${reason} »`);
  }
});

test('aucun texte du serveur n\'arrive tel quel sous les yeux du client', async () => {
  const { connectMessage, parseConnectResponse } = await import('../../src/lib/siteFlowModel.ts');
  // Messages reellement produits par le serveur en cas de conflit : ils nomment le fournisseur.
  const bruts = [
    'Vercel ne prend pas en charge l\'IPv6 : cet enregistrement doit etre retire a la main.',
    'Un CNAME a la racine empeche les autres enregistrements (RFC 1034).',
    'Les CAA existants n\'autorisent pas Let\'s Encrypt : le certificat sera refuse.',
    'L\'hebergeur a renvoye des valeurs generiques, pas celles de ce projet.',
  ];
  const interdit = /vercel|hostinger|CNAME|IPv6|CAA|RFC|enregistrement|DNS|zone/i;

  for (const message of bruts) {
    const change = switchMessage(parseSwitchResponse(200, ok({
      status: 'blocked', step: 'connect', reason: 'dns_conflict', domain: 'nouvelle.fr',
      previous_domain: 'ancienne.fr', message,
    }), 'nouvelle.fr'));
    assert.doesNotMatch(change.text, interdit, `changement : « ${message} » ne doit pas etre repris`);
    assert.match(change.text, /Talvex/);

    const ajout = connectMessage(parseConnectResponse(200, ok({
      status: 'blocked', step: 'dns', connection_status: 'dns_failed', reason: 'dns_conflict', message,
    })));
    assert.doesNotMatch(ajout.text, interdit, `raccordement : « ${message} » ne doit pas etre repris`);
  }

  // Un message serveur inattendu (raison inconnue) n'est pas affiche non plus.
  const inconnu = switchMessage(parseSwitchResponse(200, ok({
    status: 'unavailable', step: 'connect', reason: 'bad_response', domain: 'nouvelle.fr',
    previous_domain: 'ancienne.fr', message: 'La zone DNS n\'a pas la forme attendue.',
  }), 'nouvelle.fr'));
  assert.doesNotMatch(inconnu.text, interdit);
  assert.match(inconnu.text, /ancienne\.fr/, 'le client est rassure sur son adresse actuelle');
});

test('changement : ancienne adresse deja coupee -> message honnete, jamais « continue de fonctionner »', () => {
  const partiel = parseSwitchResponse(200, ok({
    status: 'ok', step: 'release', domain: 'nouvelle.fr', previous_domain: 'ancienne.fr', previous_state: 'partial',
  }), 'nouvelle.fr');
  assert.equal(partiel.previousState, 'partial');
  const message = switchMessage(partiel);
  assert.equal(message.tone, 'warning');
  assert.doesNotMatch(message.text, /continue de fonctionner/i);
  assert.match(message.text, /ne m[eè]ne plus au site/i);
});
