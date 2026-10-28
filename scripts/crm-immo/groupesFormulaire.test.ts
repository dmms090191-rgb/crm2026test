// Le formulaire se lit personne par personne : trois groupes, aucune cle SQL touchee.
//   node --import tsx --test scripts/crm-immo/groupesFormulaire.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAMPS_DOSSIER, GROUPES_FORMULAIRE, type GroupeChamp,
} from "../../src/pages/admin/views/crm-immo/crmImmoTypes.ts";

/*
 * ============== CE QUE CE FICHIER TIENT ==============
 *
 * David, le 28/10/2026 : « Regroupe visuellement les champs en trois sections : Locataire /
 * Proprietaire / Contrat et loyer », et « ne renomme aucune cle SQL historique ».
 *
 * ---------- CE QUI DISPERSAIT REELLEMENT LA FICHE ----------
 *
 * Ce n'etait pas l'absence de titres, c'etait l'ORDRE. Le formulaire rendait tous les
 * champs par une seule boucle dans une grille a deux colonnes, et l'ordre de
 * CHAMPS_DOSSIER placait LES DEUX DATES DE CONTRAT ENTRE le bloc locataire et le bloc
 * proprietaire. On lisait : un nom, un prenom, un e-mail, un telephone, puis deux dates de
 * bail, puis un autre nom et un autre prenom. Les titres rendent le regroupement visible ;
 * c'est le REORDONNANCEMENT qui le produit. Le releve B2 tient ce point precis.
 *
 * ---------- LE PIEGE QU'ON NE DOIT PAS ROUVRIR ----------
 *
 * Deux cles de cette table mentent sur leur contenu : `locataire` porte le NOM DU
 * PROPRIETAIRE, `proprietaire` son PRENOM. Les renommer exigerait une migration et
 * casserait les sauvegardes deja prises. Le groupe se pose DONC au-dessus des cles, jamais
 * avec elles — un champ du groupe « proprietaire » porte la cle `locataire`, et c'est
 * normal. Le releve C1 interdit le renommage « de coherence ».
 */

const lire = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const CHAMPS = "src/pages/admin/views/crm-immo/CrmImmoChampsDossier.tsx";

// ===================== A. LES TROIS GROUPES =====================

test("A1 trois groupes, dans l'ordre et avec les titres demandes", () => {
  assert.deepEqual(
    GROUPES_FORMULAIRE.map(g => [g.cle, g.titre]),
    [["locataire", "Locataire"], ["proprietaire", "Propriétaire"], ["contrat", "Contrat et loyer"]],
    "les groupes ou leurs titres ne sont plus ceux demandes le 28/10/2026",
  );
});

test("A2 chaque champ appartient a un groupe connu, et aucun groupe n'est vide", () => {
  /*
   * Le type rend `groupe` obligatoire, donc un champ sans groupe ne compile pas. Ce releve
   * couvre ce que le type ne peut pas : un groupe declare que plus aucun champ n'habite —
   * il produirait un titre nu, annoncant rien.
   */
  const connus = new Set(GROUPES_FORMULAIRE.map(g => g.cle));
  for (const d of CHAMPS_DOSSIER) {
    assert.ok(connus.has(d.groupe), `${d.cle} appartient au groupe inconnu « ${d.groupe} »`);
  }
  for (const g of GROUPES_FORMULAIRE) {
    assert.ok(CHAMPS_DOSSIER.some(d => d.groupe === g.cle), `le groupe « ${g.titre} » est vide`);
  }
});

test("A3 la composition exacte de chaque groupe, dans l'ordre", () => {
  /*
   * Ecrite en DUR, sans deriver de la source : un releve qui calcule sa valeur attendue
   * depuis ce qu'il verifie ne verifie plus rien. C'est la liste de David, mot pour mot —
   * a une exception, dite au relevé A4.
   */
  const parGroupe = (g: GroupeChamp) => CHAMPS_DOSSIER.filter(d => d.groupe === g).map(d => d.cle);
  assert.deepEqual(parGroupe("locataire"), ["nom", "prenom", "email", "telephone"]);
  assert.deepEqual(parGroupe("proprietaire"), ["locataire", "proprietaire", "telephone_proprietaire"]);
  assert.deepEqual(parGroupe("contrat"),
    ["date_entree", "date_fin_contrat", "jour_encaissement", "mode_paiement", "commentaire"]);
});

test("A4 AUCUN champ n'a disparu au passage", () => {
  /*
   * Reordonner est l'occasion rêvée de perdre une ligne sans s'en apercevoir. Douze champs
   * avant, douze apres.
   *
   * `jour_encaissement` ne figurait PAS dans la liste de David du 28/10. Il est conserve :
   * le retirer supprimerait un champ existant du formulaire, et il appartient manifestement
   * au groupe « Contrat et loyer ». Ce releve est la pour que son retrait soit un choix, et
   * non un oubli de recopie.
   */
  assert.equal(CHAMPS_DOSSIER.length, 12, "le nombre de champs du formulaire a change");
  assert.ok(CHAMPS_DOSSIER.some(d => d.cle === "jour_encaissement"),
    "jour_encaissement a ete retire du formulaire : c'est une decision, pas une consequence du regroupement");
  const cles = CHAMPS_DOSSIER.map(d => d.cle);
  assert.equal(new Set(cles).size, cles.length, "un champ est declare deux fois");
});

// ===================== B. CE QUE LE REGROUPEMENT CORRIGE =====================

test("B1 chaque personne tient d'un seul bloc", () => {
  const cles = CHAMPS_DOSSIER.map(d => d.cle as string);
  const bloc = (a: string, b: string) => Math.abs(cles.indexOf(a) - cles.indexOf(b));
  /* Le locataire : nom, prenom, email, telephone se suivent. */
  assert.equal(cles.indexOf("telephone") - cles.indexOf("nom"), 3, "le bloc locataire n'est plus contigu");
  /* Le proprietaire : nom, prenom, telephone se suivent aussi. */
  assert.equal(cles.indexOf("telephone_proprietaire") - cles.indexOf("locataire"), 2,
    "le bloc proprietaire n'est plus contigu");
  assert.equal(bloc("locataire", "proprietaire"), 1, "le nom et le prenom du proprietaire se sont separes");
});

test("B2 les deux dates de contrat ne s'intercalent PLUS entre les deux personnes", () => {
  /*
   * LE RELEVE CENTRAL DE CETTE ETAPE. C'est exactement ce que faisait l'ancien ordre :
   * nom, prenom, email, telephone, DATE D'ENTREE, FIN DE CONTRAT, nom proprietaire, ...
   * Les titres seuls n'y auraient rien change — il aurait fallu un groupe « Contrat » au
   * milieu, ce que personne n'a demande.
   */
  const cles = CHAMPS_DOSSIER.map(d => d.cle as string);
  const finLocataire = cles.indexOf("telephone");
  const debutProprietaire = cles.indexOf("locataire");
  for (const date of ["date_entree", "date_fin_contrat"]) {
    const i = cles.indexOf(date);
    assert.ok(!(i > finLocataire && i < debutProprietaire),
      `${date} est revenue entre le locataire et le proprietaire`);
    assert.ok(i > debutProprietaire, `${date} doit suivre le bloc proprietaire`);
  }
});

test("B3 le commentaire reste le DERNIER champ", () => {
  /*
   * Il est le seul textarea, donc le seul rendu en `sm:col-span-2`. Une case pleine largeur
   * au milieu d'un groupe casserait l'appariement des champs suivants dans la grille a deux
   * colonnes — un champ se retrouverait seul sur sa ligne, sans raison visible.
   */
  assert.equal(CHAMPS_DOSSIER[CHAMPS_DOSSIER.length - 1].cle, "commentaire",
    "le commentaire n'est plus en dernier : la grille va se desapparier");
  const code = sansCommentaires(lire(CHAMPS));
  assert.match(code, /type === 'textarea' \? 'sm:col-span-2' : ''/,
    "le commentaire ne prend plus toute la largeur, ou la regle a change de forme");
});

// ===================== C. AUCUNE CLE SQL N'EST TOUCHEE =====================

test("C1 les deux cles qui mentent sur leur contenu n'ont PAS ete renommees", () => {
  /*
   * La tentation, en rangeant les champs par personne, est de « corriger » l'incoherence :
   * la cle `locataire` dans le groupe « Proprietaire » saute aux yeux. Ce serait une
   * migration, et elle casserait les sauvegardes deja prises ainsi que les restaurations
   * qui les relisent.
   */
  const types = lire("src/pages/admin/views/crm-immo/crmImmoTypes.ts");
  assert.match(types, /cle: 'locataire', libelle: 'Nom propriétaire'/,
    "la cle `locataire` a ete renommee, ou son libelle a change");
  assert.match(types, /cle: 'proprietaire', libelle: 'Prénom propriétaire'/,
    "la cle `proprietaire` a ete renommee, ou son libelle a change");

  /* Et ces deux cles sont bien RANGEES chez le proprietaire, malgre leur nom. */
  const parCle = new Map(CHAMPS_DOSSIER.map(d => [d.cle as string, d.groupe]));
  assert.equal(parCle.get("locataire"), "proprietaire", "la cle `locataire` porte le NOM du proprietaire");
  assert.equal(parCle.get("proprietaire"), "proprietaire", "la cle `proprietaire` porte son PRENOM");
  assert.equal(parCle.get("nom"), "locataire", "la cle `nom` porte le nom du LOCATAIRE");
});

test("C2 aucune migration n'accompagne ce regroupement", () => {
  /* Un groupe est un fait d'affichage. S'il avait fallu toucher la base, c'est qu'on
     aurait choisi de renommer les cles — ce que C1 interdit. */
  const types = sansCommentaires(lire("src/pages/admin/views/crm-immo/crmImmoTypes.ts"));
  assert.ok(!/alter table|ALTER TABLE/.test(types), "du SQL est apparu dans les types");
});

// ===================== D. LE RENDU =====================

test("D1 le rendu boucle sur les GROUPES, et chaque champ passe par le helper", () => {
  /*
   * Le helper champ() est l'UNIQUE endroit qui ecrit les classes d'un champ. Sortir un
   * champ a la main pour le placer dans un groupe rouvrirait le zoom automatique d'iOS a
   * 375 px que `max-md:text-base` empeche — et les releves de cible tactile balaient chaque
   * ligne de classes de ce fichier, pas une simple presence.
   */
  const code = sansCommentaires(lire(CHAMPS));
  assert.match(code, /GROUPES_FORMULAIRE\s*\n?\s*\.map\(g => \(\{ \.\.\.g, champs: systeme\.filter\(d => d\.groupe === g\.cle\) \}\)\)/,
    "le rendu ne derive plus ses sections des groupes declares");
  assert.match(code, /\{g\.champs\.map\(d => champ\(d\.cle\)\)\}/,
    "les champs d'un groupe ne passent plus par le helper champ()");
  /* Et l'ancienne boucle unique a disparu : si elle revenait, les groupes seraient rendus
     ET tous les champs une seconde fois. */
  assert.ok(!/\{systeme\.map\(d => champ\(d\.cle\)\)\}/.test(code),
    "l'ancienne boucle unique est revenue : les champs seraient rendus deux fois");
});

test("D2 un groupe vide ne se rend pas, et le premier n'a pas de bordure haute", () => {
  const code = sansCommentaires(lire(CHAMPS));
  assert.match(code, /\.filter\(g => g\.champs\.length > 0\)/,
    "un groupe vide se rendrait : un titre nu, annoncant rien");
  assert.match(code, /i === 0 \? '' : 'mt-5 pt-4'/,
    "le premier groupe porte une bordure haute : elle separe des sections, elle n'ouvre pas la premiere");
});

test("D3 le motif de section est celui qui existait deja", () => {
  /*
   * « Vos colonnes » dessinait deja une section dans ce meme fichier. Reemployer son motif
   * plutot qu'en inventer un second evite qu'un formulaire finisse avec deux facons de
   * dessiner la meme chose.
   */
  const code = sansCommentaires(lire(CHAMPS));
  const titres = (code.match(/text-xs font-semibold uppercase tracking-wide mb-3/g) ?? []).length;
  assert.equal(titres, 2, `un seul motif de titre attendu, employe deux fois (groupes + Vos colonnes), ${titres} trouve(s)`);
  const grilles = (code.match(/grid grid-cols-1 sm:grid-cols-2 gap-3/g) ?? []).length;
  assert.equal(grilles, 2, `la grille des groupes et celle de « Vos colonnes », ${grilles} trouvee(s)`);
});
