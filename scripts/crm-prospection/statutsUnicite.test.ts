/*
 * L UNICITE DU NOM DE STATUT, PAR SOCIETE ET INSENSIBLE A LA CASSE.
 *   node --import tsx --test scripts/crm-prospection/statutsUnicite.test.ts
 *
 * Ce relevé garde une correction qui touche une table du CRM EXISTANT — public.statuts,
 * lue par le CRM Leads, le panel vendeur et le CRM Prospection. C'est pour cela qu'elle
 * vit dans son propre commit, et pour cela qu'elle merite son propre relevé.
 *
 * IL LIT LE FICHIER DE MIGRATION, pas la base : un relevé qui dependrait du reseau ne
 * tournerait ni en integration continue, ni hors ligne. L'etat reel apres application a
 * ete mesure a part, le 02/11/2026, en interrogeant pg_constraint et pg_indexes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const DOSSIER = new URL('../../supabase/migrations/', import.meta.url);
const FICHIERS = readdirSync(DOSSIER);

const NOM = (() => {
  const t = FICHIERS.filter((f) => f.endsWith('_statuts_unicite_par_societe.sql'));
  assert.equal(t.length, 1, `une seule migration attendue, ${t.length} trouvee(s)`);
  return t[0];
})();

const BRUT = readFileSync(new URL(NOM, DOSSIER), 'utf8');
/* Les commentaires partent : cette migration CITE abondamment l'ancienne contrainte pour
   expliquer pourquoi elle la retire. Sans ce filtre, les relevés mordraient sur sa propre
   justification — c'est la cinquieme fois que ce depot s'y ferait prendre. */
const SQL = BRUT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');

test('A1 l ancienne contrainte globale est retiree, la nouvelle est posee par Societe', () => {
  assert.match(SQL, /ALTER TABLE public\.statuts\s+DROP CONSTRAINT statuts_nom_key/,
    "statuts_nom_key n'est plus retiree : deux Societes resteraient incapables d'avoir un statut homonyme");
  assert.match(SQL, /CREATE UNIQUE INDEX statuts_company_nom_unique\s+ON public\.statuts \(company_id, lower\(nom\)\)/,
    "la nouvelle unicite doit porter sur (company_id, lower(nom)) : par Societe ET insensible a la casse");
});

test('A2 UN INDEX, et non une contrainte de table', () => {
  /* PostgreSQL n'accepte pas d'expression — ici lower(nom) — dans une contrainte UNIQUE.
     Ecrire ADD CONSTRAINT ... UNIQUE (company_id, lower(nom)) echouerait a l'application. */
  assert.ok(!/ADD CONSTRAINT[\s\S]{0,60}lower\(nom\)/.test(SQL),
    'une contrainte de table avec lower(nom) ne peut pas etre creee : il faut un index');
});

test('A3 la cible de la cle etrangere du CRM Prospection N EST PAS touchee', () => {
  /*
   * statuts_id_company_unique a ete posee la veille par la migration du CRM Prospection :
   * elle sert de cible a la cle etrangere composee de crm_prospection_leads. La retirer
   * en meme temps que statuts_nom_key — les deux sont des contraintes d'unicite sur
   * statuts — casserait ce module. Elles se ressemblent assez pour etre confondues.
   */
  assert.ok(!SQL.includes('DROP CONSTRAINT statuts_id_company_unique'),
    'la cible de la cle etrangere composee est supprimee : le CRM Prospection casserait');
  assert.ok(!/DROP INDEX[\s\S]{0,80}statuts_id_company_unique/.test(SQL),
    'la cible de la cle etrangere composee est supprimee : le CRM Prospection casserait');
});

test('A4 la migration ne fait QUE cela, et sur la seule table statuts', () => {
  const tables = [...SQL.matchAll(/ALTER TABLE public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(tables)], ['statuts'], 'la migration touche une autre table');
  assert.ok(!/INSERT INTO/i.test(SQL), 'aucune donnee ne doit etre inseree');
  assert.ok(!/CREATE POLICY|DROP POLICY/i.test(SQL),
    'cette migration ne touche pas aux politiques : ce serait une autre decision');
});

test('A5 elle passe APRES le seed qui depend de l ancienne contrainte', () => {
  /*
   * 20260321210058_seed_default_nouveau_status.sql fait `ON CONFLICT (nom) DO NOTHING`,
   * ce qui exige un index unique sur `nom` SEUL. Sur une base reconstruite depuis les
   * migrations, elle doit donc s'executer PENDANT QUE statuts_nom_key existe encore.
   *
   * L'ordre d'execution est celui des horodatages : ce relevé le verifie plutot que de
   * l'esperer. Renommer l'une des deux, ou rejouer les migrations dans un autre ordre,
   * ferait echouer la reconstruction — et le message ne dirait pas pourquoi.
   */
  const seed = FICHIERS.find((f) => f.endsWith('_seed_default_nouveau_status.sql'));
  assert.ok(seed, 'le seed de reference a disparu : verifier si la dependance existe encore');
  const avant = seed.slice(0, 14);
  const apres = NOM.slice(0, 14);
  assert.ok(avant < apres,
    `le seed (${avant}) doit s'executer AVANT cette migration (${apres}) : il utilise `
    + "ON CONFLICT (nom), qui exige l'unicite sur le nom seul");
});

test('A6 le rollback est ecrit, et il dit ce qui peut le faire echouer', () => {
  const entete = BRUT.slice(0, BRUT.indexOf('*/'));
  assert.match(entete, /ROLLBACK/, "le bloc de rollback a disparu de l'en-tete");
  assert.match(entete, /statuts_company_nom_unique/, 'le rollback ne retire pas le nouvel index');
  assert.match(entete, /ADD CONSTRAINT statuts_nom_key/, "le rollback ne remet pas l'ancienne contrainte");
  /* Un rollback qui peut echouer et ne le dit pas se tente dans l'urgence, au pire
     moment : si deux Societes ont pris le meme nom entre-temps, il ne passera pas. */
  assert.match(entete, /ECHOUERA/,
    "le rollback ne previent pas qu'il echouera si deux Societes ont pris le meme nom");
});
