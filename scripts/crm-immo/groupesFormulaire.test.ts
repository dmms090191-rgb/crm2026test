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
  /* Depuis le 28/10/2026, UN SEUL champ de nom par personne. Les cles `nom`, `prenom`,
     `locataire` et `proprietaire` ont quitte le FORMULAIRE — pas le schema : le relevé C1
     verifie qu elles survivent dans ChampSysteme et dans SaisieDossier. */
  assert.deepEqual(parGroupe("locataire"), ["nom_complet_locataire", "email", "telephone"]);
  assert.deepEqual(parGroupe("proprietaire"), ["nom_complet_proprietaire", "telephone_proprietaire"]);
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
  /* DIX depuis le 28/10/2026 : onze avant le 27/10, douze apres, et dix depuis que le
     nom et le prenom de chaque personne ont fusionne en un champ unique. */
  assert.equal(CHAMPS_DOSSIER.length, 10, "le nombre de champs du formulaire a change");
  assert.ok(CHAMPS_DOSSIER.some(d => d.cle === "jour_encaissement"),
    "jour_encaissement a ete retire du formulaire : c'est une decision, pas une consequence du regroupement");
  const cles = CHAMPS_DOSSIER.map(d => d.cle);
  assert.equal(new Set(cles).size, cles.length, "un champ est declare deux fois");
});

// ===================== B. CE QUE LE REGROUPEMENT CORRIGE =====================

test("B1 chaque personne tient d'un seul bloc", () => {
  const cles = CHAMPS_DOSSIER.map(d => d.cle as string);
  const bloc = (a: string, b: string) => Math.abs(cles.indexOf(a) - cles.indexOf(b));
  /* Le locataire : son nom complet, puis email, puis telephone — TROIS champs qui se
     suivent depuis que le nom et le prenom ont fusionne. */
  assert.equal(cles.indexOf("telephone") - cles.indexOf("nom_complet_locataire"), 2,
    "le bloc locataire n'est plus contigu");
  /* Le proprietaire : son nom complet, puis son telephone. DEUX champs adjacents. */
  assert.equal(bloc("nom_complet_proprietaire", "telephone_proprietaire"), 1,
    "le bloc proprietaire n'est plus contigu");
  /* Et les deux personnes ne se chevauchent pas : tout le bloc locataire precede tout
     le bloc proprietaire. */
  assert.ok(cles.indexOf("telephone") < cles.indexOf("nom_complet_proprietaire"),
    "les deux personnes se chevauchent dans le formulaire");
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

test("B3 aucun champ pleine largeur ne desapparie la grille de son groupe", () => {
  /*
   * REECRIT LE 28/10/2026, ET LA PREMISSE AVAIT CHANGE.
   *
   * Ce releve disait << le commentaire est le seul textarea, donc le seul rendu en
   * sm:col-span-2 >>, et epinglait la FORME EXACTE de la condition dans le code. Les deux
   * champs uniques de nom prennent desormais aussi toute la largeur — un nom compose ne
   * tient pas dans une demi-colonne — donc la premisse est fausse et le motif ne mord plus.
   *
   * L'INVARIANT REEL, lui, n'a pas bouge, et c'est celui qu'on verrouille maintenant : dans
   * une grille a deux colonnes, un champ pleine largeur place AU MILIEU d'un groupe laisse
   * un champ seul sur sa ligne, sans raison visible. Il doit donc etre en PREMIER ou en
   * DERNIER de son groupe. Cette assertion mord quel que soit le nombre de champs larges,
   * ce que l'ancienne ne faisait pas.
   */
  assert.equal(CHAMPS_DOSSIER[CHAMPS_DOSSIER.length - 1].cle, "commentaire",
    "le commentaire n'est plus en dernier : la grille va se desapparier");

  const code = sansCommentaires(lire(CHAMPS));
  assert.match(code, /pleineLargeur \? 'sm:col-span-2' : ''/,
    "la regle de pleine largeur a change de forme");
  /* Les trois champs larges, nommement : le textarea et les deux noms. */
  assert.match(code, /type === 'textarea'/, "le commentaire ne prend plus toute la largeur");
  for (const cle of ["nom_complet_locataire", "nom_complet_proprietaire"]) {
    assert.match(code, new RegExp("cle === '" + cle + "'"),
      "le champ " + cle + " ne prend plus toute la largeur : un nom compose y serait tronque");
  }

  /*
   * Et la position de chacun dans SON groupe.
   *
   * HONNETETE SUR CE QUE CECI GARDE : mesure du 28/10/2026, la mutation qui deplace le
   * commentaire au milieu de son groupe a nombre de champs CONSTANT est tuee par A3, qui
   * fige l'ordre exact de chaque groupe — pas par l'assertion ci-dessous. Elle est donc
   * SUBSUMEE tant qu'A3 existe sous cette forme.
   *
   * On la garde quand meme, et pour une raison precise : A3 fige une LISTE, qu'il faudra
   * forcement rallonger au prochain champ ajoute. Le jour ou quelqu'un la mettra a jour
   * sans y penser, c'est cette regle-ci qui dira pourquoi l'ordre comptait.
   */
  const LARGES = new Set(["commentaire", "nom_complet_locataire", "nom_complet_proprietaire"]);
  for (const g of GROUPES_FORMULAIRE) {
    const cles = CHAMPS_DOSSIER.filter(d => d.groupe === g.cle).map(d => d.cle as string);
    cles.forEach((cle, i) => {
      if (!LARGES.has(cle)) return;
      assert.ok(i === 0 || i === cles.length - 1,
        `${cle} est large et au MILIEU du groupe « ${g.titre} » : un champ va rester seul sur sa ligne`);
    });
  }
});

// ===================== C. AUCUNE CLE SQL N'EST TOUCHEE =====================

test("C1 les deux cles qui mentent sur leur contenu n'ont PAS ete renommees", () => {
  /*
   * La tentation, en rangeant les champs par personne, est de « corriger » l'incoherence :
   * la cle `locataire` dans le groupe « Proprietaire » saute aux yeux. Ce serait une
   * migration, et elle casserait les sauvegardes deja prises ainsi que les restaurations
   * qui les relisent.
   */
  /*
   * REECRIT LE 28/10/2026, ET LE MOTIF COMPTE.
   *
   * Les quatre cles ont quitte le FORMULAIRE au profit de deux champs uniques de nom
   * complet. Chercher leur libelle de formulaire ne prouverait donc plus rien.
   *
   * ET SURTOUT : les deux anciennes assertions etaient DEJA DE FAUX VERTS. Les motifs
   * cherchaient cle: 'locataire' et cle: 'proprietaire', or ces deux chaines
   * apparaissent AUSSI comme identifiants de GROUPE dans GROUPES_FORMULAIRE. Elles
   * trouvaient donc toujours de quoi mordre, meme si les champs avaient ete renommes.
   * Deux assertions sur quatre ne gardaient rien.
   *
   * Ce qui doit etre verrouille, c est que les cles survivent dans le MIROIR DU SCHEMA
   * et dans l aller-retour de saisie : c est cela qui garantit qu aucune migration n a
   * ete faite en douce et que les sauvegardes restent relisibles.
   */
  const types = lire("src/pages/admin/views/crm-immo/crmImmoTypes.ts");
  for (const cle of ["nom", "prenom", "locataire", "proprietaire"]) {
    assert.match(types, new RegExp("\\|\\s*'" + cle + "'"),
      "la cle " + cle + " a disparu de ChampSysteme : une migration a ete faite");
    assert.match(types, new RegExp("^\\s+" + cle + ": string;$", "m"),
      "la cle " + cle + " a disparu de SaisieDossier : l aller-retour ne la preserve plus");
  }
  /* Et les DEUX champs uniques sont bien dans le formulaire, sous leurs libelles. */
  assert.match(types, /cle: 'nom_complet_locataire', libelle: 'Nom prénom locataire'/,
    "le champ unique du locataire a change de cle ou de libelle");
  assert.match(types, /cle: 'nom_complet_proprietaire', libelle: 'Nom prénom propriétaire'/,
    "le champ unique du proprietaire a change de cle ou de libelle");

  /* Les deux champs uniques sont ranges chacun chez sa personne. Le piege des cles qui
     mentent ne se voit plus dans le formulaire — c'est precisement ce que le champ
     unique corrige a l'ecran — mais il reste entier en base, et les assertions
     ci-dessus le verrouillent. */
  const parCle = new Map(CHAMPS_DOSSIER.map(d => [d.cle as string, d.groupe]));
  assert.equal(parCle.get("nom_complet_locataire"), "locataire");
  assert.equal(parCle.get("nom_complet_proprietaire"), "proprietaire");
  /* Et aucune des quatre cles menteuses ne traine dans le formulaire : les y laisser
     ferait saisir le meme nom deux fois, dans deux conventions differentes. */
  for (const cle of ["nom", "prenom", "locataire", "proprietaire"]) {
    assert.equal(parCle.get(cle), undefined,
      "la cle " + cle + " est revenue dans le formulaire : le nom se saisirait deux fois");
  }
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
