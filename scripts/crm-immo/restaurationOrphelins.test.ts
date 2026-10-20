// Restaurer un etat ou un commentaire dont le dossier n'existe pas : l'ecarter, pas planter.
//   node --test scripts/crm-immo/restaurationOrphelins.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ecarterOrphelins, valeursAVerifier } from "../../src/lib/restaureOrphelins.ts";
import {
  FK_RULES, RESTORE_ORDER, CRM_TABLE_NAMES, type FkRule,
} from "../../src/pages/admin/views/sauvegarde/restoreConstants.ts";

/*
 * CE QUI SE PASSAIT AVANT, ET POURQUOI CE FICHIER EXISTE.
 *
 * FK_RULES existait depuis longtemps, mais il ne servait qu'a PREVENIR :
 * validateFkCoherence fabriquait des avertissements affiches dans le rapport, et la
 * boucle d'insertion envoyait ensuite les lignes telles quelles. Une ligne orpheline
 * partait donc quand meme, et Postgres la refusait en 23503.
 *
 * Et le degat depassait cette ligne : l'envoi se fait par LOTS. Une seule orpheline fait
 * echouer tout son lot — jusqu'a cent lignes parfaitement valides perdues avec elle, et
 * un message Postgres brut dans le rapport.
 *
 * Le tri vit maintenant dans une fonction PURE, hors de React et de Supabase. C'est ce
 * qui le rend eprouvable ici : les quatre cas qui comptent se verifient en memoire.
 */

const lire = (p: string) => readFileSync(p, "utf8");

const ETAT = (id: string, dossier: string) => ({
  id, company_id: "c1", dossier_id: dossier, genre: "loyer", periode: "2026-10",
});
const COMMENTAIRE = (id: string, dossier: string) => ({
  id, company_id: "c1", dossier_id: dossier, contenu: "note " + id,
});

const REGLE_DOSSIER: FkRule[] = [
  { column: "dossier_id", referencedTable: "crm_immo_dossiers", referencedColumn: "id" },
];

// ===========================================================================
// 1 & 2 — LES DEUX CAS DEMANDES
// ===========================================================================

test("1 — dossier present + etat present : l etat est restaure", () => {
  const etats = [ETAT("e1", "d1"), ETAT("e2", "d1"), ETAT("e3", "d2")];
  const presents = { crm_immo_dossiers: new Set(["d1", "d2"]) };

  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, presents);

  assert.equal(tri.gardees.length, 3, "les trois etats doivent etre restaures");
  assert.deepEqual(tri.ignorees, [], "aucun ne doit etre ecarte");
  assert.deepEqual(tri.parentsManquants, [], "aucun parent ne manque");
});

test("2 — dossier absent + etat present : l etat est ecarte, proprement", () => {
  /*
   * << Proprement >> veut dire trois choses, et les trois sont verifiees :
   * la ligne ne part pas, les autres partent quand meme, et l'ecart est NOMME.
   */
  const etats = [ETAT("e1", "d1"), ETAT("e2", "disparu"), ETAT("e3", "d1")];
  const presents = { crm_immo_dossiers: new Set(["d1"]) };

  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, presents);

  assert.equal(tri.gardees.length, 2, "les deux etats valides doivent survivre a l orpheline");
  assert.deepEqual(tri.gardees.map(e => e.id), ["e1", "e3"]);
  assert.equal(tri.ignorees.length, 1, "l orpheline doit etre ecartee");
  assert.equal(tri.ignorees[0].id, "e2");
  assert.deepEqual(tri.parentsManquants, ["disparu"],
    "l identifiant introuvable doit etre nomme : sinon l ecart est inexplicable");
});

// ===========================================================================
// 3 — AUCUN 23503
// ===========================================================================

test("3 — plus aucune ligne orpheline n atteint la base", () => {
  /*
   * C'est LA garantie demandee. On fabrique une sauvegarde ou une ligne sur trois est
   * orpheline, et on verifie qu'il n'en reste aucune apres le tri : ce qui part en base
   * ne peut plus declencher 23503 sur cette cle.
   */
  const dossiersPresents = new Set(["d1", "d2", "d3"]);
  const etats = [];
  for (let i = 0; i < 30; i++) {
    etats.push(ETAT("e" + i, i % 3 === 0 ? "efface-" + i : "d" + ((i % 3) + 1)));
  }

  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, { crm_immo_dossiers: dossiersPresents });

  assert.equal(tri.ignorees.length, 10, "une ligne sur trois etait orpheline");
  assert.equal(tri.gardees.length, 20);
  for (const g of tri.gardees) {
    assert.ok(dossiersPresents.has(String(g.dossier_id)),
      "une orpheline a franchi le tri : elle declencherait 23503 — " + g.id);
  }
});

test("3 bis — une orpheline n emporte plus son LOT avec elle", () => {
  /*
   * L'envoi se fait par lots de cent. Avant le tri, une seule orpheline faisait echouer
   * tout son lot : quatre-vingt-dix-neuf lignes valides perdues, et le rapport annoncait
   * une erreur Postgres brute au lieu de nommer la coupable.
   */
  const etats = [ETAT("orpheline", "disparu")];
  for (let i = 0; i < 99; i++) etats.push(ETAT("ok" + i, "d1"));

  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, { crm_immo_dossiers: new Set(["d1"]) });

  assert.equal(tri.gardees.length, 99, "les 99 lignes valides du lot doivent survivre");
  assert.equal(tri.ignorees.length, 1);
});

test("3 ter — une restauration PARTIELLE se juge sur la destination, pas sur le fichier", () => {
  /*
   * Le cas qui motive tout : on restaure les etats SEULS, sur une base qui possede deja
   * les dossiers. Le fichier de sauvegarde ne contient alors aucun dossier — les juger
   * sur son contenu les declarerait tous orphelins, et la restauration ne poserait rien.
   *
   * C'est pour cela que le hook interroge la BASE et non le fichier, et que cette
   * fonction recoit un ensemble d'identifiants plutot qu'une sauvegarde.
   */
  const etats = [ETAT("e1", "deja-en-base"), ETAT("e2", "deja-en-base-2")];
  const presents = { crm_immo_dossiers: new Set(["deja-en-base", "deja-en-base-2"]) };

  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, presents);
  assert.equal(tri.gardees.length, 2, "une restauration partielle valide ne doit rien ecarter");
});

test("3 quater — on ne jette pas quand on ne SAIT pas", () => {
  /*
   * Si la lecture de la table parente echoue, le hook renonce a trier plutot que de
   * trier a l'aveugle. Juger sans savoir ecarterait des lignes valides — ce qui est pire
   * qu'un 23503 visible, parce que silencieux.
   */
  const etats = [ETAT("e1", "d1"), ETAT("e2", "d2")];
  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, {});   // aucune connaissance
  assert.equal(tri.gardees.length, 2, "sans connaissance de la table parente, on ne jette rien");
  assert.equal(tri.ignorees.length, 0);
});

test("3 quinquies — une valeur NULLE n est pas une orpheline", () => {
  /* Une ligne sans parent sur une colonne NOT NULL echouera pour une autre raison. La
     masquer ici cacherait le vrai probleme. */
  const etats = [{ ...ETAT("e1", "d1"), dossier_id: null }];
  const tri = ecarterOrphelins(etats, REGLE_DOSSIER, { crm_immo_dossiers: new Set(["d1"]) });
  assert.equal(tri.gardees.length, 1, "une valeur nulle doit passer et echouer bruyamment");
});

test("3 sexies — une regle OPTIONNELLE n ecarte rien", () => {
  /*
   * Pour une regle `optional`, la colonne accepte NULL : la bonne reparation serait de
   * VIDER la colonne, pas de jeter la ligne. Et vider une colonne est une modification
   * de donnee que personne n'a demandee.
   */
  const lignes = [{ id: "l1", vendor_id: "disparu" }];
  const regles: FkRule[] = [
    { column: "vendor_id", referencedTable: "vendors", referencedColumn: "id", optional: true },
  ];
  const tri = ecarterOrphelins(lignes, regles, { vendors: new Set(["autre"]) });
  assert.equal(tri.gardees.length, 1, "une regle optionnelle garde son comportement d avertissement");
});

test("3 septies — on ne demande a la base que ce qu il faut verifier", () => {
  /* Une liste trop large couterait un aller-retour pour rien ; les doublons aussi. */
  const etats = [ETAT("e1", "d1"), ETAT("e2", "d1"), ETAT("e3", "d2"), { ...ETAT("e4", "x"), dossier_id: null }];
  const a = valeursAVerifier(etats, REGLE_DOSSIER);
  assert.deepEqual([...a.crm_immo_dossiers].sort(), ["d1", "d2"],
    "les doublons et les nulles ne doivent pas etre demandes a la base");
});

// ===========================================================================
// 4 — LES COMMENTAIRES GARDENT LEUR ORDRE
// ===========================================================================

test("4 — les deux tables filles sont restaurees APRES les dossiers", () => {
  /*
   * crm_immo_etats ET crm_immo_commentaires portent la meme cle etrangere composee
   * (dossier_id, company_id) vers crm_immo_dossiers. Les restaurer avant les dossiers
   * echoue en 23503 — et le tri ne sauverait rien, puisqu'il jugerait sur une base ou
   * les dossiers ne sont pas encore poses, donc il les ecarterait TOUTES.
   *
   * L'ordre est donc une condition du tri, pas une alternative.
   */
  const ordre = [...RESTORE_ORDER] as string[];
  const iDossiers = ordre.indexOf("crm_immo_dossiers");
  assert.ok(iDossiers >= 0, "crm_immo_dossiers a disparu de l ordre de restauration");

  for (const fille of ["crm_immo_etats", "crm_immo_commentaires"]) {
    const i = ordre.indexOf(fille);
    assert.ok(i >= 0, fille + " a disparu de l ordre de restauration");
    assert.ok(i > iDossiers,
      fille + " est restauree AVANT les dossiers : le tri les ecarterait toutes");
  }
});

test("4 bis — les deux tables filles ont leur regle, et elle pointe le bon parent", () => {
  for (const fille of ["crm_immo_etats", "crm_immo_commentaires"]) {
    const regles = FK_RULES[fille];
    assert.ok(regles && regles.length > 0, fille + " n a aucune regle FK : ses orphelines partiraient en base");
    const r = regles.find(x => x.referencedTable === "crm_immo_dossiers");
    assert.ok(r, fille + " ne reference pas crm_immo_dossiers");
    assert.equal(r!.column, "dossier_id", fille + " : la colonne de liaison a change");
    assert.equal(r!.referencedColumn, "id", fille + " : la colonne referencee a change");
    assert.ok(!r!.optional,
      fille + " : la regle est devenue optionnelle, donc elle n ecarte plus rien");
  }
});

test("4 ter — le hook ECARTE vraiment, il ne se contente plus de prevenir", () => {
  /*
   * Le defaut d'origine : FK_RULES ne produisait que des `fkWarnings`, et la boucle
   * envoyait les lignes telles quelles. Ce test echoue si quelqu'un revient a cet etat.
   */
  const hook = lire("src/pages/admin/views/sauvegarde/useRestoreCrm.ts");
  assert.match(hook, /import \{ ecarterOrphelins, valeursAVerifier \}/,
    "le hook n importe plus le tri : FK_RULES redevient un simple avertissement");
  assert.match(hook, /const tri = ecarterOrphelins\(toutes, regles, presents\)/,
    "le tri n est plus applique avant l envoi");
  assert.match(hook, /rows = tri\.gardees/,
    "ce qui part en base n est plus le resultat du tri");

  /* Et la lecture se fait bien sur la DESTINATION. */
  assert.match(hook, /supabase\.from\(tableParente\)\.select\(colonne\)\.in\(colonne, tranche\)/,
    "le hook ne verifie plus l existence des parents en base");

  /* L ecart doit remonter au rapport : une restauration qui tait ce qu elle a ecarte
     annonce un nombre de lignes qui ne correspond pas a ce qu elle a pose. */
  assert.match(hook, /ignored: ignorees/, "le compte des ecartees ne remonte plus au rapport");
  /*
   * Le rapport doit faire DEUX choses, et les deux sont verifiees separement : decider
   * s il y a quelque chose a dire, et le dire. Une seule assertion sur << tr.ignored >>
   * passait alors que l une des deux avait disparu — trouve par mutation.
   */
  const rapport = lire("src/pages/admin/views/sauvegarde/RestoreReport.tsx");
  assert.match(rapport, /\(tr\.ignored \?\? 0\) > 0 &&/,
    "le rapport ne decide plus d afficher l ecart");
  assert.match(rapport, /\{tr\.ignored\} ecartee/,
    "le rapport n affiche plus le NOMBRE de lignes ecartees");
  assert.match(rapport, /tr\.missingParents && tr\.missingParents\.length > 0/,
    "le rapport ne nomme plus les parents introuvables : l ecart devient inexplicable");
  assert.match(rapport, /tr\.missingParents\.slice\(0, 3\)\.join/,
    "l infobulle ne liste plus les identifiants manquants");
});

// ===========================================================================
// 5 — crm_immo_acces RESTE DEHORS
// ===========================================================================

test("5 — crm_immo_acces n est dans AUCUNE liste, et n a aucune regle", () => {
  /*
   * Regle de securite, pas un oubli : la restauration REECRIT company_id avec la Societe
   * de destination. Une sauvegarde de Bellisimmo restauree chez une voisine lui
   * accorderait le module. Le droit d'utiliser CRM Immo appartient a Talvex, pas aux
   * donnees metier d'une Societe.
   */
  assert.ok(!CRM_TABLE_NAMES.includes("crm_immo_acces"),
    "crm_immo_acces est sauvegardee : une restauration ailleurs accorderait le module");
  assert.ok(!([...RESTORE_ORDER] as string[]).includes("crm_immo_acces"),
    "crm_immo_acces est restauree : une restauration ailleurs accorderait le module");
  assert.ok(!Object.keys(FK_RULES).includes("crm_immo_acces"),
    "crm_immo_acces a une regle FK : elle n a rien a faire dans le circuit de restauration");

  /* Et aucune regle ne la designe comme PARENT : ce serait un chemin detourne. */
  for (const [table, regles] of Object.entries(FK_RULES)) {
    for (const r of regles) {
      assert.notEqual(r.referencedTable, "crm_immo_acces",
        table + " reference crm_immo_acces : la table entrerait dans le circuit");
    }
  }

  /* Le circuit entier ne doit pas la nommer. */
  for (const f of [
    "src/pages/admin/views/sauvegarde/restoreConstants.ts",
    "src/pages/admin/views/sauvegarde/useRestoreCrm.ts",
    "src/lib/restaureOrphelins.ts",
  ]) {
    const code = lire(f).split("\n").filter(l => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
    assert.ok(!code.includes("crm_immo_acces"),
      f + " nomme crm_immo_acces dans son CODE : elle deviendrait restaurable");
  }
});

test("4 quater — les commentaires sont tries par la MEME regle que les etats", () => {
  /*
   * Les deux tables filles partagent la cle, donc elles partagent le defaut et la
   * correction. Les eprouver separement evite qu'une seule des deux soit branchee : le
   * jour ou quelqu'un retire une des deux regles, un seul test tomberait, et il nommerait
   * laquelle.
   */
  const commentaires = [
    COMMENTAIRE("k1", "d1"),
    COMMENTAIRE("k2", "efface"),
    COMMENTAIRE("k3", "d1"),
  ];
  const tri = ecarterOrphelins(commentaires, FK_RULES.crm_immo_commentaires, {
    crm_immo_dossiers: new Set(["d1"]),
  });

  assert.deepEqual(tri.gardees.map(c => c.id), ["k1", "k3"],
    "les commentaires valides doivent survivre a l orphelin");
  assert.equal(tri.ignorees.length, 1);
  assert.deepEqual(tri.parentsManquants, ["efface"]);

  /* Et la regle utilisee est bien celle du fichier, pas une copie du test. */
  assert.deepEqual(
    FK_RULES.crm_immo_commentaires.map(r => r.column + '->' + r.referencedTable),
    FK_RULES.crm_immo_etats.map(r => r.column + '->' + r.referencedTable),
    "les deux tables filles ne pointent plus le meme parent par la meme colonne",
  );
});
