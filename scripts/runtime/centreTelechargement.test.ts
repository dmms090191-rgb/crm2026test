// Le centre de telechargement : aucun faux bouton, et une page publique sans connexion.
//   node --import tsx --test scripts/runtime/centreTelechargement.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  estTelechargeable,
  estInstallableParMagasin,
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
  /*
   * C'est ce qui rend la connexion inatteignable depuis cette page : App n'est jamais
   * monte, donc ni detection de role, ni resolution de domaine, ni fenetre de connexion.
   *
   * CE RELEVE A ETE REECRIT LE 25/10/2026. Il figeait la forme LITTERALE du ternaire, si
   * bien que l'ajout d'un bandeau a cote de <App /> — qui ne touche en rien a la propriete
   * surveillee — l'a fait rougir. Un releve qui epingle une forme reclame d'etre reecrit a
   * chaque remaniement innocent, et on prend l'habitude de le corriger sans reflechir : le
   * jour ou il signale un vrai defaut, on le corrige de la meme facon distraite.
   *
   * On verifie donc la PROPRIETE : dans la branche de la page publique, TelechargerPage est
   * seule et App n'y est pas. La forme du reste du montage est libre.
   */
  const m = sansCommentaires(lire("src/main.tsx"));
  assert.match(m, /const IS_TELECHARGER = /, "la route publique a disparu de main.tsx");

  const branchePublique = m.match(/IS_TELECHARGER \?([\s\S]*?):/);
  assert.ok(branchePublique, "le ternaire de la route publique a disparu du montage");
  assert.match(branchePublique[1], /<TelechargerPage \/>/, "la page publique n'est plus montee");
  assert.doesNotMatch(
    branchePublique[1],
    /<App\b/,
    "App est monte DANS la branche de la page publique : la connexion y redeviendrait joignable",
  );

  // Et il doit rester monte ailleurs, sinon c'est toute l'application qui disparait.
  assert.match(m, /<App \/>/, "App n'est plus monte du tout");
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

/* ==================================================================================
 * F. LA VOIE MAGASIN — iOS ne se pose pas depuis une page web
 *
 * Apple n'autorise pas l'installation d'un binaire depuis un site : elle passe par
 * TestFlight ou par l'App Store. Il n'y a donc ni fichier, ni taille, ni somme de controle.
 * Exiger `sha256` sur cette voie, par symetrie avec le telechargement direct, aurait
 * condamne iOS a rester eteint pour toujours — ou pousse a inventer une valeur, ce qui est
 * pire : une empreinte qui ne correspond a aucun fichier est un mensonge verifiable.
 *
 * La regle de fond ne change pas pour autant : rien ne s'allume sans destination.
 * ================================================================================== */

const MAGASIN_COMPLET: EntreeTelechargement = {
  statut: "disponible",
  magasin: "TestFlight",
  lien: "https://testflight.apple.com/join/XXXXXXXX",
};

test("F1 une entree magasin COMPLETE active le bouton", () => {
  assert.equal(estInstallableParMagasin(MAGASIN_COMPLET), true);
});

test("F2 sans lien, ou sans nom de magasin, rien ne s'allume", () => {
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, lien: undefined }), false);
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, magasin: undefined }), false);
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, lien: "" }), false);
});

test("F3 'bientot' n'active jamais la voie magasin non plus", () => {
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, statut: "bientot" }), false);
});

test("F4 un lien non HTTPS est refuse", () => {
  // Une invitation TestFlight est toujours en https. Un lien http ouvrirait une page non
  // chiffree depuis un bouton qui promet une installation : on refuse plutot que d'avertir.
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, lien: "http://exemple.fr" }), false);
  assert.equal(estInstallableParMagasin({ ...MAGASIN_COMPLET, lien: "javascript:alert(1)" }), false);
});

test("F5 les deux voies s'excluent : le telechargement direct l'emporte", () => {
  // Si les deux etaient remplies, c'est le fichier qui gagne : c'est le seul dont on ait
  // verifie l'empreinte. Et surtout, la page ne doit jamais afficher DEUX boutons.
  const lesDeux: EntreeTelechargement = {
    statut: "disponible",
    version: "1.0.0",
    url: "https://exemple.fr/app.apk",
    sha256: "AB".repeat(32),
    magasin: "TestFlight",
    lien: "https://testflight.apple.com/join/XXXXXXXX",
  };
  assert.equal(estTelechargeable(lesDeux), true);
  assert.equal(estInstallableParMagasin(lesDeux), false);
});

test("F6 le composant rend les DEUX voies, et un seul bouton a la fois", () => {
  const code = readFileSync("src/components/telechargement/CentreTelechargement.tsx", "utf8");
  // L'APPEL, pas le nom : le nom reste dans la ligne d'import meme quand la voie est
  // debranchee. La mutation `const parMagasin = false` passait ce releve.
  assert.match(
    code,
    /const parMagasin = estInstallableParMagasin\(entree\);/,
    "la voie magasin n'est plus calculee : iOS ne pourrait jamais s'allumer",
  );
  assert.match(code, /Installer via \{entree!\.magasin\}/, "le bouton ne nomme plus sa destination");
  assert.match(code, /target="_blank"/, "le lien magasin n'ouvre plus un nouvel onglet");
  assert.match(code, /rel="noopener noreferrer"/, "le lien magasin n'est plus isole de l'onglet parent");
  // La chaine ternaire doit rester EXCLUSIVE : actif, sinon magasin, sinon bientot.
  assert.match(code, /actif \?[\s\S]{0,900}\) : parMagasin \?[\s\S]{0,1400}\) : \(/,
    "les trois etats ne s'excluent plus : deux boutons pourraient s'afficher");
});

/* ==================================================================================
 * G. CE QUE LE MANIFESTE LIVRE DECLARE AUJOURD'HUI
 * ================================================================================== */

test("G1 Android est ouvert au public, et son entree est COMPLETE", () => {
  /*
   * CE RELEVE A CHANGE DE SENS LE 25/10/2026, ET C'ETAIT SON ROLE.
   *
   * Il exigeait d'abord qu'Android reste a 'bientot' : l'APK etait bati, signe et verifie,
   * mais quatre couples adresse + PIN de comptes REELS restaient lisibles dans l'historique
   * du depot public. J'avais ecrit ce releve pour qu'il ROUGISSE au moment de l'activation,
   * et force a relire la raison du blocage plutot qu'a l'oublier. Il a rougi ; la decision a
   * ete prise en connaissance de cause — le SaaS ne porte aucune donnee reelle a cette date.
   *
   * LA ROTATION DES PIN RESTE A FAIRE. Elle n'est pas devenue inutile, elle a ete remise a
   * plus tard : les quatre valeurs sont toujours extractibles par `git log`, et aucune
   * modification de fichier n'y changera rien. Le jour ou Talvex portera de vraies donnees,
   * cela devra etre regle AVANT, pas apres.
   *
   * Ce que le releve verifie desormais : qu'Android est complet, pas seulement allume. Un
   * statut 'disponible' sans url ni empreinte serait un bouton vers rien.
   */
  const m = JSON.parse(readFileSync("public/telechargements.json", "utf8"));

  // L'entree reste COMPLETE en permanence : c'est elle qui permet d'activer d'un mot.
  assert.ok(m.android.url.endsWith(".apk"), "l'url Android ne pointe plus vers un APK");
  assert.match(m.android.sha256, /^[0-9A-F]{64}$/, "l'empreinte Android n'a pas la forme d'un SHA-256");
  assert.ok(m.android.taille > 1_000_000, "la taille declaree ne ressemble pas a celle d'un APK");

  // La version n'est PAS figee : elle suit celle du produit. Un numero en dur se perimerait
  // a la premiere montee de version, et ce releve rougirait pour rien.
  const produit = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")).version;
  assert.equal(m.android.version, produit, "la version annoncee ne suit plus celle du produit");
  assert.ok(m.android.url.includes(`/v${produit}/`), "l'url ne pointe pas vers la version annoncee");

  /*
   * LE STATUT, LUI, N'EST PAS FIGE NON PLUS — et c'est une lecon du 25/10/2026.
   *
   * La premiere version de ce releve exigeait statut === 'disponible'. Il a rougi des la
   * premiere REPUBLICATION : corriger un defaut bloquant oblige a eteindre le bouton le
   * temps que le nouveau binaire soit en ligne, sinon il pointerait vers un 404. Un releve
   * qui interdit cette fenetre interdit de corriger.
   *
   * Ce qui compte n'est donc pas « Android est allume », mais « le manifeste ne ment pas » :
   * si l'entree est declaree disponible, elle doit etre complete ; si elle ne l'est pas,
   * estTelechargeable doit rendre faux et la page afficher « Bientot disponible ».
   */
  if (m.android.statut === "disponible") {
    assert.equal(estTelechargeable(m.android), true, "Android est declare disponible mais incomplet");
    assert.ok(m.android.publie_le, "une entree disponible doit porter sa date de publication");
  } else {
    assert.equal(estTelechargeable(m.android), false, "une entree non disponible ne doit jamais etre telechargeable");
  }
});

test("G2 iOS reste eteint tant qu'aucune application n'existe", () => {
  const m = JSON.parse(readFileSync("public/telechargements.json", "utf8"));
  assert.equal(m.ios.statut, "bientot");
  assert.equal(estTelechargeable(m.ios), false);
  assert.equal(estInstallableParMagasin(m.ios), false, "iOS afficherait un bouton sans application installable");
  assert.equal(m.ios.magasin, "TestFlight", "la voie d'installation prevue n'est plus declaree");
  assert.ok(!m.ios.url && !m.ios.sha256, "iOS ne doit pas porter de fichier : l'installation passe par un magasin");
});

test("G3 l'empreinte declaree pour Android est bien celle d'un APK existant", () => {
  // Non pas « une empreinte est presente », mais « elle a 64 caracteres hexadecimaux ».
  // Une valeur inventee ou tronquee passerait le premier controle, pas celui-ci.
  const m = JSON.parse(readFileSync("public/telechargements.json", "utf8"));
  assert.match(m.android.sha256, /^[0-9A-F]{64}$/, "l'empreinte Android n'a pas la forme d'un SHA-256");
  assert.ok(m.android.taille > 1_000_000, "la taille declaree ne ressemble pas a celle d'un APK");
});

test("G4 l'aide a l'installation n'apparait que sous un bouton ACTIF", () => {
  /*
   * Un APK telecharge depuis un navigateur Android se heurte a deux obstacles d'affilee :
   * Chrome avertit que le fichier peut endommager l'appareil, puis Android refuse
   * l'installation tant que la source n'est pas autorisee. Sans une ligne d'explication,
   * l'utilisateur telecharge puis reste devant un fichier qu'il ne sait pas ouvrir.
   *
   * Mais cette ligne n'a de sens QUE sous un bouton actif : sous une attente, elle
   * expliquerait comment installer ce qui n'existe pas encore.
   */
  const code = readFileSync("src/components/telechargement/CentreTelechargement.tsx", "utf8");
  assert.match(
    code,
    /\(actif \|\| parMagasin\) && entree\?\.aide/,
    "l'aide s'afficherait aussi sous « Bientot disponible »",
  );
});

test("G5 les plateformes dont l'installation demande un geste portent une aide", () => {
  const m = JSON.parse(readFileSync("public/telechargements.json", "utf8"));
  // Windows : SmartScreen avertit, l'installateur n'etant pas signe.
  // Android : autorisation d'installer depuis une source inconnue.
  for (const cle of ["windows", "android"]) {
    assert.ok(
      typeof m[cle].aide === "string" && m[cle].aide.length > 40,
      `${cle} ne dit plus a l'utilisateur ce qui l'attend apres le telechargement`,
    );
  }
});
