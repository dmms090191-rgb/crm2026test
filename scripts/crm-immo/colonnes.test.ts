// L'ordre des colonnes est DETERMINISTE, et les colonnes systeme sont intouchables.
//   node --test scripts/crm-immo/colonnes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trierPerso, ordonnerSysteme, toutesLesColonnes, colonnesVisibles, cleColonne,
  peutSupprimer, peutMasquer, deplacer, positionsApres, nomDejaPris, nomHeurteSysteme,
  cleReglage, REGLAGE_VIDE, type ReglageLocal,
} from "../../src/lib/crmImmoColonnes.ts";
import { COLONNES_SYSTEME, type ColonneImmo } from "../../src/pages/admin/views/crm-immo/crmImmoTypes.ts";

const perso = (over: Partial<ColonneImmo>): ColonneImmo => ({
  id: "c1", company_id: "co", nom: "Montant du loyer", type: "nombre",
  position: 0, masquee: false, created_at: "2026-10-01T10:00:00Z", ...over,
});

test("LE PIEGE DE position : deux colonnes de meme rang gardent le MEME ordre", () => {
  /* `position` n'est volontairement PAS unique en base — un glisser-deposer passe par un
     etat transitoire en doublon. Sans le second critere de tri, Postgres decide, et
     l'utilisateur voit son tableau bouger tout seul d'un rechargement a l'autre. */
  const a = perso({ id: "a", nom: "A", position: 3, created_at: "2026-10-01T10:00:00Z" });
  const b = perso({ id: "b", nom: "B", position: 3, created_at: "2026-10-02T10:00:00Z" });

  const lecture1 = trierPerso([a, b]).map(c => c.id);
  const lecture2 = trierPerso([b, a]).map(c => c.id);
  assert.deepEqual(lecture1, lecture2, "l ordre doit etre independant de l ordre d arrivee");
  assert.deepEqual(lecture1, ["a", "b"], "c est created_at qui tranche : la plus ancienne d abord");
});

test("trierPerso respecte position avant created_at", () => {
  const vieille = perso({ id: "v", position: 5, created_at: "2026-01-01T00:00:00Z" });
  const recente = perso({ id: "r", position: 1, created_at: "2026-12-01T00:00:00Z" });
  assert.deepEqual(trierPerso([vieille, recente]).map(c => c.id), ["r", "v"]);
});

test("positionsApres rend 0..n-1 sans trou, et SEULEMENT ce qui a change", () => {
  const liste = [
    perso({ id: "a", position: 0 }),
    perso({ id: "b", position: 1 }),
    perso({ id: "c", position: 2 }),
  ];
  assert.deepEqual(positionsApres(liste), [], "rien a reecrire si tout est deja en place");

  const deplacee = deplacer(liste, 2, 0).map(c => ({ ...c }));
  const aEcrire = positionsApres(deplacee);
  /* c passe de 2 a 0, a de 0 a 1, b de 1 a 2 : les trois changent. */
  assert.deepEqual(aEcrire.map(c => [c.id, c.position]), [["c", 0], ["a", 1], ["b", 2]]);
  /* Des LIGNES ENTIERES, pas des fragments : l'upsert a besoin des colonnes NOT NULL. */
  for (const c of aEcrire) {
    for (const champ of ["id", "company_id", "nom", "type", "position", "masquee", "created_at"]) {
      assert.ok(champ in c, `la ligne a reecrire doit porter ${champ}`);
    }
  }
  /* Et les positions rendues forment bien une suite sans trou. */
  const positions = deplacee.map((_, i) => i);
  assert.deepEqual(positions, [0, 1, 2]);
});

test("deplacer ne modifie pas la liste d origine et refuse les bornes absurdes", () => {
  const liste = ["a", "b", "c"];
  assert.deepEqual(deplacer(liste, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(liste, ["a", "b", "c"], "l original est intact");
  assert.equal(deplacer(liste, 1, 1), liste, "un deplacement nul rend la meme reference");
  assert.equal(deplacer(liste, -1, 0), liste);
  assert.equal(deplacer(liste, 0, 9), liste);
});

test("une colonne SYSTEME n est JAMAIS supprimable", () => {
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [perso({})], reglage: REGLAGE_VIDE });
  const sys = colonnes.filter(c => c.famille === "systeme");
  const pers = colonnes.filter(c => c.famille === "perso");
  /* NEUF, et non plus dix : nom+prenom et locataire+proprietaire ne font plus qu une
     colonne chacune a l affichage, et `mode_paiement` est arrive. Les champs reels,
     eux, sont toujours onze — ils vivent dans CHAMPS_DOSSIER. */
  assert.equal(sys.length, 9, "les 9 colonnes systeme du tableau");
  assert.equal(pers.length, 1);
  for (const c of sys) assert.equal(peutSupprimer(c), false, `${c.nom} ne doit pas etre supprimable`);
  for (const c of pers) assert.equal(peutSupprimer(c), true);
});

test("`np_locataire` n est jamais masquable, meme si le reglage memorise pretend le contraire", () => {
  /* Un localStorage bricole a la main ne doit pas pouvoir vider le tableau de ce qui
     identifie ses lignes. La colonne porte desormais le nom ET le prenom du locataire,
     et son premier composant `nom` est NOT NULL en base : elle reste a l ecran. */
  const reglage: ReglageLocal = { ordreSysteme: [], masqueesSysteme: ["np_locataire", "email"] };
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage });
  const nom = colonnes.find(c => c.famille === "systeme" && c.cle === "np_locataire")!;
  const email = colonnes.find(c => c.famille === "systeme" && c.cle === "email")!;
  assert.equal(nom.masquee, false, "le reglage est IGNORE pour `np_locataire`, pas obei");
  assert.equal(peutMasquer(nom), false);
  assert.equal(email.masquee, true, "les autres se masquent normalement");
  assert.equal(peutMasquer(email), true);
  assert.ok(colonnesVisibles(colonnes).some(c => cleColonne(c) === "np_locataire"));
});

test("l ordre memorise des colonnes systeme est respecte, et une colonne neuve arrive VISIBLE a la fin", () => {
  const reglage: ReglageLocal = { ordreSysteme: ["commentaire", "np_locataire"], masqueesSysteme: [] };
  const ordre = ordonnerSysteme(COLONNES_SYSTEME, reglage).map(d => d.cle);
  assert.deepEqual(ordre.slice(0, 2), ["commentaire", "np_locataire"], "l ordre memorise passe d abord");
  assert.equal(ordre.length, COLONNES_SYSTEME.length, "aucune colonne perdue");
  assert.deepEqual([...ordre].sort(), COLONNES_SYSTEME.map(d => d.cle).sort(), "les memes, reordonnees");
  /* Une cle inconnue dans le reglage — colonne retiree du code — est ignoree. */
  const perime: ReglageLocal = { ordreSysteme: ["colonne_disparue", "email"], masqueesSysteme: [] };
  const ordre2 = ordonnerSysteme(COLONNES_SYSTEME, perime).map(d => d.cle);
  assert.equal(ordre2[0], "email");
  assert.equal(ordre2.length, COLONNES_SYSTEME.length);
  /* Et un doublon dans le reglage ne duplique pas la colonne. */
  const doublon: ReglageLocal = { ordreSysteme: ["email", "email"], masqueesSysteme: [] };
  assert.equal(ordonnerSysteme(COLONNES_SYSTEME, doublon).length, COLONNES_SYSTEME.length);
});

test("le nom d une colonne personnalisee est refuse AVANT l aller-retour", () => {
  /* Meme regle que l index unique (company_id, lower(btrim(nom))) : insensible a la casse
     et aux espaces de bord. Refuser ici donne un message clair au lieu d un 23505. */
  const existantes = [perso({ id: "c1", nom: "Garantie" })];
  assert.equal(nomDejaPris("Garantie", existantes), true);
  assert.equal(nomDejaPris("  garantie  ", existantes), true, "insensible a la casse et aux espaces");
  assert.equal(nomDejaPris("Garantie locative", existantes), false);
  assert.equal(nomDejaPris("Garantie", existantes, "c1"), false, "se renommer soi-meme est permis");
  assert.equal(nomDejaPris("", existantes), false, "le vide est traite par la validation du champ");

  /*
   * Et le heurt avec un libelle systeme : la base ne l interdit pas, l interface doit.
   *
   * ATTENTION AU PIEGE : ce heurt porte sur le LIBELLE AFFICHE DANS LE TABLEAU, pas
   * sur le nom de la colonne SQL ni sur le libelle du FORMULAIRE. Depuis le 23 octobre
   * 2026 le tableau montre << N/P locataire >> et << N/P propriétaire >> : ce sont ces
   * deux libelles qui feraient deux en-tetes identiques.
   */
  assert.equal(nomHeurteSysteme("N/P locataire", COLONNES_SYSTEME), true);
  assert.equal(nomHeurteSysteme("  n/p propriétaire ", COLONNES_SYSTEME), true);
  assert.equal(nomHeurteSysteme("Adresse du bien", COLONNES_SYSTEME), false);
  /*
   * << Mode de paiement >> DOIT heurter, et c est la raison la plus importante de ce
   * test : avant la migration 20261023000021, ce mode vivait dans une colonne
   * PERSONNALISEE de texte libre. Elle a ete reprise puis retiree pour qu il n y ait
   * qu'UNE source de verite. Laisser recreer une colonne personnalisee du meme nom la
   * recreerait exactement — avec deux cellules cote a cote qui se contrediraient.
   */
  assert.equal(nomHeurteSysteme("Mode de paiement", COLONNES_SYSTEME), true);
  assert.equal(nomHeurteSysteme("  MODE DE PAIEMENT  ", COLONNES_SYSTEME), true);
  /*
   * Consequence assumee : les quatre libelles du FORMULAIRE ne sont plus des en-tetes
   * de tableau, donc une Societe peut creer une colonne personnalisee << Nom locataire
   * >>. Elle n en aurait aucune raison, et rien ne casse : aucun en-tete ne serait
   * double, et le formulaire garde ses libelles a lui.
   */
  assert.equal(nomHeurteSysteme("Nom locataire", COLONNES_SYSTEME), false);
  assert.equal(nomHeurteSysteme("Prénom propriétaire", COLONNES_SYSTEME), false);
});

test("deux Societes ne partagent pas leur mise en page", () => {
  assert.notEqual(cleReglage("co-a"), cleReglage("co-b"));
  assert.ok(cleReglage("co-a").includes("crm_immo"), "la cle nomme le module");
  assert.equal(cleReglage(null), cleReglage(null), "stable quand la Societe est inconnue");
});

test("les 9 colonnes systeme sont celles du brief, dans l ordre, et une seule est non masquable", () => {
  /* L ordre est celui demande par David le 23 octobre 2026. Les deux cles en `np_` ne
     designent AUCUNE colonne SQL : elles reunissent a l'affichage deux champs restes
     separes en base, ce qui rend la fusion reversible sans migration. */
  assert.deepEqual(COLONNES_SYSTEME.map(d => d.cle), [
    "np_locataire", "email", "telephone", "date_entree", "date_fin_contrat",
    "np_proprietaire", "jour_encaissement", "commentaire", "mode_paiement",
  ]);
  const nonMasquables = COLONNES_SYSTEME.filter(d => !d.masquable).map(d => d.cle);
  assert.deepEqual(nonMasquables, ["np_locataire"],
    "seule la colonne qui identifie la ligne est non masquable (`nom` est NOT NULL en base)");
  /* Une colonne composee reunit EXACTEMENT deux champs, jamais un ni trois : la cellule
     et la recherche lisent ce couple tel quel. */
  for (const d of COLONNES_SYSTEME) {
    if (d.composeDe !== undefined) assert.equal(d.composeDe.length, 2, `${d.cle} : paire attendue`);
  }
  /* Les types annonces doivent etre parmi les quatre que la base accepte. */
  for (const d of COLONNES_SYSTEME) {
    assert.ok(["texte", "nombre", "date", "oui_non"].includes(d.type), `${d.cle} : type inconnu`);
  }
});
