/**
 * CE QU'UNE ERREUR DE L'API ADMIN DOIT DEVENIR A L'ECRAN.
 * Lancer :  node --test supabase/functions/update-company-super-admin/messageErreurAuth.test.ts
 *
 * ---------- POURQUOI CE FICHIER EXISTE ----------
 *
 * Le 23 octobre 2026, modifier l'email d'un Groupe deja pris affichait
 * « Error updating user » dans une interface francaise. Ce test interdit le retour de
 * ce defaut : il verifie qu'un conflit d'unicite rend la phrase exacte demandee par
 * David, et que le motif reel — vu dans les journaux Auth de production — est bien
 * reconnu.
 *
 * ---------- LE MODULE EXISTE EN DEUX COPIES, ET C'EST TESTE ----------
 *
 * Les Edge Functions tournent en Deno et ne peuvent pas importer depuis `src/`. Le
 * module est donc duplique dans les deux dossiers de fonction, et la derniere section
 * compare les deux fichiers par empreinte : une divergence rend ce test ROUGE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reponseErreurAuth, EMAIL_DEJA_PRIS } from './messageErreurAuth.ts';

test('LE MOTIF REEL DE LA PRODUCTION est reconnu, mot pour mot', () => {
  /*
   * Ce texte n'est pas invente : c'est le message releve dans les journaux Auth du
   * projet, le 23 octobre 2026 a 02:09:51, sur le PUT /admin/users du Groupe.
   */
  const reel = 'ERROR: duplicate key value violates unique constraint '
    + '"users_email_partial_key" (SQLSTATE 23505)';
  const r = reponseErreurAuth(reel);

  assert.equal(r.message, 'Cet email est déjà utilisé par un autre compte.');
  assert.equal(r.statut, 409, 'un conflit est un 409, pas un 500');
  assert.equal(r.saisieACorriger, true);
  /* Et surtout : le jargon ne doit PAS atteindre l'utilisateur. */
  assert.ok(!/SQLSTATE|duplicate key|users_email_partial_key/.test(r.message));
});

test('les quatre ecritures d un email deja pris menent au MEME mot', () => {
  const formes = [
    'ERROR: duplicate key value violates unique constraint "users_email_partial_key" (SQLSTATE 23505)',
    'duplicate key value violates unique constraint',
    'A user with this email address has already been registered',
    'email address already in use',
    'email_exists',
    'Database error: 23505',
  ];
  for (const f of formes) {
    const r = reponseErreurAuth(f);
    assert.equal(r.message, EMAIL_DEJA_PRIS, `forme non reconnue : ${f}`);
    assert.equal(r.statut, 409, `statut errone pour : ${f}`);
    assert.equal(r.saisieACorriger, true);
  }
});

test('la reconnaissance est insensible a la casse', () => {
  assert.equal(reponseErreurAuth('USERS_EMAIL_PARTIAL_KEY').message, EMAIL_DEJA_PRIS);
  assert.equal(reponseErreurAuth('Already Been Registered').message, EMAIL_DEJA_PRIS);
});

test('« Error updating user » est une PANNE, pas un conflit — et son texte est conserve', () => {
  /*
   * Le message generique de GoTrue ne dit rien de la cause. On ne doit donc PAS le
   * traduire en « email deja pris » : ce serait inventer un diagnostic. Mais on
   * l'encadre, pour qu'une phrase anglaise brute ne soit plus le seul texte visible.
   */
  const r = reponseErreurAuth('Error updating user');
  assert.notEqual(r.message, EMAIL_DEJA_PRIS, 'ne jamais deviner la cause');
  assert.equal(r.statut, 500);
  assert.equal(r.saisieACorriger, false);
  assert.ok(r.message.startsWith('L’enregistrement a échoué'), 'la phrase doit etre francaise');
  assert.ok(r.message.includes('Error updating user'), 'le message d origine reste lisible');
});

test('un email refuse pour sa FORME est une saisie a corriger, pas une panne', () => {
  for (const f of ['Unable to validate email address: invalid format', 'validation_failed']) {
    const r = reponseErreurAuth(f);
    assert.equal(r.statut, 400, `statut errone pour : ${f}`);
    assert.equal(r.saisieACorriger, true);
    assert.notEqual(r.message, EMAIL_DEJA_PRIS);
  }
});

test('une erreur VIDE ne produit ni message vide ni « undefined »', () => {
  for (const v of [null, undefined, '', '   ']) {
    const r = reponseErreurAuth(v);
    assert.ok(r.message.length > 10, 'un message doit rester lisible');
    assert.ok(!/undefined|null/.test(r.message));
    assert.equal(r.statut, 500);
    assert.equal(r.saisieACorriger, false);
  }
});

test('aucun message ne part en anglais nu : tous commencent par du francais', () => {
  const cas = ['users_email_partial_key', 'Error updating user', 'invalid email', ''];
  for (const c of cas) {
    const r = reponseErreurAuth(c);
    assert.match(
      r.message,
      /^(Cet email|L’enregistrement|L'enregistrement)/,
      `message non francais pour : ${c}`,
    );
  }
});

test('LES DEUX COPIES DU MODULE SONT IDENTIQUES, prouve par empreinte', () => {
  /*
   * Deux Edge Functions ecrivent un email, et chacune porte sa copie du module. Si
   * elles divergent, la meme situation se dit de deux facons selon l ecran — et
   * l utilisateur apprend deux vocabulaires pour un seul defaut.
   */
  const lire = (p: string) => readFileSync(new URL(p, import.meta.url));
  const a = lire('./messageErreurAuth.ts');
  const b = lire('../update-admin-for-super-admin/messageErreurAuth.ts');

  const md5 = (x: Buffer) => createHash('md5').update(x).digest('hex');
  assert.ok(a.length > 1000, 'la copie lue n est pas vide');
  assert.equal(
    md5(a), md5(b),
    'les deux copies de messageErreurAuth.ts ont divergé : recopiez-en une sur l autre',
  );
});

test('LA PHRASE EXACTE DEMANDEE, verrouillee au caractere', () => {
  /* David a donne le texte lui-meme. Il ne doit pas deriver au fil des refontes. */
  assert.equal(EMAIL_DEJA_PRIS, 'Cet email est déjà utilisé par un autre compte.');
});
