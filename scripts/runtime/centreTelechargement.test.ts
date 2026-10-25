// Le centre de telechargement : aucun faux bouton, et une page publique sans connexion.
//   node --import tsx --test scripts/runtime/centreTelechargement.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  estTelechargeable,
  plateformeDepuisSignaux,
  PLATEFORMES,
  type EntreeTelechargement,
} from "../../src/lib/plateforme";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Exigence de David, ecrite deux fois : AUCUN faux telechargement. Un bouton actif qui ne
 * delivre rien est pire qu'une absence de bouton — l'utilisateur clique, attend, et conclut
 * que Talvex est casse.
 *
 * TROIS ACCIDENTS POSSIBLES, aucun visible a la relecture :
 *
 *   1. INVERSER LE SENS DU DEFAUT. La regle est « inactif SAUF declaration complete ».
 *      Ecrite dans l'autre sens — « actif sauf si... » — un simple champ oublie dans le
 *      manifeste produirait un lien mort. La section A fige le sens.
 *
 *   2. LAISSER LA DETECTION ACTIVER UN BOUTON. Deviner l'OS ne dit RIEN de l'existence
 *      d'un fichier. Si l'etat venait de la plateforme, un visiteur Windows verrait un
 *      bouton actif meme sans binaire publie.
 *
 *   3. OUVRIR LA CONNEXION DEPUIS LA PAGE PUBLIQUE. Le CLAUDE.md protege la landing. La
 *      page est montee A LA PLACE de App : la section D verifie que cela reste vrai.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const COMPLETE: EntreeTelechargement = {
  statut: "disponible",
  version: "0.1.0",
  url: "https://example.invalid/Talvex_0.1.0_x64-setup.exe",
  sha256: "81C21B18FE6BBA8B29335F0416B4F2E6981CC2F5471142F5DBA0739B0F0F8137",
  taille: 37389337,
};

// ------------------------------------------------ A. LA REGLE DU FAUX BOUTON

test("A1 une entree COMPLETE active le bouton", () => {
  assert.equal(estTelechargeable(COMPLETE), true);
});

test("A2 'bientot' n'active jamais rien, meme avec une url", () => {
  assert.equal(estTelechargeable({ ...COMPLETE, statut: "bientot" }), false);
});

test("A3 chaque champ manquant eteint le bouton", () => {
  for (const champ of ["url", "version", "sha256"] as const) {
    const partielle = { ...COMPLETE };
    delete partielle[champ];
    assert.equal(estTelechargeable(partielle), false, `${champ} manquant devrait eteindre le bouton`);
    assert.equal(estTelechargeable({ ...COMPLETE, [champ]: "" }), false, `${champ} vide devrait eteindre le bouton`);
  }
});

test("A4 une entree absente eteint le bouton", () => {
  assert.equal(estTelechargeable(undefined), false);
});

test("A5 un statut mal orthographie n'active pas", () => {
  // La comparaison doit etre une EGALITE stricte a 'disponible'. Un test de verite au sens
  // de JavaScript, ou un « different de bientot », ouvrirait sur n'importe quelle valeur.
  for (const faux of ["Disponible", "disponible ", "dispo", "available", "true"]) {
    assert.equal(
      estTelechargeable({ ...COMPLETE, statut: faux as EntreeTelechargement["statut"] }),
      false,
      `« ${faux} » ne doit pas activer le bouton`,
    );
  }
});

test("A6 la somme de controle est exigee, meme si la page ne la verifie pas", () => {
  // Elle n'est pas la pour proteger le navigateur : elle oblige celui qui publie a avoir
  // tenu le fichier reel. On ne peut pas la remplir sans l'avoir calculee.
  assert.equal(estTelechargeable({ statut: "disponible", version: "1.0.0", url: "https://x.invalid/a.exe" }), false);
});

// ------------------------------------------------ B. LA DETECTION N'ACTIVE RIEN

test("B1 les quatre plateformes sont reconnues", () => {
  const cas: Array<[string, string]> = [
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "macos"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8)", "android"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "ios"],
  ];
  for (const [ua, attendu] of cas) {
    assert.equal(plateformeDepuisSignaux({ ua, maxTouchPoints: 0 }), attendu, ua);
  }
});

test("B2 un iPad n'est pas pris pour un Mac", () => {
  // Depuis iPadOS 13, un iPad se presente comme un Macintosh : son UA ne contient ni iPad
  // ni iPhone. Seul le nombre de points de contact les separe. Sans ce test, on lui
  // proposerait un .dmg — c'est le defaut qu'a usePwaInstall.ts aujourd'hui.
  const uaIpad = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
  assert.equal(plateformeDepuisSignaux({ ua: uaIpad, maxTouchPoints: 5 }), "ios");
  assert.equal(plateformeDepuisSignaux({ ua: uaIpad, maxTouchPoints: 0 }), "macos");
});

test("B3 userAgentData est prioritaire quand il existe", () => {
  assert.equal(
    plateformeDepuisSignaux({ ua: "Mozilla/5.0 (X11; Linux x86_64)", platformUAData: "Windows", maxTouchPoints: 0 }),
    "windows",
  );
});

test("B4 un navigateur inconnu ne fait pas echouer la detection", () => {
  assert.equal(plateformeDepuisSignaux({ ua: "", maxTouchPoints: 0 }), "inconnue");
});

test("B5 les quatre cartes sont toujours proposees, quelle que soit la detection", () => {
  // La detection ne fait que METTRE EN AVANT. Retirer une carte parce qu'on croit
  // connaitre l'appareil transformerait une erreur de detection en impasse.
  assert.deepEqual(PLATEFORMES.map((p) => p.cle), ["windows", "macos", "android", "ios"]);
});

// ------------------------------------------------ C. LE MANIFESTE REELLEMENT LIVRE

test("C1 public/telechargements.json est lisible et couvre les quatre plateformes", () => {
  const m = JSON.parse(lire("public/telechargements.json"));
  for (const p of PLATEFORMES) {
    assert.ok(m[p.cle], `le manifeste ne declare pas ${p.cle}`);
  }
});

test("C2 aucune entree du manifeste livre n'est 'disponible' sans etre COMPLETE", () => {
  // Le releve qui compte le plus de ce fichier : il relit le manifeste reellement livre et
  // refuse qu'une plateforme s'y declare disponible sans url, version et somme de controle.
  // C'est ce qui empeche un faux bouton d'arriver en production par un simple oubli.
  const m = JSON.parse(lire("public/telechargements.json"));
  for (const p of PLATEFORMES) {
    const e = m[p.cle];
    if (e && e.statut === "disponible") {
      assert.ok(
        estTelechargeable(e),
        `${p.cle} se declare disponible mais son entree est incomplete : ${JSON.stringify(e)}`,
      );
    }
  }
});

// ------------------------------------------------ D. LA PAGE PUBLIQUE

test("D1 la page est montee A LA PLACE de App, pas a l'interieur", () => {
  // C'est ce qui rend la connexion inatteignable depuis cette page : App n'est jamais
  // monte, donc ni detection de role, ni resolution de domaine, ni fenetre de connexion.
  const m = sansCommentaires(lire("src/main.tsx"));
  assert.match(m, /const IS_TELECHARGER = /, "la route publique a disparu de main.tsx");
  assert.match(
    m,
    /\{IS_TELECHARGER \? <TelechargerPage \/> : IS_SITE_PREVIEW \? <SitePreviewEntry \/> : <App \/>\}/,
    "le montage a change de forme : verifier que App n'est pas monte en meme temps",
  );
});

test("D2 la page revele #root elle-meme", () => {
  // src/index.css:14 pose #root { opacity: 0 }. Les quatre endroits qui ajoutent app-ready
  // appartiennent tous a App : aucun n'est monte ici. Sans cette ligne la page serait
  // rendue, correcte, et INVISIBLE — sans aucune erreur pour le signaler.
  const p = lire("src/pages/public/TelechargerPage.tsx");
  assert.match(p, /classList\.add\('app-ready'\)/, "la page ne revele plus #root : elle serait invisible");
  assert.match(lire("src/index.css"), /#root \{ opacity: 0; \}/, "la regle d'opacite a change : reverifier le raisonnement");
});

test("D3 la page publique n'ouvre aucun chemin de connexion", () => {
  const p = sansCommentaires(lire("src/pages/public/TelechargerPage.tsx"));
  for (const i of ["LoginModal", "signInWithPassword", "PwaLoginPage", "TalvexDesktopLauncher"]) {
    assert.ok(!p.includes(i), `la page publique atteint ${i}`);
  }
});

test("D4 le centre ne lit aucun contexte de theme", () => {
  // Il doit s'afficher sur la page publique, ou il n'y a pas de ThemeProvider : useTheme y
  // leverait et l'ErrorBoundary remplacerait la page.
  const c = sansCommentaires(lire("src/components/telechargement/CentreTelechargement.tsx"));
  assert.ok(!/\buseTheme\s*\(/.test(c), "le centre appelle useTheme");
  assert.ok(!/\buseThemeTokens\s*\(/.test(c), "le centre appelle useThemeTokens : il leverait sur la page publique");
  // L'IMPORT DE VALEUR est interdit aussi, pas seulement l'appel. Un `import type` est
  // efface au build et n'entraine rien ; un import ordinaire signale qu'on s'apprete a
  // appeler, et c'est le moment de le dire — pas apres que la page publique ait leve.
  assert.match(
    c,
    /import type \{ useThemeTokens \}/,
    "useThemeTokens n'est plus importe en type seul : le centre s'apprete a lire un contexte",
  );
});

// ------------------------------------------------ E. L'ONGLET

test("E1 l'onglet est declare partout ou il doit l'etre", () => {
  assert.match(lire("src/pages/admin/adminDashboardTypes.ts"), /\| 'telecharger'/, "ActiveView");
  assert.match(lire("src/pages/admin/Sidebar.tsx"), /\{ id: 'telecharger', label: 'Télécharger' \}/, "barre laterale");
  assert.match(lire("src/pages/admin/dashboard/AdminViewRenderer.tsx"), /case 'telecharger':/, "renderer");
  assert.match(lire("src/pages/admin/adminDashboardConstants.ts"), /'telecharger': 'Télécharger'/, "fil d'Ariane");
});

test("E2 l'onglet est VISIBLE par defaut", () => {
  // Declare hidden:true, il n'apparaitrait chez personne — et seul Talvex pourrait le
  // demasquer, ce qui est precisement le defaut de l'onglet « Application ».
  const s = lire("src/pages/admin/Sidebar.tsx");
  assert.ok(
    !/\{ id: 'telecharger',[^}]*hidden: true/.test(s),
    "l'onglet Telecharger est masque par defaut : Bellisimmo ne le verrait pas",
  );
});

test("E3 l'onglet « Application » n'a pas ete remplace", () => {
  // Demande explicite de David : il configure la PWA d'une societe et fait autre chose.
  const s = lire("src/pages/admin/Sidebar.tsx");
  assert.match(s, /\{ id: 'application', label: 'Application', hidden: true \}/, "l'onglet Application a ete modifie");
  assert.match(
    lire("src/pages/admin/dashboard/AdminViewRenderer.tsx"),
    /case 'application': return <Suspense fallback=\{lazyFallback\}><AdminApplicationPage \/><\/Suspense>;/,
    "la vue Application a ete modifiee",
  );
});
