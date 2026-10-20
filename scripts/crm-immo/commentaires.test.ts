// L'historique des commentaires : la table, la modale Details, et ce qui ne doit pas revenir.
//   node --test scripts/crm-immo/commentaires.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/*
 * CE QUI A ETE EPROUVE EN BASE, ET QUE CE FICHIER EMPECHE DE PERDRE.
 *
 * Treize sondes en role reel, chacune rendant son propre `current_user`, avec la
 * contre-epreuve `postgres` dans la MEME transaction — un 0 qui vaut 0 des deux cotes ne
 * prouve rien :
 *
 *   anon                               0 ligne   (postgres en voit 1)
 *   Bellisimmo, qui a le module        1
 *   une Societe voisine                0
 *   le Groupe parent de Bellisimmo     1
 *   Talvex                             1
 *   la voisine ecrit sur le dossier d autrui      42501
 *   la voisine usurpe le company_id               42501
 *   Bellisimmo ecrit chez elle                    accepte
 *   contenu vide                                  23514
 *   5001 caracteres                               23514
 *   suppression du dossier                        1 commentaire -> 0
 *
 * Ces mesures ne se rejouent pas ici : un test unitaire n'a pas de base. Ce fichier garde
 * ce dont elles dependent — le schema ecrit, et les regles que l'interface annonce.
 */

const lire = (p: string) => readFileSync(p, "utf8");
const D = "src/pages/admin/views/crm-immo/";
const MIGRATION = "supabase/migrations/20261020145413_create_crm_immo_commentaires.sql";

const OUVRE = "/" + "*";
const FERME = "*" + "/";
function codeSeul(src: string): string {
  let out = "", i = 0;
  while (i < src.length) {
    if (src.startsWith(OUVRE, i)) { const f = src.indexOf(FERME, i + 2); i = f === -1 ? src.length : f + 2; continue; }
    if (src.startsWith("--", i)) { const f = src.indexOf("\n", i); i = f === -1 ? src.length : f; continue; }
    if (src.startsWith("//", i)) { const f = src.indexOf("\n", i); i = f === -1 ? src.length : f; continue; }
    out += src[i]; i += 1;
  }
  return out;
}

test("garde du garde — la migration et les fichiers existent", () => {
  assert.ok(lire(MIGRATION).length > 2000, "la migration est vide ou tronquee");
  for (const f of ["useCrmImmoCommentaires.ts", "CrmImmoCommentaires.tsx", "CrmImmoDetailsModal.tsx", "CrmImmoChampsDossier.tsx"]) {
    assert.ok(lire(D + f).length > 500, D + f + " : vide ou tronque");
  }
});

// ===========================================================================
// A — LE SCHEMA
// ===========================================================================

test("A1 — la cle etrangere est COMPOSEE : company_id ne peut pas mentir", () => {
  /*
   * Avec une FK simple sur `dossier_id`, une Societe pourrait inserer un commentaire
   * portant SON company_id sur le dossier d'une voisine : la RLS le laisserait passer,
   * puisqu'elle ne regarde que company_id. La cle composee rend cette ligne impossible a
   * ECRIRE — pas seulement impossible a lire.
   *
   * Mesure : la voisine recoit 42501 dans les deux sens (avec son company_id comme avec
   * celui de Bellisimmo).
   */
  const sql = codeSeul(lire(MIGRATION));
  const m = sql.match(/FOREIGN KEY\s*\(dossier_id,\s*company_id\)\s*REFERENCES\s+public\.crm_immo_dossiers\(id,\s*company_id\)/i);
  assert.ok(m, "la cle etrangere n est plus composee : company_id redevient declaratif");
  assert.match(sql, /ON DELETE CASCADE/i, "supprimer un dossier n emporte plus ses commentaires");
});

test("A2 — AUCUNE contrainte d unicite : un index unique repond hors RLS", () => {
  /*
   * L'oracle de contenu corrige le 19 octobre sur crm_immo_etats : un index unique est
   * verifie HORS RLS et AVANT les declencheurs de cle etrangere, donc son 23505 repond a
   * travers les cloisons.
   *
   * Ici il n'y a rien a rendre unique — plusieurs commentaires par dossier sont le propre
   * d'un historique. Une contrainte ajoutee plus tard rouvrirait ce canal.
   */
  const sql = codeSeul(lire(MIGRATION));
  assert.ok(!/\bUNIQUE\b/i.test(sql),
    "une contrainte d unicite est apparue : elle repondrait a travers les Societes, hors RLS");
});

test("A3 — les trois politiques passent TOUTES par has_crm_immo_access", () => {
  /*
   * Exigence de David : << Ne cree pas une logique de droit parallele. >> Les commentaires
   * suivent exactement le droit du dossier. Une Societe qui perd le module perd l acces a
   * ses commentaires au meme instant qu a ses dossiers, sans second reglage.
   */
  const sql = codeSeul(lire(MIGRATION));
  const politiques = [...sql.matchAll(/CREATE POLICY\s+"([^"]+)"[\s\S]*?;/g)];
  assert.equal(politiques.length, 3,
    "il doit y avoir exactement trois politiques (Admin, Groupe, Talvex), pas " + politiques.length);

  const roles = politiques.map(p => p[0]);
  const admin = roles.find(r => /'admin'/.test(r));
  const csa = roles.find(r => /'company_super_admin'/.test(r));
  const sa = roles.find(r => /'super_admin'(?!.*company)/.test(r) && !/company_super_admin/.test(r));
  assert.ok(admin, "la politique Admin a disparu");
  assert.ok(csa, "la politique Groupe a disparu");
  assert.ok(sa, "la politique Talvex a disparu");

  /*
   * DANS LES DEUX MOITIES, pas dans l'une ou l'autre.
   *
   * USING filtre ce qu'on LIT, WITH CHECK ce qu'on ECRIT. Une politique qui porterait la
   * garde seulement dans WITH CHECK laisserait une Societe a qui Talvex vient de retirer
   * le module continuer a LIRE ses anciens commentaires. Trouve par mutation : retirer la
   * clause d'un seul des deux ne faisait echouer aucun test.
   */
  for (const [nom, p] of [["Admin", admin!], ["Groupe", csa!]] as [string, string][]) {
    const iCheck = p.search(/WITH CHECK/i);
    assert.ok(iCheck > 0, "la politique " + nom + " n a plus de WITH CHECK : elle n encadre plus l ecriture");
    const lecture = p.slice(0, iCheck);
    const ecriture = p.slice(iCheck);
    assert.match(lecture, /has_crm_immo_access/,
      "la politique " + nom + " ne garde plus la LECTURE : une Societe sans le module lirait ses anciens commentaires");
    assert.match(ecriture, /has_crm_immo_access/,
      "la politique " + nom + " ne garde plus l ECRITURE");
  }
  /* Le Groupe doit aussi pouvoir atteindre ses FILLES, pas seulement sa propre ligne. */
  assert.match(csa!, /is_child_company_of_caller/,
    "le Groupe ne voit plus les commentaires de ses filles");
});

test("A4 — la colonne `commentaire` du dossier n est PAS supprimee", () => {
  /*
   * Regle de la maison : on masque, on ne supprime pas. Le front cesse d y ecrire et de
   * l afficher, mais une Societe qui aurait deja saisi quelque chose ne le perd pas.
   */
  const sql = codeSeul(lire(MIGRATION));
  assert.ok(!/DROP\s+COLUMN/i.test(sql), "la migration supprime une colonne");
  assert.ok(!/ALTER TABLE\s+public\.crm_immo_dossiers/i.test(sql),
    "la migration touche a crm_immo_dossiers : elle doit etre purement additive");
});

test("A5 — l index sert les deux lectures ET la cascade", () => {
  /* Sans index sur (company_id, dossier_id, ...), supprimer un dossier balaierait toute
     la table, et compter les commentaires de cent dossiers la lirait cent fois. */
  const sql = codeSeul(lire(MIGRATION));
  assert.match(sql, /CREATE INDEX[\s\S]{0,120}\(company_id,\s*dossier_id,\s*created_at DESC\)/i,
    "l index (company_id, dossier_id, created_at DESC) a disparu");
});

// ===========================================================================
// B — CE QUE L INTERFACE ANNONCE DOIT CORRESPONDRE A LA BASE
// ===========================================================================

test("B1 — la borne annoncee par l interface est celle du CHECK", () => {
  /*
   * La base refuse de toute facon — on ne peut pas contourner la regle. Mais son refus
   * revient sous la forme d un message Postgres que personne ne comprend. L interface
   * l annonce donc AVANT, et les deux chiffres doivent etre le meme.
   */
  const sql = codeSeul(lire(MIGRATION));
  const m = sql.match(/char_length\(contenu\)\s*<=\s*(\d+)/i);
  assert.ok(m, "le CHECK de longueur a disparu de la migration");
  const enBase = Number(m![1]);

  const types = lire(D + "crmImmoTypes.ts");
  const t = types.match(/COMMENTAIRE_MAX\s*=\s*(\d+)/);
  assert.ok(t, "COMMENTAIRE_MAX a disparu des types");
  assert.equal(Number(t![1]), enBase,
    "l interface annonce " + t![1] + " caracteres, la base en accepte " + enBase);
});

test("B2 — un contenu vide est refuse AVANT l aller-retour", () => {
  const sql = codeSeul(lire(MIGRATION));
  assert.match(sql, /btrim\(contenu\)\s*<>\s*''/i, "le CHECK du contenu vide a disparu");
  const hook = codeSeul(lire(D + "useCrmImmoCommentaires.ts"));
  assert.match(hook, /texte === ''/, "le hook n annonce plus le refus d un commentaire vide");
});

test("B3 — ZERO ligne rendue est traite comme le refus que c est", () => {
  /*
   * Le piege central de supabase-js, deja rencontre quatre fois dans ce module : un
   * INSERT ou un DELETE que la RLS refuse rend { error: null } et ZERO ligne.
   * L interface croirait avoir reussi.
   */
  const hook = codeSeul(lire(D + "useCrmImmoCommentaires.ts"));
  for (const [verbe, motif] of [["insert", /\.insert\([\s\S]{0,200}?\.select\(/], ["delete", /\.delete\(\)[\s\S]{0,200}?\.select\(/]] as [string, RegExp][]) {
    assert.match(hook, motif, "l " + verbe + " ne demande plus ses lignes en retour");
  }
  assert.equal((hook.match(/length === 0/g) ?? []).length, 2,
    "les deux ecritures doivent verifier le nombre de lignes rendues");
});

test("B4 — le compte ne rapatrie que des identifiants, jamais des contenus", () => {
  /*
   * Le tableau affiche << Commentaires (3) >> sur chaque ligne. Lire les contenus pour
   * afficher un chiffre, c est, avec cent dossiers de dix commentaires, mille textes lus
   * a chaque ouverture du module pour n en afficher aucun.
   */
  const hook = lire(D + "useCrmImmoCommentaires.ts");
  const i = hook.indexOf("export function useCrmImmoNombreCommentaires");
  assert.ok(i > 0, "le hook du compte a disparu");
  const bloc = codeSeul(hook.slice(i));
  const select = bloc.match(/\.select\('([^']*)'\)/);
  assert.ok(select, "le compte ne fait plus de select");
  assert.equal(select![1], "dossier_id",
    "le compte rapatrie " + select![1] + " : il ne doit lire que les identifiants");
});

// ===========================================================================
// C — UNE SEULE MODALE, DEUX PORTES D ENTREE
// ===========================================================================

test("C1 — le bouton Details et le bouton Commentaires ouvrent la MEME modale", () => {
  /*
   * Exigence litterale de David : << Je ne veux pas deux modales differentes. Une seule
   * modale Details avec navigation interne. >>
   *
   * L onglet de depart est donc une PROP, et le parent ne porte qu UN etat.
   */
  const vue = codeSeul(lire("src/pages/admin/views/CrmImmo.tsx"));
  assert.equal((vue.match(/<CrmImmoDetailsModal/g) ?? []).length, 1,
    "la modale Details est montee plus d une fois : ce sont deux modales");
  assert.match(vue, /ongletInitial=\{details\.onglet\}/,
    "l onglet de depart n est plus une prop : les deux boutons ouvriraient la meme vue");

  /* Et les deux boutons passent bien par le meme chemin. */
  for (const f of ["CrmImmoTable.tsx", "CrmImmoCards.tsx"]) {
    const src = codeSeul(lire(D + f));
    assert.match(src, /onDetails\(d,\s*'informations'\)/, f + " : le bouton Details n ouvre pas l onglet Informations");
    assert.match(src, /onDetails\(d,\s*'commentaires'\)/, f + " : le bouton Commentaires n ouvre pas l onglet Commentaires");
  }
});

test("C2 — la colonne Commentaire du tableau n affiche plus son texte", () => {
  /*
   * Un commentaire de CRM fait souvent plusieurs lignes : etale dans une cellule, il
   * ecrasait toutes les autres colonnes.
   */
  const table = codeSeul(lire(D + "CrmImmoTable.tsx"));
  assert.match(table, /c\.cle === 'commentaire'[\s\S]{0,200}BoutonCommentaires/,
    "la cellule Commentaire ne porte plus de bouton : elle reaffiche du texte");
  const cards = codeSeul(lire(D + "CrmImmoCards.tsx"));
  assert.match(cards, /c\.cle === 'commentaire'/,
    "la fiche mobile affiche encore le commentaire dans ses paires libelle/valeur");
});

test("C3 — le compte s affiche quand il y en a", () => {
  const table = lire(D + "CrmImmoTable.tsx");
  assert.match(table, /Commentaires \(\$\{nombre\}\)/,
    "le bouton n affiche plus le nombre : il faudrait ouvrir chaque dossier pour le savoir");
});

test("C4 — la modale Details s ouvre en LECTURE, et l edition est explicite", () => {
  /*
   * On vient voir un dossier beaucoup plus souvent qu on ne vient le corriger, et un
   * formulaire ouvert invite a modifier ce qu on voulait seulement lire.
   */
  const m = codeSeul(lire(D + "CrmImmoDetailsModal.tsx"));
  assert.match(m, /useState\(false\)/, "l etat d edition a change de defaut");
  assert.match(m, /lectureSeule=\{!edition\}/, "les champs ne sont plus en lecture par defaut");
  for (const testid of ["crm-immo-details-modifier", "crm-immo-details-enregistrer", "crm-immo-details-annuler"]) {
    assert.ok(m.includes(testid), "le bouton " + testid + " a disparu");
  }
});

test("C5 — l enregistrement passe par le MEME chemin que le formulaire", () => {
  /* dos.modifier demande ses lignes en retour et traite zero ligne comme un refus. Un
     second chemin d ecriture perdrait cette garantie. */
  const vue = codeSeul(lire("src/pages/admin/views/CrmImmo.tsx"));
  const i = vue.indexOf("async function enregistrerDepuisDetails");
  assert.ok(i > 0, "l enregistrement depuis Details a disparu");
  const bloc = vue.slice(i, i + 600);
  assert.match(bloc, /dos\.modifier\(/, "il n ecrit plus par dos.modifier");
  assert.match(bloc, /alertes\?\.recharger\(\)/,
    "les echeances ont pu changer : la cloche et le hub doivent etre rafraichis");
});

test("C6 — un commentaire ne se MODIFIE pas", () => {
  /*
   * Il n y a pas de bouton << editer >>, et c est volontaire : un historique dont les
   * entrees se reecrivent n est plus un historique. Se tromper se corrige en supprimant
   * et en reecrivant, ce qui laisse la bonne date.
   */
  const hook = codeSeul(lire(D + "useCrmImmoCommentaires.ts"));
  assert.ok(!/\.update\(/.test(hook), "le hook sait modifier un commentaire : ce n est plus un historique");
  const sql = codeSeul(lire(MIGRATION));
  assert.ok(!/updated_at/.test(sql), "la table porte un updated_at : elle n est plus immuable");
});

test("C7 — la suppression d un commentaire demande confirmation", () => {
  /* En DEUX gestes, sur place : une modale par-dessus une modale ne se ferme plus
     proprement, et Echap ne sait plus laquelle il vise. */
  const c = lire(D + "CrmImmoCommentaires.tsx");
  assert.match(c, /crm-immo-commentaire-supprimer-ok-/, "la confirmation a disparu");
  assert.match(c, /crm-immo-commentaire-renoncer-/, "le renoncement a disparu");
  assert.ok(!/fixed inset-0/.test(c), "une seconde modale est apparue par-dessus la premiere");
});

// ===========================================================================
// D — LES LIBELLES N/P
// ===========================================================================

test("D1 — N/P Locataire et N/P Proprietaire, sans toucher aux colonnes SQL", () => {
  /*
   * David : << pour l instant je demande seulement de changer les libelles affiches.
   * Ne renomme pas automatiquement les colonnes SQL. >>
   *
   * Un seul endroit porte le libelle — COLONNES_SYSTEME — et il sert A LA FOIS l en-tete
   * du tableau, le formulaire et l organisateur de colonnes. Les trois changent ensemble.
   */
  const types = lire(D + "crmImmoTypes.ts");
  assert.match(types, /cle: 'locataire', libelle: 'N\/P Locataire'/,
    "le libelle de locataire n est plus N/P Locataire");
  assert.match(types, /cle: 'proprietaire', libelle: 'N\/P Propriétaire'/,
    "le libelle de proprietaire n est plus N/P Propriétaire");

  /* Les CLES, elles, ne bougent pas : ce sont les colonnes de la base. */
  assert.match(types, /cle: 'locataire'/, "la cle SQL locataire a ete renommee");
  assert.match(types, /cle: 'proprietaire'/, "la cle SQL proprietaire a ete renommee");

  /* Et aucune migration ne renomme ces colonnes. */
  for (const f of readdirSync("supabase/migrations").filter(x => x.endsWith(".sql"))) {
    const sql = codeSeul(lire("supabase/migrations/" + f));
    assert.ok(!/RENAME COLUMN\s+(locataire|proprietaire)/i.test(sql),
      f + " renomme une colonne SQL : David a demande de ne changer que les libelles");
  }
});

// ===========================================================================
// E — LA SAUVEGARDE
// ===========================================================================

test("E1 — la nouvelle table est sauvegardee ET restauree, dans le bon ordre", () => {
  /*
   * Le piege nomme dans restoreConstants.ts : une table ajoutee a la liste d export et
   * oubliee dans l ordre de restauration serait SAUVEGARDEE puis JAMAIS RESTAUREE, sans
   * que le rapport la mentionne. La sauvegarde paraitrait complete et CRM Immo
   * reviendrait sans ses commentaires.
   */
  const c = lire("src/pages/admin/views/sauvegarde/restoreConstants.ts");
  assert.match(c, /name: 'crm_immo_commentaires'/, "la table n est pas sauvegardee");
  assert.match(c, /'crm_immo_commentaires',\n\] as const;/,
    "la table n est pas dans l ordre de restauration, ou pas en dernier");

  /* L ORDRE : elle porte la meme cle composee que crm_immo_etats, donc elle vient APRES
     les dossiers, sous peine de 23503. */
  const ordre = c.slice(c.indexOf("export const RESTORE_ORDER"));
  const iDossiers = ordre.indexOf("'crm_immo_dossiers'");
  const iCommentaires = ordre.indexOf("'crm_immo_commentaires'");
  assert.ok(iDossiers >= 0 && iCommentaires > iDossiers,
    "les commentaires sont restaures AVANT les dossiers : 23503 garanti");

  /* Et son company_id doit etre reecrit avec la Societe de destination. */
  const restore = lire("src/pages/admin/views/sauvegarde/useRestoreCrm.ts");
  assert.match(restore, /'crm_immo_commentaires'/,
    "la table ne figure pas parmi celles dont company_id est reecrit");
});

test("E2 — crm_immo_acces reste hors de TOUTE liste", () => {
  /*
   * Regle de securite, pas un oubli : la restauration REECRIT company_id avec la Societe
   * de destination. Une sauvegarde de Bellisimmo restauree chez une voisine lui
   * accorderait le module.
   */
  const c = codeSeul(lire("src/pages/admin/views/sauvegarde/restoreConstants.ts"));
  const r = codeSeul(lire("src/pages/admin/views/sauvegarde/useRestoreCrm.ts"));
  for (const [nom, src] of [["restoreConstants", c], ["useRestoreCrm", r]] as [string, string][]) {
    assert.ok(!src.includes("crm_immo_acces"), nom + " nomme crm_immo_acces : il deviendrait restaurable");
  }
});

// ===========================================================================
// F — DEUX DEFAUTS TROUVES PAR L AUDIT, ET QUI NE DOIVENT PAS REVENIR
// ===========================================================================

test("F1 — la recherche ne fouille plus l ancien champ commentaire", () => {
  /*
   * La regle est ecrite dans crmImmoRecherche.ts lui-meme : ne pas chercher dans ce qui
   * n'est pas visible, << on trouverait une ligne sans voir pourquoi elle correspond >>.
   *
   * La colonne commentaire est devenue exactement ce cas : elle figure encore parmi les
   * colonnes visibles, mais sa cellule affiche un bouton. Et son texte est doublement
   * trompeur — c'est l'ANCIEN champ unique, que l'interface n'alimente plus, pendant que
   * l'historique vit dans une autre table que cette recherche ne lit pas.
   */
  const r = lire("src/lib/crmImmoRecherche.ts");
  assert.match(r, /cherchables = colonnes\.filter\(c => !\(c\.famille === 'systeme' && c\.cle === 'commentaire'\)\)/,
    "le commentaire est revenu dans le foin de la recherche");
  assert.match(r, /cherchables\.map\(c => valeurAffichee\(d, c\)\)/,
    "la recherche ne lit plus la liste filtree");
});

test("F2 — l en-tete Commentaire ne trie plus", () => {
  /* Trier sur une valeur que personne ne voit produit un ordre incomprehensible. */
  const t = lire(D + "CrmImmoTable.tsx");
  assert.match(t, /const triable = !\(c\.famille === 'systeme' && c\.cle === 'commentaire'\)/,
    "l en-tete Commentaire est redevenu un bouton de tri");
  assert.match(t, /if \(!triable\) \{/, "la branche non triable a disparu");
});

// ===========================================================================
// G — LA COLONNE ACTIONS RESTE ATTEIGNABLE
// ===========================================================================

test("G1 — la colonne Actions est EPINGLEE a droite, en-tete et cellule", () => {
  /*
   * MESURE A 1280 px, avec les dix colonnes systeme visibles et un vrai dossier :
   *   table 1542 px dans un conteneur de 1262  ->  280 px de debordement
   *   la colonne Actions commencait a x = 1384  ->  ENTIEREMENT hors de l ecran
   *
   * Le bouton Details, le crayon et la poubelle etaient donc invisibles, et il fallait
   * deviner qu un defilement horizontal existe A L INTERIEUR du tableau. Apres
   * epinglage, le bouton Details se tient a x = 1195, visible sans rien faire, et il
   * recoit son propre clic — y compris une fois le tableau defile a fond.
   *
   * Le defaut n est pas nouveau pour le crayon et la poubelle. Il s est aggrave en
   * ajoutant Details et en donnant une largeur fixe a la colonne Commentaire.
   *
   * Pourquoi EPINGLER et non elargir : avec des colonnes personnalisees, le tableau peut
   * depasser n importe quelle largeur d ecran. Seul l epinglage garantit que les actions
   * restent atteignables, quel que soit leur nombre.
   */
  const t = lire(D + "CrmImmoTable.tsx");

  /* On ancre sur la BALISE, pas sur le mot : le commentaire qui explique la mesure
     contient lui aussi le mot << Actions >>, et chercher le mot rendait le commentaire. */
  const entete = t.indexOf('<th className="text-right');
  assert.ok(entete > 0, "l en-tete Actions a disparu");
  const blocEntete = t.slice(entete, entete + 500);
  assert.match(blocEntete, /sticky right-0 z-10/,
    "l en-tete Actions n est plus epingle : il repart hors de l ecran des que le tableau deborde");

  const cellule = t.indexOf('className="px-3 py-2.5 text-right whitespace-nowrap');
  assert.ok(cellule > 0, "la cellule Actions a disparu");
  const blocCellule = t.slice(cellule, cellule + 400);
  assert.match(blocCellule, /sticky right-0 z-10/,
    "la cellule Actions n est plus epinglee : les boutons repartent hors de l ecran");

  /*
   * Un fond OPAQUE, sinon les colonnes defilantes se voient a travers. main.bg est le
   * fond de la page, celui sur lequel le corps du tableau repose.
   */
  assert.match(blocCellule, /background: t\.main\.bg/,
    "la cellule epinglee n a plus de fond opaque : le contenu defilant la traverserait");
  assert.match(blocEntete, /t\.main\.bg/,
    "l en-tete epingle n a plus de fond opaque");
});

test("G2 — les deux portes d entree portent un TEXTE, pas une icone seule", () => {
  /*
   * Exigence de David : << le bouton doit etre clairement lisible, pas seulement une
   * icone >>. Mesure sur le composant reel : << Details >> 79 x 30 au tableau,
   * 161 x 42 sur la fiche mobile ; << Commentaires (2) >> 139 x 30 et 161 x 42.
   */
  const table = lire(D + "CrmImmoTable.tsx");
  const cartes = lire(D + "CrmImmoCards.tsx");
  for (const [nom, src] of [["le tableau", table], ["les fiches mobiles", cartes]] as [string, string][]) {
    assert.match(src, />\s*Détails\s*</,
      nom + " : le bouton Details n affiche plus son texte");
    assert.match(src, /Commentaires/,
      nom + " : le bouton Commentaires n affiche plus son texte");
  }
  /* Et la fiche mobile a bien SON bouton Details, distinct de celui du tableau. */
  assert.match(cartes, /crm-immo-carte-details-/,
    "les fiches mobiles n ont plus de bouton Details");
});
