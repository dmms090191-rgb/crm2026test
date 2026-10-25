// Le runtime web | pwa | desktop, et le GARDE QUI PROTEGE LE WEB.
//   node --import tsx --test scripts/runtime/runtime.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";

import {
  runtimeDepuisSignaux,
  lireSignauxRuntime,
  runtimeActuel,
  oublierRuntimeMemoise,
  type SignauxRuntime,
} from "../../src/lib/runtime";

/*
 * ================== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==================
 *
 * Le 25 octobre 2026, une sonde Tauri jetable a mesure, hors du depot, en `tauri dev` ET
 * sur l'executable REELLEMENT INSTALLE :
 *
 *   contexte  | window.isTauri | display-mode: standalone | hostname
 *   web       | undefined      | false                    | (le domaine)
 *   pwa       | undefined      | TRUE                     | (le domaine)
 *   desktop   | TRUE           | FALSE                    | tauri.localhost
 *
 * Deux accidents sont possibles, tous deux INVISIBLES a la relecture :
 *
 *   1. brancher le bureau sur `display-mode: standalone`. Comme il vaut FAUX en Tauri,
 *      l'application installee afficherait la LANDING WEB. C'est precisement ce que David
 *      refuse, et aucune regle du CLAUDE.md n'aurait ete enfreinte pour autant.
 *
 *   2. REMPLACER IS_PWA_STANDALONE dans App.tsx au lieu d'AJOUTER une branche. Le signal y
 *      sert a DEUX endroits : choisir PwaMobileShell quand l'utilisateur est connecte, et
 *      PwaLoginPage quand il ne l'est pas. Un remplacement ferait afficher la coquille
 *      MOBILE sur un PC. David a explicitement demande que la distinction soit ajoutee, pas
 *      substituee : les sections D et E le figent.
 *
 * Et une exigence de methode : le web ne doit pas changer d'un octet. La section C exige que
 * TOUS les termes d'origine du knownHost soient encore la, et la section F interdit qu'une
 * variable de build Vite entre dans le script en ligne de index.html — un %VITE_X% non
 * defini y laisserait son TEXTE LITTERAL, donc une valeur toujours vraie.
 */

const lire = (p: string) => readFileSync(p, "utf8");

/*
 * Un releve porte sur ce qui S'EXECUTE, jamais sur la prose : ce fichier-ci explique en
 * commentaire pourquoi le telephone virtuel n'appartient pas au runtime, et runtime.ts le
 * dit aussi. Chercher le nom dans le texte brut ferait donc echouer la regle a cause de la
 * phrase qui l'enonce. Le depot a deja paye cette lecon
 * (scripts/crm-immo/alertesDansNotifications.test.ts).
 */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const INDEX_HTML = lire("index.html");
const APP_TSX = lire("src/App.tsx");
const RUNTIME_TS = lire("src/lib/runtime.ts");
const RUNTIME_TS_CODE = sansCommentaires(RUNTIME_TS);

const AUCUN: SignauxRuntime = { tauri: false, afficheAutonome: false, standaloneApple: false };

// ---------------------------------------------------------------- A. la table de verite

test("A1 web : aucun signal", () => {
  assert.equal(runtimeDepuisSignaux(AUCUN), "web");
});

test("A2 pwa : affichage autonome, comme Edge et Chrome installes", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, afficheAutonome: true }), "pwa");
});

test("A3 pwa : navigator.standalone, la forme propre a Safari iOS", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, standaloneApple: true }), "pwa");
});

test("A4 desktop : window.isTauri, et c'est le SEUL signal du bureau", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, tauri: true }), "desktop");
});

test("A5 MESURE : en Tauri, display-mode vaut FAUX — le bureau se reconnait quand meme", () => {
  // La combinaison reellement relevee sur l'executable installe le 25/10/2026.
  const releveReel: SignauxRuntime = { tauri: true, afficheAutonome: false, standaloneApple: false };
  assert.equal(runtimeDepuisSignaux(releveReel), "desktop");
});

// ------------------------------------------------- B. la priorite, qui est une decision

test("B1 desktop PRIME sur pwa, meme si Tauri se declarait un jour autonome", () => {
  assert.equal(runtimeDepuisSignaux({ tauri: true, afficheAutonome: true, standaloneApple: false }), "desktop");
  assert.equal(runtimeDepuisSignaux({ tauri: true, afficheAutonome: false, standaloneApple: true }), "desktop");
  assert.equal(runtimeDepuisSignaux({ tauri: true, afficheAutonome: true, standaloneApple: true }), "desktop");
});

test("B2 le code TESTE bien tauri AVANT l'affichage autonome", () => {
  // Une inversion d'ordre passerait les tests A mais casserait B1. On fige donc aussi la
  // forme du code : `tauri` doit apparaitre avant `afficheAutonome` dans la fonction.
  const corps = RUNTIME_TS.slice(RUNTIME_TS.indexOf("export function runtimeDepuisSignaux"));
  const posTauri = corps.indexOf("signaux.tauri");
  const posAutonome = corps.indexOf("signaux.afficheAutonome");
  assert.ok(posTauri > -1, "runtimeDepuisSignaux doit lire signaux.tauri");
  assert.ok(posAutonome > -1, "runtimeDepuisSignaux doit lire signaux.afficheAutonome");
  assert.ok(posTauri < posAutonome, "signaux.tauri doit etre examine AVANT signaux.afficheAutonome");
});

// ------------------------------------------- C. le web ne change pas : index.html intact

test("C1 TOUS les termes d'origine du knownHost sont encore la", () => {
  // Retirer l'un d'eux casserait un environnement reel (apercu Vercel, bac a sable, etc.)
  // sans qu'aucun autre releve ne s'en apercoive.
  for (const terme of [
    "h==='localhost'",
    "h==='127.0.0.1'",
    "h.indexOf('supabase.co')!==-1",
    "h.indexOf('vercel.app')!==-1",
    "h.indexOf('webcontainer')!==-1",
    "h.indexOf('stackblitz')!==-1",
    "h.indexOf('bolt.new')!==-1",
    "h.indexOf('cloudworkstations.dev')!==-1",
  ]) {
    assert.ok(INDEX_HTML.includes(terme), `le terme ${terme} a disparu du knownHost`);
  }
});

test("C2 le terme Tauri est present, et EN TETE du knownHost", () => {
  const i = INDEX_HTML.indexOf("var knownHost=");
  assert.ok(i > -1, "la declaration de knownHost a disparu");
  const expression = INDEX_HTML.slice(i, INDEX_HTML.indexOf(";", i));
  assert.ok(expression.includes("window.isTauri===true"), "le terme Tauri manque au knownHost");
  assert.ok(
    expression.indexOf("window.isTauri===true") < expression.indexOf("h==="),
    "le terme Tauri doit etre evalue en premier : il n'exige aucune lecture de l'hote",
  );
});

test("C3 le bloc qui pose site-page est toujours garde par isSitePage OU !knownHost", () => {
  assert.ok(
    INDEX_HTML.includes("if(isSitePage||!knownHost){"),
    "la condition d'entree du bloc site-page a change : verifier l'effet sur Tauri",
  );
});

// ------------------- D. App.tsx : le signal PWA ne doit pas etre REMPLACE, mais complete

test("D1 la branche du PORTAIL PWA est intacte, a la lettre", () => {
  // Decision de David : la PWA garde EXACTEMENT son comportement actuel ; le bureau
  // s'ajoute a cote. Un COMPTE d'occurrences ne suffit pas a le garantir — une mutation
  // l'a prouve : substituer `runtimeActuel() !== 'web'` a cette ligne laissait encore deux
  // occurrences dans le fichier (la declaration et la branche de la coquille mobile), donc
  // un seuil de deux survivait. On exige donc la ligne ELLE-MEME.
  assert.ok(
    APP_TSX.includes("if (IS_PWA_STANDALONE) {"),
    "la branche du portail PWA a ete substituee au lieu d'etre completee : la PWA perdrait son ecran",
  );
});

test("D2 la branche de la coquille mobile reste conditionnee au signal PWA", () => {
  assert.ok(
    APP_TSX.includes("(IS_PWA_STANDALONE || IS_VIRTUAL_PHONE)"),
    "la garde de PwaMobileShell a change : un PC ne doit JAMAIS recevoir la coquille mobile",
  );
});

test("D3 l'apercu telephone virtuel reste SEPARE du runtime", () => {
  assert.ok(APP_TSX.includes("IS_VIRTUAL_PHONE"), "IS_VIRTUAL_PHONE a disparu d'App.tsx");
  assert.ok(
    !RUNTIME_TS_CODE.includes("VIRTUAL_PHONE") && !RUNTIME_TS_CODE.includes("virtualPhone"),
    "le telephone virtuel est orthogonal aux trois runtimes : il n'a rien a faire dans le CODE de runtime.ts",
  );
});

// --------------------------- E. runtime.ts reste pur, testable, et sans surprise d'import

test("E1 la decision n'est prise par AUCUNE lecture de l'environnement", () => {
  const i = RUNTIME_TS.indexOf("export function runtimeDepuisSignaux");
  const j = RUNTIME_TS.indexOf("export function lireSignauxRuntime");
  const fonctionPure = RUNTIME_TS.slice(i, j);
  for (const interdit of ["window.", "navigator.", "matchMedia", "document.", "import.meta"]) {
    assert.ok(
      !fonctionPure.includes(interdit),
      `runtimeDepuisSignaux lit ${interdit} : elle doit rester une fonction pure de ses signaux`,
    );
  }
});

test("E2 la lecture de l'environnement est DEFENSIVE : hors navigateur, on retombe sur web", () => {
  // C'est ce qui rend ce fichier meme executable sous Node. Et ce n'est pas theorique :
  // sous Node, navigator existe et navigator.platform vaut « Win32 ».
  assert.ok(RUNTIME_TS.includes("typeof window === 'undefined'"), "la garde hors navigateur a disparu");
  const signaux = lireSignauxRuntime();
  assert.deepEqual(signaux, { tauri: false, afficheAutonome: false, standaloneApple: false });
  oublierRuntimeMemoise();
  assert.equal(runtimeActuel(), "web", "hors navigateur, le defaut sur est web");
});

test("E3 aucune variable de build n'est lue : le signal natif suffit", () => {
  // Deux raisons mesurees. D'une part window.isTauri est disponible AVANT React, donc une
  // variable serait inutile. D'autre part le moteur miroir (depotDistant.js) lit
  // import.meta.env EN BLOC : toute clef import.meta.env.* ajoutee a l'environnement du
  // build se retrouverait inlinee dans son morceau, qu'on n'a pas le droit d'editer ici.
  assert.ok(
    !RUNTIME_TS_CODE.includes("import.meta.env"),
    "le CODE de runtime.ts ne doit lire aucune variable de build",
  );
});

test("E4 le runtime est memoise : un signal qui change en cours de route ne le change pas", () => {
  // Comparer deux appels de suite ne prouve RIEN — une mutation qui retirait la memoisation
  // y survivait, puisque l'environnement ne bougeait pas entre les deux. Il faut donc faire
  // BOUGER le signal et verifier que la valeur, elle, ne bouge pas.
  //
  // Et le risque est reel, pas theorique : `display-mode: standalone` CHANGE en cours de
  // session quand l'utilisateur installe la PWA. Sans memoisation, les composants montes
  // avant verraient 'web' et ceux montes apres 'pwa' — deux ecrans pour un seul utilisateur.
  const sauvegarde = Object.prototype.hasOwnProperty.call(globalThis, "window")
    ? (globalThis as Record<string, unknown>).window
    : undefined;
  const avaitWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  try {
    const faussefenetre: Record<string, unknown> = { isTauri: true, matchMedia: undefined };
    (globalThis as Record<string, unknown>).window = faussefenetre;
    oublierRuntimeMemoise();
    assert.equal(runtimeActuel(), "desktop", "le faux signal Tauri doit donner desktop");

    // le signal disparait en cours de route
    faussefenetre.isTauri = false;
    assert.equal(
      runtimeActuel(),
      "desktop",
      "la valeur doit rester celle du premier calcul : sans memoisation elle retomberait a web",
    );
  } finally {
    if (avaitWindow) (globalThis as Record<string, unknown>).window = sauvegarde;
    else delete (globalThis as Record<string, unknown>).window;
    oublierRuntimeMemoise();
  }
});

// ------------- G. les branches d'App.tsx : la table de verite, figee dans le source
/*
 * REGLE PRODUIT arretee par David le 25/10/2026 : si estDesktop() est vrai, Talvex ne rend
 * JAMAIS PwaMobileShell. Les deux termes de la garde valent deja faux en Tauri (mesure),
 * mais un parametre virtualPhone dans l'URL de la fenetre aurait suffi a rouvrir le chemin.
 * La regle ne depend donc plus d'une mesure, elle est ecrite.
 *
 * Et les deux branches de connexion restent SEPAREES a dessein : celle du bureau recevra le
 * launcher Talvex, celle de la PWA ne doit pas suivre. Les fusionner serait une regression
 * silencieuse — rien ne casserait aujourd'hui, et tout casserait a l'etape du launcher.
 */

test("G1 la coquille mobile est explicitement interdite au runtime desktop", () => {
  assert.ok(
    APP_TSX.includes("if (!estDesktop() && (IS_PWA_STANDALONE || IS_VIRTUAL_PHONE)"),
    "la garde de PwaMobileShell doit commencer par !estDesktop() : un PC ne recoit jamais la coquille mobile",
  );
});

test("G2 la branche de connexion desktop existe", () => {
  assert.ok(
    APP_TSX.includes("if (estDesktop()) {"),
    "la branche du portail desktop a disparu : l'application installee retomberait sur la landing web",
  );
});

test("G2bis la branche desktop rend le LAUNCHER, pas PwaLoginPage", () => {
  // Decision de David : separation visuelle ET structurelle. PwaLoginPage reste a la PWA
  // mobile ; le bureau a son propre composant. Les melanger ferait deriver la PWA.
  const i = APP_TSX.indexOf("if (estDesktop()) {");
  assert.ok(i > -1, "la branche desktop a disparu");
  // Borne a la branche SUIVANTE, pas a un nombre de caracteres : sinon la fenetre deborde
  // sur la branche PWA et le releve se trompe de cible (vu au premier passage).
  const fin = APP_TSX.indexOf("if (IS_PWA_STANDALONE) {", i);
  assert.ok(fin > i, "la branche PWA ne suit plus la branche desktop : ordre ou structure modifie");
  const branche = APP_TSX.slice(i, fin);
  assert.ok(branche.includes("<TalvexDesktopLauncher"), "la branche desktop ne rend plus le launcher");
  assert.ok(!branche.includes("<PwaLoginPage"), "la branche desktop rend PwaLoginPage : la PWA et le bureau se melangent");
});

test("G2ter le launcher n'atteint AUCUN useTheme dans sa chaine d'imports", () => {
  // Il n'est pas enveloppe d'un ThemeProvider, ce qui est volontaire : il porte sa palette
  // en propre. Mais PwaLoginPage, lui, LEVE sans fournisseur — par RegisterModal ->
  // useThemeTokens -> useTheme. Le jour ou un sous-composant theme entrerait dans la
  // chaine du launcher, l'application installee n'afficherait que l'ErrorBoundary, et
  // RIEN a la relecture ne le laisserait voir. Ce releve suit donc la chaine REELLE.
  const vus = new Set<string>();
  const coupables: string[] = [];
  const resoudre = (base: string, spec: string): string | null => {
    if (!spec.startsWith(".")) return null;
    const p = pathResolve(dirname(base), spec);
    for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
      if (existsSync(p + ext)) return p + ext;
    }
    return existsSync(p) ? p : null;
  };
  const visiter = (f: string, profondeur: number) => {
    if (vus.has(f) || profondeur > 5) return;
    vus.add(f);
    let t: string;
    try { t = readFileSync(f, "utf8"); } catch { return; }
    const code = sansCommentaires(t);
    if (/\buseTheme\s*\(/.test(code)) coupables.push(`${f} (profondeur ${profondeur})`);
    for (const m of t.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const r = resoudre(f, m[1]);
      if (r) visiter(r, profondeur + 1);
    }
  };
  visiter("src/components/TalvexDesktopLauncher.tsx", 0);
  assert.ok(vus.size > 1, "la chaine d'imports du launcher n'a pas pu etre suivie");
  assert.deepEqual(
    coupables,
    [],
    `le launcher atteint un useTheme : sans ThemeProvider l'application installee affichera l'ErrorBoundary.\n  ${coupables.join("\n  ")}`,
  );
});

test("G2quater le launcher n'ecrit PAS le code en clair dans user_metadata", () => {
  // PwaLoginPage:115 le fait (l'une des douze ecritures que le chantier de securite doit
  // retirer). Le launcher n'en ajoute pas une treizieme : la connexion n'en a pas besoin.
  const code = sansCommentaires(readFileSync("src/components/TalvexDesktopLauncher.tsx", "utf8"));
  assert.ok(
    !/updateUser\s*\(/.test(code),
    "le launcher appelle updateUser : verifier qu'il n'ecrit pas le code a six chiffres en clair",
  );
});

test("G3 la branche desktop PRECEDE la branche PWA", () => {
  const posDesktop = APP_TSX.indexOf("if (estDesktop()) {");
  const posPwa = APP_TSX.indexOf("if (IS_PWA_STANDALONE) {");
  assert.ok(posDesktop > -1 && posPwa > -1, "une des deux branches de connexion a disparu");
  assert.ok(posDesktop < posPwa, "la branche desktop doit etre examinee avant la branche PWA");
});

test("G4 les deux branches de connexion ne sont PAS fusionnees", () => {
  // Une condition fusionnee rendrait le meme composant aujourd'hui, donc rien ne casserait
  // — et le jour du launcher, la PWA le recevrait aussi.
  for (const fusion of [
    "if (estDesktop() || IS_PWA_STANDALONE)",
    "if (IS_PWA_STANDALONE || estDesktop())",
    "if (runtimeActuel() !== 'web')",
    'if (runtimeActuel() !== "web")',
  ]) {
    assert.ok(!APP_TSX.includes(fusion), `les branches desktop et PWA ont ete fusionnees : ${fusion}`);
  }
});

test("G5 estDesktop vient bien du module de runtime", () => {
  assert.ok(
    /import\s*\{[^}]*\bestDesktop\b[^}]*\}\s*from\s*['"]\.\/lib\/runtime['"]/.test(APP_TSX),
    "estDesktop doit etre importe depuis ./lib/runtime, et de nulle part ailleurs",
  );
});

test("G6 le telephone virtuel reste un terme INDEPENDANT de la garde", () => {
  // Il doit continuer de fonctionner sur le web et dans la PWA : on ne l'a pas retire,
  // on a seulement ferme le cas ou il se combinerait au bureau.
  assert.ok(
    APP_TSX.includes("IS_PWA_STANDALONE || IS_VIRTUAL_PHONE"),
    "IS_VIRTUAL_PHONE a ete retire de la garde : l'apercu telephone cesserait de fonctionner",
  );
  assert.ok(
    APP_TSX.includes("new URLSearchParams(window.location.search).has('virtualPhone')"),
    "la definition de IS_VIRTUAL_PHONE a change",
  );
});

// ----------------------- F. aucune variable Vite dans le script en ligne de index.html

test("F1 le script en ligne n'emploie AUCUNE substitution Vite", () => {
  const debut = INDEX_HTML.indexOf("<script>");
  const fin = INDEX_HTML.indexOf("</script>", debut);
  const enLigne = INDEX_HTML.slice(debut, fin);
  assert.ok(
    !enLigne.includes("%VITE_"),
    "un %VITE_X% non defini laisse son TEXTE LITTERAL, donc une valeur toujours vraie : interdit ici",
  );
});

test("F2 les substitutions Vite existantes restent cantonnees aux balises meta", () => {
  // %VITE_APP_URL% est employe trois fois dans les meta de partage social, et nulle part
  // ailleurs. Ce releve constate l'etat du 25/10/2026 : s'il casse, verifier que la nouvelle
  // occurrence n'est pas dans du code executable.
  const occurrences = INDEX_HTML.split("%VITE_APP_URL%").length - 1;
  assert.equal(occurrences, 3, "le nombre de substitutions Vite dans index.html a change");
});
