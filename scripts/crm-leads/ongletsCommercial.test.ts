// Releves : les onglets de colonnes cote Commercial — SES onglets, SES comptes, l'onglet montre,
// et les garde-fous lus dans le CODE (une seule source de colonnes, seulement ses leads).
//   node --import tsx --test scripts/crm-leads/ongletsCommercial.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comptesParOnglet, ongletEffectif, ONGLET_PRINCIPAL } from '../../src/lib/ongletsLeads.ts';

/** Le source SANS commentaires et en fins de ligne LF : on interroge le code, pas la prose. */
const code = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Une societe : « Tatoueurs » (T) contient t1..t5, « Avocats » (A) contient a1..a3, et t1 est
   aussi dans A. Le commercial a t1, t2 et x1 (x1 n'est dans aucun onglet). */
const APPARTENANCES = new Map<string, string[]>([
  ['t1', ['T', 'A']], ['t2', ['T']], ['t3', ['T']], ['t4', ['T']], ['t5', ['T']],
  ['a1', ['A']], ['a2', ['A']], ['a3', ['A']],
]);

test('V1 les comptes sont ceux du COMMERCIAL, pas ceux de la societe', () => {
  const c = comptesParOnglet(['t1', 't2', 'x1'], APPARTENANCES);
  assert.equal(c.get('T'), 2, 'Tatoueurs : 2 de ses leads, pas les 5 de la societe');
  assert.equal(c.get('A'), 1, 'Avocats : t1 y est aussi rattache');
  assert.equal(c.size, 2, 'aucun autre onglet');
});

test('V2 un onglet ou il n a aucun lead n existe pas chez lui', () => {
  const c = comptesParOnglet(['t2'], APPARTENANCES);
  assert.equal(c.has('A'), false);
  assert.deepEqual(comptesParOnglet([], APPARTENANCES), new Map());
});

test('V3 l onglet montre : le choix retenu tant qu il lui reste un lead dedans', () => {
  const c = comptesParOnglet(['t2'], APPARTENANCES);
  assert.equal(ongletEffectif('T', c, true), 'T');
  assert.equal(ongletEffectif('A', c, true), ONGLET_PRINCIPAL, 'plus aucun de ses leads dans Avocats : Principal');
  assert.equal(ongletEffectif(ONGLET_PRINCIPAL, c, true), ONGLET_PRINCIPAL);
  assert.equal(ongletEffectif('inconnu', c, true), ONGLET_PRINCIPAL);
});

test('V4 pendant la lecture, le choix retenu est garde (pas de clignotement vers Principal)', () => {
  assert.equal(ongletEffectif('A', new Map(), false), 'A');
});

test('V5 le commercial ne lit QUE ses leads, et ses onglets viennent de la societe', () => {
  const donnees = code('src/pages/vendor/views/leads/useVendorLeadsData.ts');
  assert.match(donnees, /from\('leads'\)[\s\S]{0,200}\.eq\('vendor_id', vendorId\)/, 'lecture bornee au commercial');
  assert.match(donnees, /comptesParOnglet\(leads\.map\(l => l\.id\), appartenances\)/, 'comptes calcules sur SES leads');
  const vue = code('src/pages/vendor/views/VendorLeads.tsx');
  assert.match(vue, /useOngletsLeads\(companyId\)/, 'les onglets et leurs colonnes sont ceux de la societe');
  assert.match(vue, /onglets: ogSociete\.onglets\.filter\(o => \(d\.comptesOnglets\.get\(o\.id\) \?\? 0\) > 0\)/, 'seulement SES onglets');
  assert.match(vue, /comptes=\{d\.comptesOnglets\}/, 'la fenetre affiche SES comptes');
  assert.match(vue, /peutGerer=\{false\}/, 'aucune gestion d onglet cote commercial');
  assert.doesNotMatch(vue, /creerOnglet|enregistrerColonnesOnglet|rattacherLeads|retirerLeads/, 'aucune ecriture d onglet');
  assert.doesNotMatch(vue, /from\('lead_onglet/, 'aucune copie de configuration propre au commercial');
});
