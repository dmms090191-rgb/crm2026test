// Fermer une modale du module, et nommer ses boutons-icones.
//   node --test scripts/crm-immo/fermetureModales.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/*
 * CE QUI A ETE EPROUVE DANS UN NAVIGATEUR, ET QUE CE FICHIER EMPECHE DE PERDRE.
 *
 * Les quatre modales ont ete montees a 375 px hors session Supabase, et chaque geste a
 * ete declenche pour de vrai :
 *
 *   Echap, formulaire vierge           -> ferme
 *   Echap, formulaire saisi            -> N'OUVRE PAS la sortie : avertit, puis ferme au 2e
 *   clic sur le fond                   -> ferme
 *   clic a l'interieur                 -> ne ferme pas
 *   mousedown DEDANS, relache sur le fond -> ne ferme pas
 *   retour a la valeur d'origine       -> la fiche redevient intacte, un geste suffit
 *   modale de suppression              -> AUCUN geste n'a jamais appele onConfirmer
 *
 * ---------- POURQUOI UN TEST DE SOURCE ----------
 *
 * Aucun de ces comportements ne plante quand il disparait. Une modale qui ne se ferme
 * plus a Echap n'emet aucune erreur ; un bouton-icone sans nom accessible s'affiche
 * exactement pareil. Seule la lecture du source les protege dans l'integration continue,
 * qui n'a ni navigateur ni lecteur d'ecran.
 */

const lire = (p: string) => readFileSync(p, "utf8");
const D = "src/pages/admin/views/crm-immo/";

/* Les commentaires CITENT les classes qu'ils expliquent : les compter rendrait un test
   d'arite vert alors que le code aurait perdu la classe. */
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

/** Les quatre modales, et le nom du rappel qui les ferme. */
const MODALES: { fichier: string; fermeture: string; quoi: string }[] = [
  { fichier: D + "CrmImmoDossierModal.tsx", fermeture: "onFermer", quoi: "Ajouter / Modifier un dossier" },
  { fichier: D + "CrmImmoColonnesModal.tsx", fermeture: "onFermer", quoi: "Colonnes personnalisees" },
  { fichier: D + "CrmImmoDeleteModal.tsx", fermeture: "onAnnuler", quoi: "Suppression" },
];

const UTILITAIRE = D + "useFermetureModale.ts";

test("garde du garde — les fichiers examines existent et sont pleins", () => {
  for (const m of MODALES) assert.ok(lire(m.fichier).length > 500, m.fichier + " : vide ou tronque");
  assert.ok(lire(UTILITAIRE).length > 1000, UTILITAIRE + " : vide ou tronque");
});

// ===========================================================================
// A — LA FERMETURE
// ===========================================================================

test("A1 — les trois modales passent par le MEME utilitaire", () => {
  /* Trois fichiers, et la modale Dossier sert a la fois Ajouter et Modifier : quatre
     ecrans, une seule facon de fermer. Ecrire la meme douzaine de lignes quatre fois,
     c'est se garantir qu'une des quatre divergera. */
  for (const m of MODALES) {
    const s = lire(m.fichier);
    assert.match(s, /import \{ useFermetureModale \} from '\.\/useFermetureModale'/,
      m.quoi + " n importe plus l utilitaire de fermeture");
    assert.match(s, /useFermetureModale\(\{/, m.quoi + " ne l appelle pas");
    assert.match(s, /\{\.\.\.fermeture\.proprietesDuFond\}/,
      m.quoi + " ne pose plus les proprietes sur son fond : le clic a cote ne ferme plus");
  }
});

test("A2 — Echap ferme, et l ecouteur est retire au demontage", () => {
  const s = lire(UTILITAIRE);
  assert.match(s, /e\.key === 'Escape'/, "la touche Echap n est plus ecoutee");
  assert.match(s, /document\.addEventListener\('keydown'/, "aucun ecouteur clavier");
  assert.match(s, /return \(\) => document\.removeEventListener\('keydown'/,
    "l ecouteur clavier n est pas retire : il survivrait a la modale et fermerait la suivante");

  /* L'ecouteur ne doit PAS se reabonner a chaque frappe : les valeurs vivantes passent
     par une reference, et le rappel ne depend de rien. */
  assert.match(s, /useRef\(\{ onFermer, bloquee, aPerdre, confirmationDemandee \}\)/,
    "les valeurs vivantes ne passent plus par une reference");
  assert.match(s, /const demander = useCallback\([\s\S]{0,400}?\}, \[\]\)/,
    "demander() a repris des dependances : l ecouteur se reabonnerait a chaque caractere saisi");
});

test("A3 — le clic sur le fond ne ferme que s il VIENT du fond", () => {
  const s = lire(UTILITAIRE);
  assert.match(s, /if \(e\.target !== e\.currentTarget\) return/,
    "un clic parti de l interieur de la modale la fermerait");
});

test("A4 — le geste doit aussi COMMENCER sur le fond", () => {
  /*
   * Le piege : un clic est emis sur l'ANCETRE COMMUN du mousedown et du mouseup.
   * Selectionner du texte dans un champ puis relacher la souris en dehors de la modale
   * emet donc un clic dont la cible EST le fond, et le formulaire se ferme.
   *
   * Eprouve dans un navigateur : mousedown sur le cadre, clic sur le fond -> la modale
   * reste ouverte.
   */
  const s = lire(UTILITAIRE);
  assert.match(s, /onMouseDown/, "la cible du mousedown n est plus observee");
  assert.match(s, /departSurLeFond/, "le depart du geste n est plus memorise");
  assert.match(s, /if \(!departSurLeFond\.current\) return/,
    "un geste commence DANS la modale et relache sur le fond la fermerait : "
    + "selectionner du texte deviendrait un moyen de perdre sa saisie");
});

test("A5 — aucun geste de sortie ne peut declencher une suppression", () => {
  /*
   * L'exigence la plus importante de ce correctif. Echap et le clic a cote ANNULENT.
   * Le seul chemin vers la suppression reste le bouton qui porte le mot.
   */
  const s = lire(D + "CrmImmoDeleteModal.tsx");
  const appel = s.match(/useFermetureModale\(\{[^}]*\}\)/);
  assert.ok(appel, "la modale de suppression n appelle plus l utilitaire");
  assert.match(appel![0], /onFermer:\s*onAnnuler/,
    "la fermeture de la modale de suppression ne passe pas par onAnnuler : " + appel![0]);
  assert.ok(!/onConfirmer/.test(appel![0]),
    "onConfirmer apparait dans la fermeture : un geste de sortie pourrait SUPPRIMER. " + appel![0]);

  /*
   * Et onConfirmer ne doit etre CABLE que sur son bouton : exactement un onClick, et
   * jamais sur un chemin de fermeture — ni le clavier, ni le fond, ni l utilitaire.
   */
  const cables = (s.match(/onClick=\{onConfirmer\}/g) ?? []).length;
  assert.equal(cables, 1,
    "onConfirmer est cable " + cables + " fois au lieu d une seule");

  const CHEMINS_DE_SORTIE = /fermeture|Escape|keydown|proprietesDuFond|onMouseDown|useFermetureModale/;
  const fautives = s.split("\n")
    .map((l, i) => ({ n: i + 1, l }))
    .filter(x => x.l.includes("onConfirmer") && !x.l.trim().startsWith("*"))
    .filter(x => CHEMINS_DE_SORTIE.test(x.l));
  assert.deepEqual(fautives.map(x => x.n + " : " + x.l.trim()), [],
    "onConfirmer apparait sur un chemin de FERMETURE : un geste de sortie pourrait supprimer");
});

test("A6 — pendant une ecriture, aucun geste ne ferme", () => {
  /* La suppression est partie : refermer la modale ne l arreterait pas, et ferait croire
     le contraire. Meme raison pour l enregistrement d un dossier. */
  assert.match(lire(UTILITAIRE), /if \(bl\) return;/,
    "l utilitaire ne refuse plus les gestes pendant une ecriture");
  for (const f of [D + "CrmImmoDossierModal.tsx", D + "CrmImmoDeleteModal.tsx"]) {
    const appel = lire(f).match(/useFermetureModale\(\{[\s\S]{0,200}?\}\)/);
    assert.ok(appel, f + " : appel introuvable");
    assert.match(appel![0], /bloquee:\s*enCours/,
      f.split("/").pop() + " ne bloque plus la fermeture pendant l ecriture : " + appel![0]);
  }
});

test("A7 — ce qu il y a a perdre exige DEUX gestes, pas un", () => {
  /*
   * Sur telephone, la feuille occupe presque tout l ecran : le fond se reduit a une bande
   * de soixante-cinq pixels en haut, exactement la ou le pouce passe. Un formulaire de
   * dix champs ne doit pas partir sur ce geste-la.
   *
   * Le premier geste ARME, le second ferme — la convention du module, deja celle du
   * bouton Supprimer d une colonne.
   */
  const u = lire(UTILITAIRE);
  assert.match(u, /if \(perdre && !deja\) \{ setConfirmation\(true\); return; \}/,
    "le premier geste ne met plus en garde : une saisie partirait du premier coup");

  const dossier = lire(D + "CrmImmoDossierModal.tsx");
  assert.match(dossier, /aPerdre:\s*modifie/,
    "la modale Dossier ne signale plus qu elle porte une saisie");
  /* `modifie` compare a l'etat du DEPART, pas un drapeau pose a la premiere frappe :
     revenir soi-meme sur ses pas rend le formulaire intact, et un geste suffit alors. */
  assert.match(dossier, /JSON\.stringify\(saisie\) !== depart/,
    "la comparaison avec l etat du depart a disparu");

  const colonnes = lire(D + "CrmImmoColonnesModal.tsx");
  assert.match(colonnes, /aPerdre:\s*nouveauNom\.trim\(\) !== ''/,
    "la modale Colonnes ne protege plus le nom en cours de frappe");

  /* La modale de SUPPRESSION, elle, n a rien a perdre : exiger deux gestes pour ANNULER
     une confirmation serait absurde. */
  const supp = lire(D + "CrmImmoDeleteModal.tsx").match(/useFermetureModale\(\{[\s\S]{0,200}?\}\)/)![0];
  assert.ok(!/aPerdre/.test(supp), "la modale de suppression exige deux gestes pour annuler : " + supp);

  /* Elle s en remet donc au DEFAUT, qui doit rester << rien a perdre >>. L inverser
     imposerait deux gestes partout, y compris la ou il n y a rien a sauver. */
  assert.match(u, /aPerdre = false/,
    "le defaut de aPerdre a change : toutes les modales exigeraient deux gestes");
});

test("A8 — le refus n est pas silencieux, et il s oublie des que la frappe reprend", () => {
  /* Un geste qui ne fait rien et ne dit rien se lit comme une panne. */
  for (const [f, testid] of [
    [D + "CrmImmoDossierModal.tsx", "crm-immo-dossier-confirmer-fermeture"],
    [D + "CrmImmoColonnesModal.tsx", "crm-immo-colonnes-confirmer-fermeture"],
  ] as [string, string][]) {
    const s = lire(f);
    assert.match(s, new RegExp("fermeture\\.confirmationDemandee && \\("),
      f.split("/").pop() + " n affiche plus d avertissement quand il refuse de fermer");
    assert.ok(s.includes(testid), f.split("/").pop() + " : l avertissement n a plus de data-testid");
    assert.match(s, /fermeture\.reinitialiser\(\)/,
      f.split("/").pop() + " n oublie pas le geste arme quand l utilisateur reprend sa saisie");
  }
});

// ===========================================================================
// B — LES BOUTONS-ICONES ONT UN NOM
// ===========================================================================

/**
 * Les boutons dont le contenu rendu est VIDE une fois les balises retirees.
 *
 * Un `<button>` qui ne contient qu'un `<svg>` n'a aucun nom accessible. Un bouton qui
 * contient `{f.libelle}` ou `{enCours ? 'Suppression…' : '…'}` en a un : c'est pourquoi
 * on ne retire pas les accolades, seulement les balises.
 */
/*
 * ---------- POURQUOI UN ANALYSEUR ET NON UNE EXPRESSION REGULIERE ----------
 *
 * Premiere version : /<button\b[\s\S]*?(?<!=)>/ — la balise s'arrete au premier `>` qui
 * ne suit pas un `=`. Elle a laisse passer un bouton ENTIER, en silence.
 *
 * La raison : le commentaire qui explique la mesure de ce bouton contient
 * << descendre >>, et ce `>` coupait la balise en plein milieu. Le reste des attributs
 * devenait alors le << contenu >> du bouton, donc non vide, donc le bouton n'etait pas
 * reconnu comme un bouton-icone — et ses trois assertions ne s'executaient pas.
 *
 * Trouve par mutation : retirer l'aria-label de ce bouton ne faisait echouer aucun test.
 *
 * On lit donc la balise caractere par caractere, en ignorant les `>` qui vivent dans un
 * commentaire, dans une chaine, ou entre accolades.
 */
function finDeBalise(src: string, depart: number): number {
  let i = depart, accolades = 0;
  let chaine: string | null = null;
  let commentaire = false;
  while (i < src.length) {
    const c = src[i], d = src.slice(i, i + 2);
    if (commentaire) { if (d === "*/") { commentaire = false; i += 2; continue; } i++; continue; }
    if (chaine) { if (c === "\\") { i += 2; continue; } if (c === chaine) chaine = null; i++; continue; }
    if (d === "/*") { commentaire = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") { chaine = c; i++; continue; }
    if (c === "{") { accolades++; i++; continue; }
    if (c === "}") { accolades--; i++; continue; }
    if (c === ">" && accolades === 0) return i;
    i++;
  }
  return -1;
}

function boutonsIcone(src: string): { balise: string; ligne: number }[] {
  const out: { balise: string; ligne: number }[] = [];
  const re = /<button\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const fin = finDeBalise(src, m.index + 7);
    if (fin < 0) continue;
    const ferme = src.indexOf("</button>", fin);
    if (ferme < 0) continue;
    const contenu = src.slice(fin + 1, ferme).replace(/<[^>]*>/g, "").trim();
    if (contenu !== "") continue;
    out.push({ balise: src.slice(m.index, fin + 1), ligne: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

const FICHIERS_MODULE = readdirSync(D).filter(f => f.endsWith(".tsx")).map(f => D + f);

test("B0 — le detecteur de boutons-icones n est pas inerte", () => {
  /* Garde du garde : s il ne trouvait plus rien, tout le reste de cette section
     passerait sans rien verifier. Releve dans un navigateur : 53 boutons-icones rendus,
     dont 14 distincts dans la source. */
  const total = FICHIERS_MODULE.reduce((n, f) => n + boutonsIcone(lire(f)).length, 0);
  assert.ok(total >= 12, "le detecteur ne trouve que " + total + " boutons-icones : il est casse");

  /* Et il ne doit PAS compter un bouton qui porte du texte. */
  const supp = boutonsIcone(lire(D + "CrmImmoDeleteModal.tsx"));
  assert.equal(supp.length, 0,
    "la modale de suppression n a que des boutons a texte : le detecteur en compte " + supp.length);
});

test("B1 — tout bouton-icone du module porte un aria-label", () => {
  /*
   * Un `title` s affiche au SURVOL d une souris : sur un ecran tactile il n existe pas,
   * et un lecteur d ecran ne le lit qu en dernier recours, selon le navigateur. Un bouton
   * dont le contenu est un <svg> se retrouve annonce << bouton >>, sans plus.
   */
  const sansNom: string[] = [];
  for (const f of FICHIERS_MODULE) {
    for (const b of boutonsIcone(lire(f))) {
      if (!/aria-label/.test(b.balise)) sansNom.push(f.split("/").pop() + ":" + b.ligne);
    }
  }
  assert.deepEqual(sansNom, [], "boutons-icones sans nom accessible : " + sansNom.join(", "));
});

test("B2 — les libelles NOMMENT leur objet, en francais", () => {
  /*
   * << Monter >> ne dit pas quoi. Dans une liste de quatorze colonnes, c est quatorze
   * boutons au nom identique : un lecteur d ecran les annonce tous pareil, et l ordre
   * devient impossible a changer sans voir l ecran.
   */
  const COURTS: string[] = [];
  for (const f of FICHIERS_MODULE) {
    for (const b of boutonsIcone(lire(f))) {
      const m = b.balise.match(/aria-label=\{?["'`]?([^"'`}]*)/);
      const libelle = (m?.[1] ?? "").trim();
      /* Un libelle construit (template ou ternaire) nomme deja son objet par construction :
         on verifie alors qu il interpole bien quelque chose. */
      const construit = /aria-label=\{/.test(b.balise);
      if (construit) {
        assert.match(b.balise, /aria-label=\{[^}]*(\$\{|\?)/,
          f.split("/").pop() + ":" + b.ligne + " : libelle construit mais constant");
        continue;
      }
      if (libelle.split(/\s+/).filter(Boolean).length < 2) {
        COURTS.push(f.split("/").pop() + ":" + b.ligne + ' « ' + libelle + ' »');
      }
    }
  }
  assert.deepEqual(COURTS, [],
    "libelles d un seul mot, qui ne disent pas sur QUOI ils agissent : " + COURTS.join(", "));

  /* Les sept boutons d une ligne de colonne doivent tous nommer LA colonne. */
  const row = lire(D + "CrmImmoColonneRow.tsx");
  for (const b of boutonsIcone(row)) {
    assert.match(b.balise, /colonne\.nom/,
      "CrmImmoColonneRow:" + b.ligne + " : le libelle ne nomme pas la colonne concernee");
  }
});

test("B3 — le title reste, pour la souris", () => {
  /* L aria-label REMPLACE le title pour les technologies d assistance, mais le title
     reste la seule infobulle au survol. Retirer l un pour l autre perdrait un public. */
  const sansTitre: string[] = [];
  for (const f of FICHIERS_MODULE) {
    for (const b of boutonsIcone(lire(f))) {
      if (!/title=/.test(b.balise)) sansTitre.push(f.split("/").pop() + ":" + b.ligne);
    }
  }
  assert.deepEqual(sansTitre, [], "boutons-icones sans infobulle : " + sansTitre.join(", "));
});

test("B4 — les interrupteurs annoncent leur etat", () => {
  /* Masquer / afficher une colonne est un interrupteur, pas une action : son libelle
     change, et aria-pressed le redit sous une forme que les technologies d assistance
     restituent comme un etat. Meme traitement que l oeil des cartes de notification. */
  const row = lire(D + "CrmImmoColonneRow.tsx");
  const i = row.indexOf("crm-immo-colonne-masquer-");
  assert.ok(i > 0, "le bouton Masquer a disparu");
  const bloc = row.slice(Math.max(0, i - 700), i + 200);
  assert.match(bloc, /aria-pressed=\{colonne\.masquee\}/,
    "le bouton Masquer n annonce plus son etat");
  assert.match(bloc, /colonne\.masquee \? `Afficher la colonne/,
    "le libelle du bouton Masquer ne suit plus son etat");
});

// ===========================================================================
// C — CE CORRECTIF N A RIEN DEFAIT
// ===========================================================================

test("C1 — les cibles tactiles et les regles mobiles sont intactes", () => {
  /*
   * Releve a 375 px APRES ce correctif, et identique a celui d avant : zero element
   * au-dela du bord, champs a 16 px, et aucune cible sous 44 px hors les deux chevrons
   * empiles, a 46 x 30 par construction.
   *
   * Le detail de chacune de ces regles vit dans cibleTactile.test.ts ; on verifie ici
   * qu ajouter des attributs n a pas chasse une classe au passage.
   */
  const ATTENDU: [string, RegExp[]][] = [
    [D + "CrmImmoDossierModal.tsx", [/max-md:text-base/, /max-h-\[92dvh\]/, /max-md:before:-inset-2/, /env\(safe-area-inset-bottom/]],
    [D + "CrmImmoColonnesModal.tsx", [/max-md:text-base/, /max-h-\[92dvh\]/, /max-md:before:-inset-2/, /overscroll-contain/]],
    [D + "CrmImmoDeleteModal.tsx", [/max-h-\[92dvh\]/, /max-md:py-3/, /break-words/]],
    [D + "CrmImmoColonneRow.tsx", [/max-md:p-\[15px\]/, /max-md:p-\[14px\]/, /max-md:before:-inset-x-2/]],
    [D + "CrmImmoCloche.tsx", [/max-md:p-\[15px\]/, /max-md:py-3\.5/, /max-h-\[70dvh\]/]],
  ];
  for (const [f, regles] of ATTENDU) {
    const s = lire(f);
    for (const r of regles) {
      assert.match(s, r, f.split("/").pop() + " a perdu " + r.source + " : regression mobile");
    }
  }

  /*
   * Et les COMPTES, pas seulement la presence : la modale Dossier habille trois sortes
   * de champs — les dix champs systeme, le select des colonnes oui/non, et le champ des
   * colonnes personnalisees. Une seule des trois qui retomberait a 14 px suffirait a
   * faire zoomer iOS, et une assertion de simple presence ne le verrait pas.
   */
  /* Sur le CODE seul : les commentaires de ces fichiers citent les classes qu'ils
     expliquent, et les compter ferait passer un test qui ne verifie plus rien. */
  const dossier = codeSeul(lire(D + "CrmImmoDossierModal.tsx"));
  assert.equal((dossier.match(/max-md:text-base/g) ?? []).length, 3,
    "les trois sortes de champs de la modale Dossier ne sont plus toutes a 16 px sur mobile");
  const row = codeSeul(lire(D + "CrmImmoColonneRow.tsx"));
  assert.equal((row.match(/max-md:p-\[15px\]/g) ?? []).length, 3,
    "les trois boutons d action d une ligne de colonne ne font plus tous 44 px");
  assert.equal((row.match(/max-md:p-\[14px\]/g) ?? []).length, 2,
    "la paire valider / annuler du renommage ne fait plus 44 px");
});
