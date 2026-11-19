// Releves : identite affichee, recherche globale, colonnes d'onglet, orchestration de l'import
// par lots (base simulee), et garde-fous d'architecture lus dans le CODE.
//   node --import tsx --test scripts/crm-leads/ongletsEtImport.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { identiteLead, champContact, initialesLead, LEAD_SANS_NOM } from '../../src/lib/identiteLead.ts';
import { leadCorrespond, normaliserRecherche } from '../../src/lib/rechercheLeads.ts';
import { colonnesDeLOnglet, libelleOnglets, valeurDyn, cleDyn, type ColonneOnglet, type ColonneRegistre } from '../../src/lib/ongletsLeads.ts';
import { importerDansOnglet, ligneVersLot, messagePreparation, type AppelRpc } from '../../src/lib/importOnglet.ts';

/** Le source SANS commentaires et en fins de ligne LF : on interroge le code, pas la prose. */
const code = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/^\s*--.*$/gm, '');

const lead = (o: Record<string, unknown>) => ({ data: {}, ...o }) as { data: Record<string, string>; prenom?: string; nom?: string; email?: string; telephone?: string };

test('I1 identite : Prenom Nom, sinon Entreprise, sinon email, sinon numero — jamais inventee', () => {
  assert.deepEqual(identiteLead(lead({ prenom: 'Jean', nom: 'Dupont', data: { Entreprise: 'ACME' } })),
    { titre: 'Jean Dupont', source: 'contact', entreprise: 'ACME' });
  assert.equal(identiteLead(lead({ data: { Entreprise: 'Encre Fictive Rennes', Téléphone: '0600000001' } })).titre, 'Encre Fictive Rennes');
  assert.equal(identiteLead(lead({ data: { 'Raison sociale': 'Studio X' } })).source, 'entreprise');
  assert.equal(identiteLead(lead({ email: 'a@b.fr' })).titre, 'a@b.fr');
  assert.equal(identiteLead(lead({ telephone: '+33600000001' })).source, 'telephone');
  assert.equal(identiteLead(lead({})).titre, LEAD_SANS_NOM);
  /* La colonne plate passe avant le JSONB, et les deux casses du JSONB sont lues. */
  assert.equal(champContact(lead({ nom: 'Plat', data: { Nom: 'Json' } }), 'nom'), 'Plat');
  assert.equal(champContact(lead({ data: { nom: 'minuscule' } }), 'nom'), 'minuscule');
  /* Le PIN n'est jamais une entreprise, meme sous un nom trompeur. */
  assert.equal(identiteLead(lead({ data: { MotDePasse: '123456' } })).titre, LEAD_SANS_NOM);
  assert.equal(initialesLead(lead({ data: { Entreprise: 'encre fictive' } })), 'EF');
  assert.equal(initialesLead(lead({ email: 'a@b.fr' })), '?');
});

test('I2 recherche globale : accents, casse, mots, telephone sous toutes ses formes', () => {
  const l = lead({ telephone: '+33600000001', data: { Entreprise: 'Société Encre Fictive Rennes', Email: 'contact@encre-fictive.fr' } });
  assert.equal(leadCorrespond(l, 'societe'), true);
  assert.equal(leadCorrespond(l, 'encre rennes'), true, 'mot par mot');
  assert.equal(leadCorrespond(l, 'CONTACT@'), true);
  assert.equal(leadCorrespond(l, '06 00 00'), true);
  assert.equal(leadCorrespond(l, '+33 6 00'), true);
  assert.equal(leadCorrespond(l, '0033600'), true);
  assert.equal(leadCorrespond(l, 'brest'), false);
  assert.equal(leadCorrespond(l, '00'), false, 'deux chiffres ne fouillent pas les numeros');
  assert.equal(leadCorrespond(l, '   '), true, 'une recherche vide ne filtre rien');
  assert.equal(normaliserRecherche('  Éric  L’Hôte '), "eric l'hote");
});

const REG: ColonneRegistre[] = [
  { id: 'c1', cle_data: 'Entreprise', cle_canonique: 'entreprise', libelle: 'Entreprise', type: 'entreprise' },
  { id: 'c2', cle_data: 'Site web', cle_canonique: 'site web', libelle: 'Site web', type: 'lien' },
];

test('I3 colonnes d un onglet : ordre, libelle propre a l onglet, registre manquant ecarte', () => {
  const lignes: ColonneOnglet[] = [
    { id: 'l3', onglet_id: 'o', colonne_id: 'c2', cle_systeme: null, position: 2, visible: true, libelle: 'Site internet' },
    { id: 'l1', onglet_id: 'o', colonne_id: null, cle_systeme: 'hash', position: 0, visible: true, libelle: null },
    { id: 'l2', onglet_id: 'o', colonne_id: 'c1', cle_systeme: null, position: 1, visible: true, libelle: null },
    { id: 'l4', onglet_id: 'o', colonne_id: 'zz', cle_systeme: null, position: 3, visible: true, libelle: null },
    { id: 'l5', onglet_id: 'o', colonne_id: null, cle_systeme: 'telephone', position: 4, visible: false, libelle: null },
  ];
  const c = colonnesDeLOnglet(lignes, new Map(REG.map(r => [r.id, r])));
  assert.deepEqual(c.map(x => [x.cle, x.libelle, x.visible]), [
    ['hash', '#', true], [cleDyn('c1'), 'Entreprise', true], [cleDyn('c2'), 'Site internet', true], ['telephone', 'Telephone', false],
  ]);
  assert.equal(c[2].cleData, 'Site web');
  assert.equal(c[3].type, 'telephone');
  assert.equal(libelleOnglets([]), 'Principal');
  assert.equal(libelleOnglets(['Tatoueurs Rennes']), 'Onglet : Tatoueurs Rennes');
  assert.equal(libelleOnglets(['A', 'B']), 'Onglets : A, B');
  assert.equal(valeurDyn({ 'Site web': '  x.fr ' }, 'Site web'), 'x.fr');
  assert.equal(valeurDyn({ 'Site web': ['tableau'] } as unknown as Record<string, unknown>, 'Site web'), '', 'une valeur non texte n est pas affichee');
});

/** Une base simulee : enregistre les appels, rend des reponses plausibles. */
function baseSimulee(opts: { echecsLot?: number[]; erreurPreparer?: { message: string; code?: string }; refuserLigne?: number; coupuresDes?: number } = {}) {
  const appels: { fn: string; args: Record<string, unknown> }[] = [];
  let lot = 0;
  const rpc: AppelRpc = async (fn, args) => {
    appels.push({ fn, args });
    if (fn === 'crm_import_preparer') {
      if (opts.erreurPreparer) return { data: null, error: opts.erreurPreparer };
      const cols = (args.p_colonnes as { entete: string; cle_systeme?: string }[]).map(c => (c.cle_systeme
        ? { entete: c.entete, cle_systeme: c.cle_systeme }
        : { entete: c.entete, colonne_id: 'id-' + c.entete, cle_data: c.entete === 'facebook ' ? 'Facebook' : c.entete }));
      return { data: { onglet_id: 'O', import_id: 'I', colonnes: cols, reaffichees: [] }, error: null };
    }
    lot++;
    if (opts.echecsLot?.includes(lot)) return { data: null, error: { message: 'reseau' } };
    if (opts.coupuresDes !== undefined && lot >= opts.coupuresDes) return { data: null, error: { message: 'reseau' } };
    const lignes = args.p_lignes as { i: number }[];
    if (opts.refuserLigne !== undefined && lignes.some(l => l.i === opts.refuserLigne)) {
      return { data: null, error: { message: 'unsupported Unicode escape sequence', code: '22P05' } };
    }
    return { data: { crees: lignes.length, inchanges: 0, completes: 0, lies: lignes.length, erreurs: [], conflits: [] }, error: null };
  };
  return { rpc, appels };
}

const lignesTest = (n: number) => Array.from({ length: n }, (_, i) => ({
  index: i, raw: { Entreprise: 'E' + i, 'Téléphone': '06000000' + String(i).padStart(2, '0'), 'facebook ': '', MotDePasse: '123456', Commentaires: 'non' },
  prenom: '', nom: '', email: null, telephone: '+3360000' + String(i).padStart(4, '0'),
}));

const PLAN = [
  { entete: 'Entreprise', type: 'entreprise' as const, vide: false },
  { entete: 'Téléphone', cleSysteme: 'telephone' as const, type: 'telephone' as const, vide: false },
  { entete: 'facebook ', type: 'lien' as const, vide: true },
  { entete: 'MotDePasse', type: 'texte' as const, vide: false },
  { entete: 'Commentaires', type: 'texte' as const, vide: false },
];

test('I4 import : UN appel de preparation puis des LOTS — jamais un appel par ligne', async () => {
  const b = baseSimulee();
  const progression: number[] = [];
  const r = await importerDansOnglet({
    rpc: b.rpc, companyId: 'S', choix: { nouveauNom: ' Tatoueurs Rennes ' }, mode: 'completer', plan: PLAN,
    lignes: lignesTest(600), fichier: { nom: 'f.csv', entetes: PLAN.map(p => p.entete), totalLignes: 600, erreursAvant: 0 },
    onProgression: (f) => progression.push(f),
  });
  /* Lots de 50 : sous les 64 sous-transactions au-dela desquelles Postgres ralentit toute la base. */
  assert.deepEqual(b.appels.map(a => a.fn), ['crm_import_preparer', ...Array(12).fill('crm_import_lot')]);
  assert.deepEqual(progression, [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600]);
  assert.ok(b.appels.slice(1).every(a => (a.args.p_lignes as unknown[]).length <= 50));
  assert.equal(r.crees, 600);
  assert.equal(r.interrompu, null);
  const prep = b.appels[0].args;
  assert.equal(prep.p_onglet_nom, 'Tatoueurs Rennes');
  assert.equal(prep.p_onglet_id, null);
  /* Les cles reservees ne partent JAMAIS comme colonnes. */
  assert.deepEqual((prep.p_colonnes as { entete: string }[]).map(c => c.entete), ['Entreprise', 'Téléphone', 'facebook ']);
  const ligne0 = (b.appels[1].args.p_lignes as { data: Record<string, string>; pin?: string }[])[0];
  assert.deepEqual(ligne0.data, { Entreprise: 'E0', 'Téléphone': '0600000000' },
    'cle du registre pour les colonnes dynamiques, en-tete d origine pour les standard, cellules vides omises, rien de reserve');
  assert.equal(ligne0.pin, '123456', 'le PIN voyage a part, la base ne le garde que s il fait six chiffres');
  assert.equal((ligne0 as { cle_email?: string }).cle_email, undefined, 'pas de colonne email dans ce fichier : aucune cle protegee');
  assert.equal(b.appels[1].args.p_mode, 'completer');
});

test('I5 import : un lot en echec est REJOUE une fois, puis l arret est dit sans rien cacher', async () => {
  const b1 = baseSimulee({ echecsLot: [2] });
  const r1 = await importerDansOnglet({ rpc: b1.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(300), fichier: { nom: 'f.csv', entetes: [], totalLignes: 300, erreursAvant: 0 } });
  assert.equal(r1.interrompu, null, 'un seul echec : le second essai passe');
  assert.equal(r1.traitees, 300);

  const b2 = baseSimulee({ echecsLot: [2, 3] });
  const r2 = await importerDansOnglet({ rpc: b2.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(600), fichier: { nom: 'f.csv', entetes: [], totalLignes: 600, erreursAvant: 0 } });
  /* Deux echecs du MEME lot (coupure) : il est renvoye ligne par ligne, et l'import va au bout. */
  assert.equal(r2.interrompu, null);
  assert.equal(r2.traitees, 600);
  assert.equal(r2.crees, 600);

  const b3 = baseSimulee({ erreurPreparer: { message: 'duplicate', code: '23505' } });
  const r3 = await importerDansOnglet({ rpc: b3.rpc, companyId: 'S', choix: { nouveauNom: 'X' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(3), fichier: { nom: 'f.csv', entetes: [], totalLignes: 3, erreursAvant: 0 } });
  assert.equal(r3.ongletId, null);
  assert.equal(b3.appels.length, 1, 'aucun lot n est envoye si la preparation echoue');
  assert.match(r3.interrompu ?? '', /déjà ce nom/);
  assert.match(messagePreparation({ message: 'new row violates row-level security policy' }), /droits/);
});

test('I5b un lot refuse par la base est renvoye LIGNE PAR LIGNE : seule la ligne fautive est perdue', async () => {
  const b = baseSimulee({ refuserLigne: 7 });
  const r = await importerDansOnglet({ rpc: b.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(60), fichier: { nom: 'f.csv', entetes: [], totalLignes: 60, erreursAvant: 0 } });
  assert.equal(r.interrompu, null);
  assert.equal(r.crees, 59, 'les 49 autres lignes du lot et le lot suivant passent');
  assert.deepEqual(r.erreurs.map(e => [e.index, e.code]), [[7, '22P05']]);
  /* Une erreur de DONNEE n'est pas rejouee telle quelle : le lot est aussitot decoupe, chaque
     ligne avec son propre identifiant. */
  const lots = b.appels.filter(a => a.fn === 'crm_import_lot').map(a => a.args.p_lot as string);
  assert.ok(lots.every(id => /^[0-9a-f-]{36}$/.test(id)));
  assert.equal(new Set(lots).size, lots.length, 'un identifiant par envoi');
  assert.equal((b.appels[2].args.p_lignes as unknown[]).length, 1, 'renvoi ligne par ligne');
});

test('I5e une erreur qui touche TOUT l import (onglet archive) arrete l import : pas de renvoi ligne par ligne', async () => {
  let n = 0;
  const rpc: AppelRpc = async (fn) => {
    if (fn === 'crm_import_preparer') return { data: { onglet_id: 'O', import_id: 'I', colonnes: [], reaffichees: [] }, error: null };
    n++;
    return { data: null, error: { code: '22023', message: 'Onglet introuvable ou archive' } };
  };
  const r = await importerDansOnglet({ rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(120), fichier: { nom: 'f.csv', entetes: [], totalLignes: 120, erreursAvant: 0 } });
  assert.equal(n, 1, 'un seul appel : une erreur codee n est ni rejouee ni decoupee');
  assert.match(r.interrompu ?? '', /archivé/);
});

test('I5c une coupure qui dure : le MEME lot est renvoye deux fois, puis arret (jamais de decoupage)', async () => {
  const b = baseSimulee({ coupuresDes: 1 });
  const r = await importerDansOnglet({ rpc: b.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'ignorer', plan: PLAN,
    lignes: lignesTest(10), fichier: { nom: 'f.csv', entetes: [], totalLignes: 10, erreursAvant: 0 } });
  assert.match(r.interrompu ?? '', /relancez l'import du même fichier/);
  const lots = b.appels.filter(a => a.fn === 'crm_import_lot').map(a => a.args.p_lot as string);
  assert.equal(lots.length, 3, 'un envoi et deux renvois');
  assert.equal(new Set(lots).size, 1, 'toujours le MEME identifiant : la base rendrait le resultat si le lot avait abouti');
});

test('I5d un email invalide ne part jamais sous la cle de l email : il est garde a part', async () => {
  const b = baseSimulee();
  await importerDansOnglet({ rpc: b.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'completer',
    plan: [{ entete: 'Email', cleSysteme: 'email', type: 'email', vide: false }, { entete: 'Tel', cleSysteme: 'telephone', type: 'telephone', vide: false }],
    lignes: [{ index: 0, raw: { Email: 'n/a', Tel: '0600000001' }, prenom: '', nom: '', email: null, telephone: '+33600000001' },
      { index: 1, raw: { Email: 'ok@x.fr', Tel: '0600000002' }, prenom: '', nom: '', email: 'ok@x.fr', telephone: '+33600000002' }],
    fichier: { nom: 'f.csv', entetes: ['Email', 'Tel'], totalLignes: 2, erreursAvant: 0 } });
  const [l0, l1] = b.appels[1].args.p_lignes as { data: Record<string, string> }[];
  assert.deepEqual(l0.data, { 'Email (invalide)': 'n/a', Tel: '0600000001' });
  assert.deepEqual(l1.data, { Email: 'ok@x.fr', Tel: '0600000002' });
});

test('I6 la ligne envoyee : pas de PIN invente, pas de colonne inconnue, la cle de l email designee', () => {
  const l = ligneVersLot({ index: 7, raw: { A: ' x ', B: '' }, prenom: 'Jean', nom: '', email: 'a@b.fr', telephone: null },
    new Map([['A', 'A registre']]), null);
  assert.deepEqual(l, { i: 7, prenom: 'Jean', nom: null, email: 'a@b.fr', telephone: null, data: { 'A registre': 'x' } });
  /* Deux en-tetes vers la meme cle : la premiere valeur est gardee, jamais ecrasee. */
  const m = ligneVersLot({ index: 1, raw: { 'Catégorie': 'Tatoueur', Categorie: 'Autre', 'E-mail': 'x@y.fr' }, prenom: '', nom: '', email: 'x@y.fr', telephone: null },
    new Map([['Catégorie', 'Catégorie'], ['Categorie', 'Catégorie'], ['E-mail', 'E-mail']]), null, 'E-mail');
  assert.equal(m.data['Catégorie'], 'Tatoueur');
  assert.equal((m as { cle_email?: string }).cle_email, 'E-mail', 'la base ne recrit jamais cette cle dans un lead qui a deja un email');
});

test('I7 l import transmet la cle de l email du fichier a chaque ligne', async () => {
  const b = baseSimulee();
  await importerDansOnglet({ rpc: b.rpc, companyId: 'S', choix: { ongletId: 'O' }, mode: 'completer',
    plan: [{ entete: 'Courriel', cleSysteme: 'email', type: 'email', vide: false }, { entete: 'Ville', type: 'texte', vide: false }],
    lignes: [{ index: 0, raw: { Courriel: 'a@b.fr', Ville: 'Rennes' }, prenom: '', nom: '', email: 'a@b.fr', telephone: null }],
    fichier: { nom: 'f.csv', entetes: ['Courriel', 'Ville'], totalLignes: 1, erreursAvant: 0 } });
  const l = (b.appels[1].args.p_lignes as { cle_email?: string; data: Record<string, string> }[])[0];
  assert.equal(l.cle_email, 'Courriel');
  assert.deepEqual(l.data, { Courriel: 'a@b.fr', Ville: 'Rennes' });
  assert.match(messagePreparation({ code: '23514', message: 'violates check constraint "lead_colonnes_cle_data_check"' }), /trop long/);
  assert.match(messagePreparation({ code: '23514', message: 'violates check constraint "lead_onglets_principal_reserve"' }), /Principal/);
});

/* ─────────── GARDE-FOUS D'ARCHITECTURE ─────────── */

const MIGRATION = 'supabase/migrations/20261119073610_crm_onglets_colonnes_leads.sql';
const MIGRATION_2 = 'supabase/migrations/20261119084010_crm_onglets_correctifs_relecture.sql';

test('A1 la migration : aucune fonction SECURITY DEFINER, search_path vide partout, aucune politique DELETE', () => {
  const sql = code(MIGRATION).toLowerCase();
  assert.doesNotMatch(sql, /security\s+definer/);
  const fonctions = (sql.match(/create or replace function/g) ?? []).length;
  const chemins = (sql.match(/set search_path = ''/g) ?? []).length;
  assert.equal(fonctions, 9);
  assert.equal(chemins, fonctions, 'chaque fonction fixe son search_path');
  assert.doesNotMatch(sql, /for delete/, 'on masque, on archive, on retire : on ne supprime pas');
  for (const t of ['lead_colonnes', 'lead_onglets', 'lead_onglet_colonnes', 'lead_onglet_leads']) {
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`), t);
  }
  assert.match(sql, /revoke delete, truncate on table/);
  assert.match(sql, /foreign key \(lead_id, company_id\)\s+references public\.leads \(id, company_id\)/,
    'un rattachement entre deux societes est impossible par construction');
});

test('A1b la seconde migration : memes garde-fous, nom archive libre, email protege', () => {
  const sql = code(MIGRATION_2).toLowerCase();
  assert.doesNotMatch(sql, /security\s+definer/);
  assert.equal((sql.match(/create or replace function/g) ?? []).length, 3);
  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 3);
  assert.doesNotMatch(sql, /for delete/);
  assert.match(sql, /create unique index if not exists lead_onglets_nom_actif_unique[\s\S]{0,160}where archive_le is null/);
  assert.match(sql, /new\.import_id is distinct from old\.import_id and new\.import_id is not null/, 'import_id peut seulement devenir nul');
  assert.match(sql, /if v_k = v_cle_email and v_eff_email is not null then\s+continue;/, 'l email du fichier n entre jamais dans un lead qui en a un');
  assert.match(sql, /v_new_email := case when v_eff_email is null then v_email else v_ex_email end;/, 'l email n est jamais remplace');
  assert.match(sql, /v_eff_email := coalesce\(nullif\(lower\(btrim\(v_ex_email\)\), ''\),\s+nullif\(lower\(btrim\(v_merge->>'email'\)\), ''\)/i, 'la valeur existante vient aussi de data');
});

const MIGRATION_3 = 'supabase/migrations/20261119091523_crm_onglets_contre_verification.sql';

test('A1c la troisieme migration : lots identifies et bornes, conflit jamais fusionne, email protege', () => {
  const sql = code(MIGRATION_3).toLowerCase();
  assert.doesNotMatch(sql, /security\s+definer/);
  assert.doesNotMatch(sql, /for delete/);
  assert.match(sql, /drop function if exists public\.crm_import_lot\(uuid, uuid, uuid, text, jsonb\);/, 'pas deux fonctions candidates');
  assert.match(sql, /jsonb_array_length\(coalesce\(p_lignes, '\[\]'::jsonb\)\) > 100 then/, 'plafond de 100 lignes en base');
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(p_import_id::text, 0\)\)/, 'lots d un import serialises');
  assert.match(sql, /if p_lot is not null and v_deja is not null then\s+return v_deja/, 'un lot rejoue rend son resultat d origine');
  assert.match(sql, /if p_mode = 'ignorer' or v_conflit then/, 'un conflit d email n est jamais fusionne');
  assert.match(sql, /'email', 'mail', 'emails', 'courriel'/, 'toute cle d email est protegee');
  assert.match(sql, /where btrim\(x\) ~ '\^\[\^\[:space:\]@\]\+@/, 'un « email » de data sans forme d email ne bloque pas le vrai');
  assert.match(sql, /if v ~ '\^\\\+330\[0-9\]\{9\}\$' then v := '\+33' \|\| substr\(v, 5\)/, '+33 (0)6 ramene a +33 6');
  assert.match(sql, /reindex index public\.leads_data_tel_idx/);
  assert.match(code('src/lib/importOnglet.ts'), /p_lot: nouvelIdLot\(\)/);
});

test('A2 import sans N+1 : le client n ecrit JAMAIS dans leads, il appelle les procedures', () => {
  for (const f of ['src/lib/importOnglet.ts', 'src/pages/admin/views/import/useImportLeads.ts']) {
    const s = code(f);
    assert.doesNotMatch(s, /from\('leads'\)\s*\.(insert|update|upsert|delete)/, f);
  }
  assert.match(code('src/pages/admin/views/import/useImportLeads.ts'), /importerDansOnglet\(/);
});

test('A3 CRM : lecture integrale, temps reel borne a la societe, actions bornees a la societe', () => {
  /* La lecture des leads elle-meme passe par la pagination : un simple import du helper ne prouve rien. */
  /* Par CURSEUR sur l'id : une pagination par decalage rend doublons et absents pendant un import. */
  for (const f of ['src/pages/admin/views/crm/useCrmData.ts', 'src/pages/vendor/views/leads/useVendorLeadsData.ts']) {
    const s = code(f);
    assert.match(s, /lireParCurseur<ImportedLead>\(\(apres, taille\) => \{[\s\S]{0,400}\(apres \? base\.gt\('id', apres\) : base\)\.order\('id', \{ ascending: true \}\)\.limit\(taille\)/, f);
    assert.doesNotMatch(s, /\.range\(/, f + ' : plus de pagination par decalage');
  }
  assert.match(code('src/pages/admin/views/crm/useCrmData.ts'), /pendantLecture\.current\?\.ajouts\.set\(inserted\.id, inserted\)/, 'les insertions recues pendant la lecture sont gardees');
  assert.equal((code('src/lib/ongletsDepot.ts').match(/lireToutesLesLignes</g) ?? []).length, 3, 'registre, colonnes d onglet et appartenances');
  const crm = code('src/pages/admin/views/crm/useCrmData.ts');
  assert.equal((crm.match(/table: 'leads', filter: filtre \}/g) ?? []).length, 2, 'INSERT et UPDATE filtres par societe');
  assert.match(crm, /const filtre = `company_id=eq\.\$\{companyId\}`/);
  assert.match(crm, /\.delete\(\)\.in\('id', lot\)\.eq\('company_id', companyId\)/);
  assert.match(crm, /\.update\(\{ vendor_id: vendorId \}\)\.in\('id', lot\)\.eq\('company_id', companyId\)/);
  assert.equal((crm.match(/i \+= 150/g) ?? []).length, 2, 'transfert et suppression par lots de 150 identifiants');
  /* On n'agit que sur les leads selectionnes ET affiches : le corps de la fonction, pas son nom. */
  assert.match(crm, /function idsSelectionnesAffiches\(\) \{ return filteredIds\.filter\(id => selected\.has\(id\)\); \}/);
  assert.equal((crm.match(/const ids = idsSelectionnesAffiches\(\);/g) ?? []).length, 2, 'transfert et suppression');
  const depot = code('src/lib/ongletsDepot.ts');
  assert.doesNotMatch(depot, /\.delete\(/, 'aucune suppression d onglet, de colonne ni de rattachement');
});

test('A4 liens : toujours par lienSur, toujours noopener, jamais de lien d appel sur desktop', () => {
  const v = code('src/components/leads/ValeurLead.tsx');
  assert.match(v, /lienSur\(v\)/);
  assert.match(v, /rel="noopener noreferrer"/);
  assert.doesNotMatch(v, /['"`]tel:|telHref|BoutonAppel/);
  for (const f of ['src/pages/admin/views/crm/CrmTableRow.tsx', 'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx']) {
    assert.doesNotMatch(code(f), /<a\s[^>]*href=\{[^}]*data\[/, f + ' : aucune valeur importee en href brut');
  }
});

test('A5 la barre d onglet et la recherche sont montees UNE fois, au-dessus des deux presentations', () => {
  for (const f of ['src/pages/admin/views/Crm.tsx', 'src/pages/vendor/views/VendorLeads.tsx']) {
    const s = code(f);
    assert.equal(s.split('<BarreOnglet').length - 1, 1, f);
    assert.ok(s.indexOf('<BarreOnglet') < s.search(/hidden md:block|md:hidden/), f);
    assert.match(s, /useEstBureau\(\)/, f + ' : un seul arbre monte');
    assert.match(s, /useRenduProgressif\(/, f + ' : rendu par tranches');
  }
});

test('A7 retour au lead : les deux tableaux de bord DEMANDENT le lead, les deux CRM servent la demande', () => {
  for (const f of ['src/pages/admin/dashboard/useAdminDashboardEffects.ts', 'src/pages/vendor/VendorDashboard.tsx']) {
    const s = code(f);
    assert.match(s, /demanderLeadVisible\(leadId\)/, f);
    assert.match(s, /if \(\+\+n < 60\) setTimeout\(poll, 150\)/, f + ' : 9 s de recherche');
  }
  for (const f of ['src/pages/admin/views/Crm.tsx', 'src/pages/vendor/views/VendorLeads.tsx']) {
    const s = code(f);
    assert.match(s, /const leadDemande = useLeadDemande\(\);/, f);
    assert.match(s, /if \(i >= 0\) \{ inclure\(i\); leadMontre\(leadDemande\); defilerVersLead\(leadDemande\); return; \}/, f);
    assert.match(s, /og\.choisir\(ONGLET_PRINCIPAL\)/, f + ' : un lead hors de l onglet ouvert fait rouvrir Principal');
  }
  assert.match(code('src/pages/vendor/views/VendorLeads.tsx'), /d\.workMode\.activeId[\s\S]{0,200}inclure\(i\)/, 'mode travail du commercial au-dela de 200');
});

test('A8 la demande « montrer ce lead » expire, et le CRM defile lui-meme', () => {
  const s = code('src/lib/leadAMontrer.ts');
  assert.match(s, /minuterie = setTimeout\(oublier, DUREE_DEMANDE_MS\)/, 'une demande non servie est oubliee');
  for (const f of ['src/pages/admin/views/Crm.tsx', 'src/pages/vendor/views/VendorLeads.tsx']) {
    assert.match(code(f), /leadMontre\(leadDemande\); defilerVersLead\(leadDemande\);/, f);
  }
  assert.match(code('src/hooks/useRenduProgressif.ts'), /if \(etat\.cle !== cle\) setEtat\(\{ cle, limite: pas \}\);/, 'remise a zero dans le rendu, pas dans un effet');
  assert.match(code('src/lib/ongletsDepot.ts'), /const LOT_IDS = 150;/, 'listes d identifiants sous la limite d URL');
  /* L email transmis a « se connecter en tant que client » reste celui de data, comme avant. */
  for (const f of ['src/pages/admin/views/crm/CrmTableRow.tsx', 'src/pages/admin/views/crm/CrmMobileLeadCard.tsx',
    'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx', 'src/pages/vendor/views/leads/VendorLeadMobileCard.tsx']) {
    assert.match(code(f), /lead\.data\['Email'\] \?\? ''/, f);
  }
});

test('A6 aucun releve sous src/ (le build Vite les ramasserait)', () => {
  const trouves: string[] = [];
  const parcourir = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (n.endsWith('.test.ts') || n.endsWith('.test.tsx')) trouves.push(p);
    }
  };
  parcourir('src');
  assert.deepEqual(trouves, []);
});
