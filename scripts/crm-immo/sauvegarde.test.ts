// La sauvegarde CRM Immo : les deux listes doivent s'accorder, et crm_immo_acces en rester dehors.
//   node --test scripts/crm-immo/sauvegarde.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CRM_BACKUP_TABLES, CRM_TABLE_NAMES, RESTORE_ORDER } from "../../src/pages/admin/views/sauvegarde/restoreConstants.ts";

/*
 * Le module de sauvegarde tient DEUX listes a la main, dans deux fichiers :
 *   CRM_BACKUP_TABLES  -> CRM_TABLE_NAMES, sur quoi l'EXPORT boucle
 *   RESTORE_ORDER                        , sur quoi la RESTAURATION boucle
 *
 * Une table presente dans la premiere et absente de la seconde est SAUVEGARDEE puis
 * JAMAIS RESTAUREE, et le rapport ne la mentionne meme pas : la sauvegarde parait
 * complete et le module revient vide. C'est l'echec le plus couteux du lot, parce qu'on
 * ne le decouvre qu'au moment ou on avait besoin de la sauvegarde.
 *
 * Et crm_immo_acces ne doit JAMAIS y entrer : la restauration REECRIT company_id avec la
 * Societe de destination. Une sauvegarde de Bellisimmo restauree chez une voisine lui
 * accorderait le module.
 */

const TABLES_DONNEES = ["crm_immo_dossiers", "crm_immo_colonnes", "crm_immo_etats"];

test("les trois tables de donnees sont dans la liste de sauvegarde", () => {
  for (const nom of TABLES_DONNEES) {
    const entree = CRM_BACKUP_TABLES.find(t => t.name === nom);
    assert.ok(entree, nom + " manque dans CRM_BACKUP_TABLES : elle ne serait pas sauvegardee");
    assert.equal(entree!.category, "crm", nom + " doit etre dans la categorie crm");
    assert.ok(entree!.label.length > 0, nom + " doit porter un libelle lisible");
  }
});

test("crm_immo_acces n est dans AUCUNE des deux listes", () => {
  /* La regle de securite du lot. Elle vaut aussi pour toute variante du nom. */
  assert.ok(!CRM_TABLE_NAMES.includes("crm_immo_acces"),
    "crm_immo_acces est dans la liste d export : une restauration accorderait le module a la mauvaise Societe");
  assert.ok(!(RESTORE_ORDER as readonly string[]).includes("crm_immo_acces"),
    "crm_immo_acces est dans l ordre de restauration");
  /* Et le fichier lui-meme ne doit pas la nommer comme une table a sauvegarder. */
  const src = readFileSync("src/pages/admin/views/sauvegarde/restoreConstants.ts", "utf8");
  assert.ok(!/name:\s*'crm_immo_acces'/.test(src), "crm_immo_acces est declaree comme table de sauvegarde");
});

test("LES DEUX LISTES S ACCORDENT : rien de sauvegarde qui ne soit restaure", () => {
  const aRestaurer = new Set(RESTORE_ORDER as readonly string[]);
  const manquantes = CRM_TABLE_NAMES.filter(n => !aRestaurer.has(n));
  assert.deepEqual(manquantes, [],
    "ces tables seraient sauvegardees mais JAMAIS restaurees : " + manquantes.join(", "));

  const aSauvegarder = new Set(CRM_TABLE_NAMES);
  const orphelines = (RESTORE_ORDER as readonly string[]).filter(n => !aSauvegarder.has(n));
  assert.deepEqual(orphelines, [],
    "ces tables seraient restaurees mais jamais sauvegardees : " + orphelines.join(", "));
});

test("L ORDRE respecte la cle etrangere composee : dossiers AVANT etats", () => {
  const ordre = RESTORE_ORDER as readonly string[];
  const iDossiers = ordre.indexOf("crm_immo_dossiers");
  const iEtats = ordre.indexOf("crm_immo_etats");
  assert.ok(iDossiers >= 0 && iEtats >= 0, "les deux tables doivent etre dans l ordre de restauration");
  /* crm_immo_etats porte FOREIGN KEY (dossier_id, company_id) -> crm_immo_dossiers(id,
     company_id). L'inverse echoue en 23503, et la restauration s'arreterait la. */
  assert.ok(iDossiers < iEtats,
    "crm_immo_etats est restauree AVANT crm_immo_dossiers : la cle etrangere echouerait en 23503");
});

test("les trois tables portent company_id pour la reecriture", () => {
  const src = readFileSync("src/pages/admin/views/sauvegarde/useRestoreCrm.ts", "utf8");
  const debut = src.indexOf("const TABLES_WITH_COMPANY_ID");
  assert.ok(debut > 0, "TABLES_WITH_COMPANY_ID n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("]);", debut));
  for (const nom of TABLES_DONNEES) {
    assert.ok(bloc.includes("'" + nom + "'"),
      nom + " manque dans TABLES_WITH_COMPANY_ID : ses lignes remonteraient avec le company_id d origine");
  }
  assert.ok(!bloc.includes("'crm_immo_acces'"), "crm_immo_acces n a rien a faire dans cette liste");
});

test("aucune table crm_immo n a ete oubliee entre le schema et la sauvegarde", () => {
  /* Les quatre tables du module sont connues : trois de donnees, une de droit. Si une
     cinquieme apparaissait un jour, ce test force a decider explicitement de son sort
     plutot que de la laisser hors sauvegarde par inadvertance. */
  const dansLaSauvegarde = CRM_TABLE_NAMES.filter(n => n.startsWith("crm_immo_"));
  assert.deepEqual([...dansLaSauvegarde].sort(), [...TABLES_DONNEES].sort(),
    "la liste des tables crm_immo sauvegardees a change : verifier que c est voulu");
});
