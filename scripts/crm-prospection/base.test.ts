/*
 * LA MIGRATION DU CRM DE PROSPECTION : CE QU'ELLE DOIT CONTENIR, ET CE QU'ELLE N'A PAS LE
 * DROIT DE TOUCHER.
 *   node --import tsx --test scripts/crm-prospection/base.test.ts
 *
 * ---------- CE QUE CE FICHIER MESURE, ET CE QU'IL NE MESURE PAS ----------
 *
 * Il lit le FICHIER DE MIGRATION du depot. Il ne se connecte a aucune base : un relevé
 * qui dependrait du reseau ne tournerait ni en integration continue, ni hors ligne, et
 * echouerait pour des raisons sans rapport avec le code.
 *
 * Il ne prouve donc PAS que la base de production porte ces contraintes — cela a ete
 * mesure a part, le 02/11/2026, en interrogeant pg_constraint et pg_policies apres
 * application, et la SEMANTIQUE de la cle etrangere a ete rejouee sur une replique
 * temporaire (7 epreuves sur 7). Ce qu'il tient, c'est que le fichier versionne reste
 * d'accord avec ce qui a ete decide : une base reconstruite depuis les migrations
 * obtiendra la meme chose.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const DOSSIER = new URL('../../supabase/migrations/', import.meta.url);

const FICHIER = (() => {
  const trouves = readdirSync(DOSSIER).filter((f) => f.endsWith('_creer_crm_prospection.sql'));
  assert.equal(trouves.length, 1, `une seule migration attendue, ${trouves.length} trouvee(s)`);
  return trouves[0];
})();

const SQL_BRUT = readFileSync(new URL(FICHIER, DOSSIER), 'utf8');

/* Les commentaires partent : ce fichier explique longuement ce qu'il refuse de faire, en
   NOMMANT les tables qu'il ne touche pas. Sans ce filtre, le relevé Z1 mordrait sur sa
   propre justification — c'est la cinquieme fois que ce depot s'y ferait prendre. */
const SQL = SQL_BRUT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');

// ===================== A. LA TABLE =====================

test('A1 les neuf colonnes de donnees, plus les quatre de service', () => {
  const corps = SQL.slice(SQL.indexOf('CREATE TABLE IF NOT EXISTS public.crm_prospection_leads'));
  for (const col of ['nom', 'prenom', 'email', 'poste', 'entreprise', 'lien', 'statut_id', 'commentaire']) {
    assert.match(corps, new RegExp(`\\n\\s+${col}\\s`), `la colonne ${col} a disparu`);
  }
  for (const col of ['id', 'company_id', 'created_at', 'updated_at', 'created_by']) {
    assert.match(corps, new RegExp(`\\n\\s+${col}\\s`), `la colonne de service ${col} a disparu`);
  }
  /* `societe` serait l'homonyme fatal : dans Talvex le mot designe le LOCATAIRE, et la
     confusion porterait precisement sur la cle d'isolation. */
  assert.ok(!/\n\s+societe\s/.test(corps),
    "une colonne `societe` est apparue : l'employeur du prospect s'appelle `entreprise`, "
    + 'pour ne jamais se confondre avec company_id');
});

test('A2 company_id est NOT NULL et cascade avec la Societe', () => {
  /*
   * ON DELETE CASCADE plutot que NO ACTION, et c'est une decision mesuree : 19 des 43 cles
   * etrangeres vers companies refusent la suppression, et sont rattrapees a la main par
   * delete_company_data(), une fonction d'environ cinquante DELETE. Une table en NO ACTION
   * oubliee dans cette liste rend toute suppression de Societe impossible, et le danger
   * reste invisible jusqu'a la premiere suppression reelle.
   */
  assert.match(SQL, /company_id\s+uuid\s+NOT NULL REFERENCES public\.companies\(id\) ON DELETE CASCADE/,
    'company_id doit etre NOT NULL et cascader : sinon il faut inscrire la table dans delete_company_data()');
});

test('A3 LE POINT CENTRAL : la cle etrangere est COMPOSEE, et sa liste de colonnes est la', () => {
  /*
   * DEUX CHOSES SE JOUENT ICI, ET AUCUNE NE SE DEVINE A LA RELECTURE.
   *
   * 1. (statut_id, company_id) PLUTOT QUE statut_id SEUL. Une cle simple laisserait une
   *    Societe pointer le statut d'une AUTRE Societe : rien dans la base ne l'en
   *    empecherait. Mesure du 02/11/2026 sur une replique : avec la cle composee,
   *    l'insertion est REFUSEE (foreign_key_violation).
   *
   * 2. ON DELETE SET NULL (statut_id) — LA LISTE DE COLONNES N'EST PAS DECORATIVE. Sans
   *    elle, PostgreSQL met a NULL TOUTES les colonnes referencantes, donc AUSSI
   *    company_id, qui est NOT NULL. La suppression d'un statut echouerait alors, et
   *    David ne pourrait PLUS supprimer un statut depuis sa vue Statuts : le nouveau CRM
   *    casserait l'ancien. Mesure sur la replique : company_id SURVIT.
   *
   * La syntaxe par colonne exige PostgreSQL 15 ou plus ; la base mesuree est en 17.6.
   */
  assert.match(SQL, /FOREIGN KEY \(statut_id, company_id\)/,
    'la cle etrangere n est plus composee : une Societe pourrait pointer le statut d une autre');
  assert.match(SQL, /REFERENCES public\.statuts \(id, company_id\)/,
    'la cible de la cle etrangere a change');
  assert.match(SQL, /ON DELETE SET NULL \(statut_id\)/,
    'LA LISTE DE COLONNES A DISPARU : sans elle, supprimer un statut mettrait AUSSI '
    + 'company_id a NULL, la suppression echouerait, et la vue Statuts existante serait cassee');
});

test('A4 les trois garde-fous de saisie', () => {
  assert.match(SQL, /crm_prospection_leads_nom_non_vide[\s\S]{0,80}btrim\(nom\) <> ''/,
    'un nom d espaces rendrait la ligne invisible au tableau');
  /* Le lien est rendu dans un <a href> : sans borne, `javascript:` devient du code
     execute au clic, avec le jeton et les droits du lecteur. */
  assert.match(SQL, /crm_prospection_leads_lien_http[\s\S]{0,120}\^https\?:\/\//,
    'la borne sur le schema du lien a disparu : injection possible au clic');
  assert.match(SQL, /crm_prospection_leads_commentaire_borne[\s\S]{0,120}5000/,
    'la borne du commentaire a disparu');
});

test('A5 la contrainte additive sur statuts, et elle seule', () => {
  /* `id` etant deja la cle primaire de statuts, UNIQUE (id, company_id) ne peut JAMAIS
     echouer et ne change aucun comportement. Elle sert uniquement de cible a la cle
     etrangere composee. C'est la SEULE modification d'une table existante. */
  assert.match(SQL, /ALTER TABLE public\.statuts\s+ADD CONSTRAINT statuts_id_company_unique UNIQUE \(id, company_id\)/,
    'la cible de la cle etrangere composee a disparu : la migration ne s appliquerait pas');

  const alters = [...SQL.matchAll(/ALTER TABLE public\.(\w+)/g)].map((m) => m[1]);
  const autorisees = new Set(['statuts', 'crm_prospection_leads']);
  for (const table of alters) {
    assert.ok(autorisees.has(table),
      `la migration modifie public.${table}, qui n est pas de son ressort`);
  }
});

// ===================== B. LA RLS =====================

test('B1 la RLS est ACTIVEE, pas seulement declaree', () => {
  /* Une politique posee sur une table dont la RLS n'est pas active ne protege RIEN : elle
     donne l'apparence d'une cloison sans en etre une. */
  assert.match(SQL, /ALTER TABLE public\.crm_prospection_leads ENABLE ROW LEVEL SECURITY/,
    'sans ENABLE ROW LEVEL SECURITY, les politiques ci-dessous ne protegent rien');
});

test('B2 la Societe est bornee a SES lignes, en lecture comme en ecriture', () => {
  const p = /CREATE POLICY "Admin manage own company prospection leads"([\s\S]*?);/.exec(SQL);
  assert.ok(p, 'la politique de la Societe a disparu');
  assert.match(p[1], /FOR ALL TO authenticated/, 'elle doit couvrir les quatre verbes');
  /* USING borne la LECTURE et les lignes qu'on peut viser ; WITH CHECK borne ce qu'on
     peut ECRIRE. Sans WITH CHECK, un admin pourrait inserer une ligne au nom d'une autre
     Societe — il ne la reverrait jamais, mais elle existerait. */
  const occurrences = (p[1].match(/company_id = \(\(auth\.jwt\(\) -> 'app_metadata' ->> 'company_id'\)\)::uuid/g) ?? []).length;
  assert.equal(occurrences, 2, 'la borne de Societe doit etre dans USING ET dans WITH CHECK');
  assert.match(p[1], /USING \(/);
  assert.match(p[1], /WITH CHECK \(/);
});

test('B3 Talvex a sa politique, et on sait ce qu elle implique', () => {
  /*
   * C'est la convention du schema — les 20 tables isolees par company_id en ont toutes
   * une — et elle a deux consequences qu'il vaut mieux connaitre que decouvrir : la
   * restauration de sauvegarde fonctionne, et une suppression groupee ecrite sans
   * `.eq('company_id', ...)` n'est bornee par RIEN quand c'est Talvex qui agit.
   *
   * D'ou le relevé D2 de chaineVue.test.ts, qui tient la clause cote client.
   */
  assert.match(SQL, /CREATE POLICY "SA manage all prospection leads"[\s\S]*?'super_admin'/,
    'sans politique super_admin, Talvex verrait un tableau vide et la restauration echouerait');
});

test('B4 aucune autre politique n est posee en douce', () => {
  const politiques = [...SQL.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(politiques.sort(), [
    'Admin manage own company prospection leads',
    'SA manage all prospection leads',
  ], 'le jeu de politiques a change : toute politique en plus doit etre une decision explicite');
});

// ===================== Z. CE QUE LA MIGRATION NE TOUCHE PAS =====================

test('Z1 ni CRM Immo, ni le CRM Leads, ni le faux ami crm_system_statuses', () => {
  /*
   * David l'a pose comme condition : « aucun changement dans CRM Immo, CRM Leads [...] ou
   * les autres panels ». Une migration est l'endroit le plus facile pour l'enfreindre
   * sans s'en rendre compte.
   *
   * crm_system_statuses merite sa mention : elle porte le meilleur nom des neuf tables
   * candidates et n'a AUCUN company_id. Ses lignes sont modifiables et effacables par
   * l'admin de n'importe quelle Societe. Y brancher la colonne Statut aurait donne
   * l'inverse exact de l'isolation demandee.
   */
  for (const interdite of ['crm_immo', 'crm_system_statuses', 'leads_sans_statut_count']) {
    assert.ok(!SQL.includes(interdite),
      `la migration touche a ${interdite}, qui est hors de son perimetre`);
  }
  /* `leads` seul : le mot apparait dans crm_prospection_leads, on ne cherche donc que la
     table nue, precedee d'un point ou d'un espace. */
  assert.ok(!/\bpublic\.leads\b/.test(SQL), 'la migration touche a la table leads du CRM existant');
});

test('Z2 aucune donnee n est inseree', () => {
  /*
   * Une migration qui ecrit des donnees de production s'executerait aussi sur toute base
   * future, y compris une base de test. Le precedent est dans le depot :
   * 20260321210058_seed_default_nouveau_status.sql insere un statut SANS company_id, qui
   * reapparait donc sur toute base reconstruite — invisible a tous sauf super_admin.
   */
  assert.ok(!/INSERT INTO/i.test(SQL),
    'la migration insere des donnees : elles reapparaitraient sur toute base reconstruite');
});

test('Z3 le rollback est ecrit, et il defait exactement ce qui a ete fait', () => {
  /* Un rollback absent se reinvente dans l'urgence, au pire moment. */
  const entete = SQL_BRUT.slice(0, SQL_BRUT.indexOf('*/'));
  assert.match(entete, /ROLLBACK/, 'le bloc de rollback a disparu de l en-tete');
  for (const objet of ['crm_prospection_leads', 'update_crm_prospection_leads_updated_at', 'statuts_id_company_unique']) {
    assert.ok(entete.includes(objet), `le rollback ne defait pas ${objet}`);
  }
});
