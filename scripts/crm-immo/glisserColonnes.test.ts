// Le glisser-deposer des colonnes : la geometrie, et le cablage qui la sert.
//   node --test scripts/crm-immo/glisserColonnes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cibleApresGlissement, decalageLigne, deltaBorne, type BorneLigne,
} from "../../src/lib/reordonnerParGlissement.ts";

const lire = (p: string) => readFileSync(p, "utf8");
const D = "src/pages/admin/views/crm-immo/";
const HOOK = D + "useGlisserColonnes.ts";
const ROW = D + "CrmImmoColonneRow.tsx";
const MODALE = D + "CrmImmoColonnesModal.tsx";

/*
 * LE PIEGE DE LA PROSE.
 *
 * Les commentaires de ces trois fichiers CITENT ce qu'ils expliquent : << draggable +
 * dragstart ne se declenchent PAS au doigt >>, << touch-action: none est pose sur la
 * poignee seule >>. Chercher ces motifs dans le fichier entier rendrait VERT un test qui
 * ne lit que de la prose, ou ROUGE un code parfaitement correct. On depouille donc.
 */
const OUVRE = "/" + "*";
const FERME = "*" + "/";
function codeSeul(src: string): string {
  let out = "", i = 0;
  while (i < src.length) {
    if (src.startsWith(OUVRE, i)) { const f = src.indexOf(FERME, i + 2); i = f === -1 ? src.length : f + 2; continue; }
    if (src.startsWith("//", i)) { const f = src.indexOf("\n", i); i = f === -1 ? src.length : f; continue; }
    out += src[i]; i += 1;
  }
  return out;
}

/** Le bloc JSX de la poignee, et lui seul : une fenetre en caracteres y melerait les chevrons. */
function blocPoignee(src: string): string {
  const debut = src.indexOf("{glisse && !edition && (");
  assert.ok(debut > 0, "le bloc de la poignee a disparu de la ligne");
  const fin = src.indexOf(")}", debut);
  assert.ok(fin > debut, "le bloc de la poignee n est pas refermee");
  return src.slice(debut, fin);
}

/* Des lignes de 60 px, comme la modale en rend a 375 px. */
function bornesEgales(n: number, hauteur = 60): BorneLigne[] {
  return Array.from({ length: n }, (_, i) => ({ haut: i * hauteur, bas: (i + 1) * hauteur }));
}

// ===========================================================================
// A — LA GEOMETRIE
// ===========================================================================

test("A1 — le rang change a MI-VOISINE, pas apres une ligne entiere", () => {
  /*
   * Le seuil compare le BORD de la ligne tenue au MILIEU de la voisine. Avec son centre,
   * il aurait fallu parcourir 60 px — une ligne entiere — pour avancer d un rang, et le
   * geste aurait paru sourd.
   *
   * Lignes de 60 : le bas de la ligne 0 est a 60, le milieu de la ligne 1 a 90.
   */
  const b = bornesEgales(5);
  assert.equal(cibleApresGlissement(b, 0, 29), 0, "29 px : la moitie de la voisine n est pas couverte");
  assert.equal(cibleApresGlissement(b, 0, 30), 1, "30 px : elle l est, le rang avance");
});

test("A2 — on descend et on remonte de plusieurs rangs", () => {
  const b = bornesEgales(5);
  assert.equal(cibleApresGlissement(b, 0, 89), 1);
  assert.equal(cibleApresGlissement(b, 0, 90), 2);
  assert.equal(cibleApresGlissement(b, 4, -30), 3);
  assert.equal(cibleApresGlissement(b, 4, -91), 2);
  assert.equal(cibleApresGlissement(b, 2, 0), 2, "un simple appui ne deplace rien");
});

test("A3 — des lignes de HAUTEURS DIFFERENTES : le seuil est le milieu de CHACUNE", () => {
  /*
   * La modale en rend : une ligne grandit des qu on renomme la colonne, et le champ de
   * saisie prend 16 px sur mobile. Un calcul qui supposerait une hauteur commune
   * deposerait la colonne ailleurs qu a l endroit montre.
   */
  const b: BorneLigne[] = [
    { haut: 0, bas: 40 },      // 0 — la ligne tenue, courte
    { haut: 40, bas: 240 },    // 1 — une ligne tres haute : son milieu est a 140
    { haut: 240, bas: 280 },   // 2 — son milieu est a 260
  ];
  assert.equal(cibleApresGlissement(b, 0, 60), 0, "60 px suffiraient avec des lignes egales, pas ici");
  assert.equal(cibleApresGlissement(b, 0, 101), 1, "bord a 141 : le milieu de la ligne haute est franchi");
  assert.equal(cibleApresGlissement(b, 0, 221), 2);
});

test("A4 — l ecart des autres lignes vaut EXACTEMENT la hauteur de la ligne tenue", () => {
  const b: BorneLigne[] = [
    { haut: 0, bas: 40 }, { haut: 40, bas: 240 }, { haut: 240, bas: 280 },
  ];
  /* 0 part en 2 : 1 et 2 remontent de 40 — la hauteur de 0, pas la leur. */
  assert.equal(decalageLigne(1, 0, 2, b), -40);
  assert.equal(decalageLigne(2, 0, 2, b), -40);
  /* Celle-ci DOCUMENTE le contrat sans rien proteger : les deux encadrements de
     decalageLigne excluent structurellement le rang de la ligne tenue. Une mutation qui
     retirait le garde explicite a survecu — c est ainsi qu on l a su, et le garde a ete
     retire plutot que de laisser croire a une protection. */
  assert.equal(decalageLigne(0, 0, 2, b), 0, "la ligne tenue suit le pointeur, elle ne s ecarte pas");
  /* 2 part en 0 : 0 et 1 descendent de 40 — la hauteur de 2. */
  assert.equal(decalageLigne(0, 2, 0, b), 40);
  assert.equal(decalageLigne(1, 2, 0, b), 40);
  /* Et rien ne bouge tant que la cible est le rang de depart. */
  for (let i = 0; i < 3; i++) assert.equal(decalageLigne(i, 1, 1, b), 0);
  /* Une ligne en dehors du trajet ne bouge pas non plus. */
  assert.equal(decalageLigne(2, 0, 1, b), 0);
});

test("A5 — le geste ne sort pas de sa bande : une colonne systeme ne descend pas chez les personnalisees", () => {
  /*
   * Les deux familles vivent dans la meme zone defilante mais leurs rangs ne partent pas
   * au meme endroit — localStorage d un cote, la base de l autre. Sans cette borne, la
   * ligne tenue suivrait le doigt jusque par-dessus le titre << Vos colonnes >>, en
   * laissant croire a un depot impossible.
   */
  const b = bornesEgales(4);
  assert.equal(deltaBorne(b, 0, -500), 0, "la premiere ne monte pas plus haut que le haut de la liste");
  assert.equal(deltaBorne(b, 0, 500), 180, "ni plus bas que le bas de la derniere");
  assert.equal(deltaBorne(b, 3, 500), 0);
  assert.equal(deltaBorne(b, 3, -500), -180);
  assert.equal(deltaBorne(b, 1, 42), 42, "un deplacement raisonnable passe intact");
});

test("A6 — les bornes absurdes ne jettent rien et ne deplacent rien", () => {
  const b = bornesEgales(3);
  assert.equal(cibleApresGlissement(b, -1, 100), -1);
  assert.equal(cibleApresGlissement(b, 9, 100), 9);
  assert.equal(cibleApresGlissement([], 0, 100), 0);
  assert.equal(deltaBorne(b, 9, 100), 100);
  assert.equal(decalageLigne(0, 9, 1, b), 0);
});

// ===========================================================================
// B — LE CABLAGE
// ===========================================================================

test("B0 — le depouillement des commentaires n est pas inerte", () => {
  /* Garde du garde : si codeSeul rendait le fichier entier, B1 et B2 passeraient sur de
     la PROSE, puisque ces commentaires citent draggable, dragstart et touch-action. */
  const brut = lire(HOOK);
  const net = codeSeul(brut);
  assert.ok(net.length < brut.length * 0.8,
    "codeSeul ne retire plus les commentaires : les tests de cablage liraient de la prose");
  assert.match(brut, /draggable/, "l en-tete du hook n explique plus pourquoi HTML5 est ecarte");
  assert.doesNotMatch(net, /draggable/, "le depouillement laisse passer un mot cite en commentaire");
});

test("B1 — le geste passe par les pointer events, jamais par le glisser-deposer HTML5", () => {
  /* `draggable` + `dragstart` ne se declenchent PAS au doigt : le glisser marcherait a la
     souris et ne ferait RIEN sur telephone, ce que personne ne verrait en developpant. */
  const hook = codeSeul(lire(HOOK));
  for (const [nom, src] of [["le hook", hook], ["la ligne", codeSeul(lire(ROW))]] as const) {
    assert.doesNotMatch(src, /draggable|onDragStart|onDragOver|onDrop\b/,
      nom + " est revenu au glisser-deposer HTML5, qui est inerte au doigt");
  }
  for (const e of ["onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel"]) {
    assert.ok(hook.includes(e), "le hook n ecoute plus " + e);
  }
});

test("B2 — touch-action est pose sur la POIGNEE SEULE", () => {
  /*
   * LA REGLE QUI PROTEGE LE DEFILEMENT.
   *
   * La ou `touch-action: none` est pose, le doigt ne fait plus defiler. Pose sur la ligne
   * ou sur la zone defilante, il rendrait la liste impossible a parcourir au doigt — le
   * defaut exact que l en-tete de CrmImmoColonneRow documente, et la raison pour laquelle
   * les chevrons existent.
   */
  const hook = codeSeul(lire(HOOK));
  const i = hook.indexOf("poignee: {");
  assert.ok(i > 0, "l objet poignee a disparu du hook");
  assert.match(hook.slice(i), /touchAction: 'none'/,
    "la poignee ne bloque plus le defilement : on ne peut plus saisir une ligne au doigt");
  assert.doesNotMatch(hook.slice(0, i), /touchAction/,
    "touch-action est pose ailleurs que sur la poignee");

  for (const [nom, f] of [["la ligne", ROW], ["la modale", MODALE]] as const) {
    assert.doesNotMatch(codeSeul(lire(f)), /touchAction|touch-action/,
      nom + " pose touch-action : le doigt ne ferait plus defiler la liste");
  }
});

test("B3 — les chevrons n ont pas ete remplaces", () => {
  /* Le glissement S AJOUTE. Au clavier, et a une main sur telephone, les chevrons restent
     le seul moyen de reordonner — c est ecrit en tete de CrmImmoColonneRow. */
  const row = lire(ROW);
  for (const r of ["crm-immo-colonne-monter-", "crm-immo-colonne-descendre-"]) {
    assert.ok(row.includes(r), "le chevron " + r + " a disparu : le clavier perd le reordonnancement");
  }
  for (const l of ["Monter la colonne ", "Descendre la colonne "]) {
    assert.ok(row.includes(l), "un chevron ne nomme plus la colonne concernee : " + l);
  }
  /* Et l infobulle nomme l ACTION. La poignee en porte une aussi desormais : trois
     reperes au survol dans la meme bande de 70 px, il faut qu ils disent des choses
     differentes. */
  for (const l of ['title="Monter"', 'title="Descendre"']) {
    assert.ok(row.includes(l), "un chevron a perdu son infobulle de souris : " + l);
  }
  const modale = codeSeul(lire(MODALE));
  for (const h of ["onMonter={() => deplacerSysteme(i, i - 1)}", "onMonter={() => deplacerPerso(i, i - 1)}"]) {
    assert.ok(modale.includes(h), "un chevron n est plus cable : " + h);
  }
});

test("B4 — la poignee n est pas un bouton, et ne double pas les chevrons pour un lecteur d ecran", () => {
  const bloc = blocPoignee(codeSeul(lire(ROW)));
  assert.match(bloc, /aria-hidden="true"/,
    "la poignee s annonce aux technologies d assistance : elle ajouterait une commande "
    + "inatteignable au clavier, alors que les chevrons font deja le travail");
  assert.doesNotMatch(bloc, /<button/, "la poignee est devenue un bouton, sans action au clic");
  assert.ok(bloc.includes("Glisser pour"), "la poignee a perdu son infobulle de souris");
  assert.ok(bloc.includes("crm-immo-colonne-glisser-"), "la poignee n a plus de repere");
});

test("B5 — une instance par famille : les deux listes ne se melangent pas", () => {
  const modale = codeSeul(lire(MODALE));
  assert.match(modale, /useGlisserColonnes\(\{ famille: 'systeme'/, "la liste systeme n a plus son instance");
  assert.match(modale, /useGlisserColonnes\(\{ famille: 'perso'/, "la liste personnalisee n a plus son instance");
  assert.equal((modale.match(/useGlisserColonnes\(/g) ?? []).length, 2,
    "il n y a plus exactement deux instances : les deux familles partageraient un seul geste, "
    + "et une colonne systeme se deposerait parmi les personnalisees");
  assert.ok(modale.includes("glisse={glisseSys.pourLigne(i)}"), "les lignes systeme ne se saisissent plus");
  assert.ok(modale.includes("glisse={glissePers.pourLigne(i)}"), "les lignes personnalisees ne se saisissent plus");
});

test("B6 — le pointeur est capture, et une interruption n enregistre rien", () => {
  const hook = codeSeul(lire(HOOK));
  assert.match(hook, /setPointerCapture\(e\.pointerId\)/,
    "sans capture, le geste lache des que le doigt quitte la poignee");
  /* Le systeme reprend le pointeur a la moindre interruption — appel entrant, geste
     systeme, zoom a deux doigts. Deposer la colonne la ou le doigt se trouvait serait un
     deplacement que personne n a demande. */
  assert.match(hook, /onPointerCancel: e => relacher\(e, false\)/,
    "une interruption systeme enregistre desormais un deplacement");
  assert.match(hook, /onPointerUp: e => relacher\(e, true\)/, "le relachement n enregistre plus rien");
  /* Et on n ecrit que si le rang a REELLEMENT change : l ordre des colonnes
     personnalisees part en base, un simple appui ne doit pas declencher d upsert. */
  assert.match(hook, /if \(appliquer && v\.cible !== v\.source\) onDeplacer/,
    "un simple appui sur la poignee declenche maintenant une ecriture");
  /* Un seul pointeur a la fois : un second doigt pose ailleurs ne doit pas piloter le
     geste en cours. */
  assert.equal((hook.match(/e\.pointerId !== v\.pointerId/g) ?? []).length, 2,
    "un second doigt peut desormais detourner le geste en cours");
});

test("B7 — la poignee est agrandie au doigt, et SEULEMENT sous 768 px", () => {
  /* Meme regle que tout le module : a la souris, une cible de 34 px la ou l icone en fait
     14 volerait les clics de ses voisines. */
  const bloc = blocPoignee(codeSeul(lire(ROW)));
  assert.match(bloc, /max-md:p-2\.5/, "la poignee a perdu son agrandissement tactile");
  assert.match(bloc, /self-stretch/,
    "la poignee n occupe plus la hauteur de la ligne : la cible redevient minuscule au doigt");
  for (const jeton of bloc.split(/[\s"']+/)) {
    if (jeton.includes("before:") || /(^|:)p[xy]?-\[\d+px\]$/.test(jeton)) {
      assert.ok(jeton.startsWith("max-md:"),
        "un agrandissement tactile s applique aussi sur desktop : " + jeton);
    }
  }
});

test("B8 — la zone defilante porte le ref que le geste compense", () => {
  /*
   * Sans ce ref, deux choses tombent en silence : le defilement automatique quand on tient
   * une ligne contre un bord — on ne peut alors plus sortir une colonne du bas de l ecran
   * — et la compensation du defilement, sans laquelle l apercu derive de toute la hauteur
   * parcourue et designe la mauvaise ligne.
   */
  const modale = codeSeul(lire(MODALE));
  assert.match(modale, /ref=\{corps\} className="flex-1 min-h-0 overflow-y-auto/,
    "la zone defilante a perdu son ref : plus de defilement automatique, et l apercu derive");
  assert.equal((modale.match(/scroller: corps/g) ?? []).length, 2,
    "une des deux instances ne regarde plus la zone defilante");
  const hook = codeSeul(lire(HOOK));
  assert.match(hook, /zone\.scrollTop - v\.scrollDepart/,
    "le defilement n est plus compense : l apercu designera la mauvaise ligne des que la liste defile");
  assert.match(hook, /requestAnimationFrame/, "le defilement automatique a disparu");
  assert.match(hook, /cancelAnimationFrame/,
    "la boucle de defilement n est plus arretee : elle tournerait apres la fermeture de la modale");
});

test("B10 — la ligne tenue suit le doigt sans transition, et passe au-dessus", () => {
  const hook = codeSeul(lire(HOOK));
  const i = hook.indexOf("if (apercu && saisie)");
  assert.ok(i > 0, "la branche de la ligne tenue a disparu");
  const j = hook.indexOf("} else if (apercu) {", i);
  assert.ok(j > i, "la branche des lignes ecartees a disparu");

  const tenue = hook.slice(i, j);
  assert.doesNotMatch(tenue, /transition/,
    "la ligne tenue a recu une transition : au lieu de suivre le doigt, elle lui courrait "
    + "DERRIERE avec 160 ms de retard");
  assert.match(tenue, /zIndex: 2/,
    "la ligne tenue ne passe plus au-dessus : elle glisserait SOUS ses voisines");
  assert.match(tenue, /position: 'relative'/,
    "sans position, le zIndex ne s applique pas : la ligne tenue repasse sous les autres");

  /* L inverse pour les lignes qui s ecartent : sans transition, elles sautent d un coup et
     on ne voit plus ou la colonne va tomber. */
  assert.match(hook.slice(j), /transition: 'transform 160ms ease'/,
    "les lignes qui s ecartent sautent desormais d un coup, sans montrer le trajet");
});

test("B9 — data-glisse est ce qui separe les deux listes dans le DOM", () => {
  /* Les deux listes sont des enfants de la MEME zone defilante, sans conteneur propre :
     c est cet attribut, et lui seul, qui dit a chaque instance quelles lignes sont les
     siennes. Le perdre ferait mesurer les neuf colonnes systeme ET les personnalisees. */
  assert.match(codeSeul(lire(ROW)), /data-glisse=\{glisse\?\.famille\}/,
    "la ligne ne declare plus sa famille");
  assert.match(codeSeul(lire(HOOK)), /\[data-glisse="/,
    "le hook ne cherche plus ses lignes par famille");
});
