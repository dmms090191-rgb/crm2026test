// Les emails d'acces rapide dans le launcher de bureau : stockage, securite, empilement.
//   node --import tsx --test scripts/runtime/quickEmailsLauncher.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le 25 octobre 2026, les trois boutons « Rapides / Enregistrer / Gerer » de la connexion
 * web ont ete portes dans le launcher Windows. L'audit prealable a etabli quatre faits qui
 * ne se voient PAS a la relecture, et dont la violation casserait quelque chose en
 * silence :
 *
 *  1. LA CLE DE STOCKAGE EST PARTAGEE PAR CINQ IMPLEMENTATIONS. Si l'une derive, les
 *     listes se scindent sans aucune erreur : chaque interface croira avoir raison.
 *
 *  2. CE STOCKAGE NE DOIT CONTENIR QUE DES ADRESSES. Le jour ou quelqu'un y rangerait le
 *     code a six chiffres « pour pre-remplir », il ecrirait un mot de passe en clair dans
 *     un LevelDB du profil WebView2 — et sur ce projet les mots de passe reels sont deja
 *     en clair dans un depot GitHub public : l'email est la moitie manquante du couple.
 *
 *  3. LES PANNEAUX DOIVENT PASSER PAR UN PORTAIL. Dans le launcher, la <section> de droite
 *     porte un backdrop-filter et le bloc du champ email garde un transform : tous deux
 *     creent un bloc conteneur pour les descendants `position: fixed`. Sans portail, un
 *     `fixed inset-0` se replie sur la boite du champ, voile compris. Ca se voit a l'oeil,
 *     mais seulement si on ouvre le panneau — donc pas a la relecture du diff.
 *
 *  4. LE LAUNCHER N'A PAS DE ThemeProvider. Le composant web ne peut donc pas etre
 *     reutilise : son `import type` de useThemeTokens suffit a faire rougir G2ter, dont la
 *     resolution d'imports ne distingue pas les imports de type. D'ou le jumeau.
 */

const lire = (f: string) => readFileSync(f, "utf8");

// Les commentaires citent volontiers ce qu'ils interdisent : on les retire avant de
// chercher un appel. Precedent du depot : alertesDansNotifications.test.ts.
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const STOCKAGE = "src/lib/quickEmails.ts";
const COMPOSANT = "src/components/TalvexDesktopQuickEmails.tsx";
const LAUNCHER = "src/components/TalvexDesktopLauncher.tsx";
const PALETTE = "src/lib/talvexDesktopPalette.ts";

// Les quatre implementations deja en place, qui partagent la meme cle.
const ECRIVAINS_WEB = [
  "src/components/login/QuickEmailSelector.tsx",
  "src/components/PwaLoginPage.tsx",
  "src/components/SimulatedPhoneLoginScreen.tsx",
  "src/pages/superadmin/views/site-builder/templates/TalvexQuickEmailShell.tsx",
];

// ----------------------------------------- A. LE STOCKAGE, ET SON PARTAGE AVEC LE WEB

test("A1 la cle est exactement celle du web", () => {
  assert.match(lire(STOCKAGE), /const CLE = 'crm_quick_login_emails';/);
});

test("A2 les quatre implementations web citent TOUJOURS la meme cle", () => {
  // Si l'une derive, les listes se scindent en silence. Ce releve constate l'etat du
  // 25/10/2026 : s'il casse, c'est qu'une interface a change de cle, pas que le test a tort.
  const fautifs = ECRIVAINS_WEB.filter((f) => !lire(f).includes("'crm_quick_login_emails'"));
  assert.deepEqual(fautifs, [], `ces fichiers n'ecrivent plus sous la cle partagee :\n  ${fautifs.join("\n  ")}`);
});

test("A3 une valeur illisible rend une liste vide, et ne leve pas", async () => {
  const { getQuickEmails } = await import("../../src/lib/quickEmails");
  const magasin: Record<string, string> = { crm_quick_login_emails: "{ceci n'est pas du JSON" };
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => magasin[k] ?? null,
    setItem: (k: string, v: string) => { magasin[k] = v; },
  };
  assert.deepEqual(getQuickEmails(), []);
});

test("A4 une valeur du mauvais TYPE est filtree, pas rendue telle quelle", async () => {
  const { getQuickEmails } = await import("../../src/lib/quickEmails");
  // Un tiers pourrait ranger des objets sous cette cle. L'appelant ne doit jamais recevoir
  // autre chose que des chaines, sinon `email.trim()` leverait dans l'interface.
  const magasin: Record<string, string> = {
    crm_quick_login_emails: JSON.stringify(["bon@talvex.fr", { pin: "123456" }, null, 42]),
  };
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => magasin[k] ?? null,
    setItem: (k: string, v: string) => { magasin[k] = v; },
  };
  assert.deepEqual(getQuickEmails(), ["bon@talvex.fr"]);
});

test("A5 une ecriture refusee rend false, au lieu de lever", async () => {
  const { setQuickEmails } = await import("../../src/lib/quickEmails");
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
  };
  // Les quatre implementations web laissent l'exception remonter. Ici l'interface doit
  // pouvoir dire que l'enregistrement n'a pas eu lieu, plutot qu'afficher un succes.
  assert.equal(setQuickEmails(["a@b.fr"]), false);
});

test("A6 la validation est la MEME expression que les quatre implementations web", async () => {
  const { isValidEmail } = await import("../../src/lib/quickEmails");
  for (const bon of ["a@b.fr", "contact@talvex.fr", "x.y+z@sous.domaine.co"]) {
    assert.equal(isValidEmail(bon), true, `refuse a tort : ${bon}`);
  }
  for (const m of ["sans-arobase", "a@b", "a b@c.fr", "@b.fr", "a@.fr", ""]) {
    assert.equal(isValidEmail(m), false, `accepte a tort : ${JSON.stringify(m)}`);
  }
});

// ----------------------------------------- B. AUCUN SECRET, NI MAINTENANT NI PLUS TARD

test("B1 le stockage n'atteint NI supabase NI la saisie du code", () => {
  const code = sansCommentaires(lire(STOCKAGE));
  assert.ok(!/from\s+['"].*supabase/.test(code), "le module de stockage importe supabase");
  assert.ok(!/usePinInput/.test(code), "le module de stockage touche a la saisie du code");
});

test("B2 le composant des trois boutons n'atteint NI supabase NI la saisie du code", () => {
  const code = sansCommentaires(lire(COMPOSANT));
  assert.ok(!/from\s+['"].*supabase/.test(code), "le composant importe supabase");
  assert.ok(!/usePinInput/.test(code), "le composant touche a la saisie du code");
  assert.ok(!/signInWithPassword/.test(code), "le composant tente de se connecter");
  assert.ok(!/updateUser\s*\(/.test(code), "le composant ecrit dans user_metadata");
});

test("B3 le composant n'ecrit AUCUNE cle de stockage en direct", () => {
  // Tout passe par src/lib/quickEmails.ts. Un setItem pose ici serait un second magasin,
  // invisible du module et donc des releves ci-dessus.
  const code = sansCommentaires(lire(COMPOSANT));
  assert.ok(!/localStorage\s*\./.test(code), "le composant touche localStorage directement");
  assert.ok(!/sessionStorage\s*\./.test(code), "le composant touche sessionStorage directement");
});

test("B4 aucun mot evoquant un secret n'apparait dans ce qui est stocke", () => {
  const code = sansCommentaires(lire(STOCKAGE));
  for (const interdit of ["password", "motDePasse", "pin", "token", "jwt"]) {
    assert.ok(
      !new RegExp(`\\b${interdit}\\b`, "i").test(code),
      `le module de stockage mentionne « ${interdit} » hors commentaire`,
    );
  }
});

// ----------------------------------------- C. LE PIEGE D'EMPILEMENT

test("C1 les panneaux passent par un PORTAIL vers document.body", () => {
  const code = sansCommentaires(lire(COMPOSANT));
  assert.match(code, /createPortal\(/, "les panneaux ne sont pas portalises");
  // La CIBLE doit etre document.body, pas un noeud de l'application. Chercher la simple
  // presence de « document.body » ne suffit pas : une cible comme
  // `document.getElementById('root') || document.body` contient ce texte tout en visant un
  // noeud interne — et un noeud interne peut, lui, se retrouver un jour sous un ancetre
  // transforme, ce qui ramenerait exactement le defaut que le portail corrige. Cette
  // mutation-la avait survecu au premier passage ; d'ou la forme exacte exigee ici.
  assert.match(
    code,
    /\n\s*document\.body,\n\s*\);/,
    "la cible du portail n'est plus document.body seul (ou l'appel a ete reformate : verifier la cible)",
  );
  assert.ok(
    !/createPortal\([\s\S]*?getElementById/.test(code),
    "le portail vise un noeud de l'application au lieu de document.body",
  );
});

test("C2 les deux ancetres qui PIEGERAIENT un fixed sont toujours la", () => {
  // Si l'un disparaissait, le portail cesserait d'etre indispensable — mais tant qu'ils
  // sont la, le retirer casserait l'affichage. Ce releve dit POURQUOI le portail existe.
  const l = lire(LAUNCHER);
  assert.match(l, /backdropFilter: 'blur\(6px\)'/, "le backdrop-filter de la colonne a disparu");
  assert.match(l, /transform: monte \? 'translateY\(0\)'/, "le transform d'apparition a disparu");
});

test("C3 la rangee est posee HORS du label du champ email", () => {
  // Ce label n'a pas de htmlFor : il associe son premier champ imbrique, donc un clic a
  // l'interieur peut ramener le focus dans l'email. Un bouton « Gerer » qui deplace le
  // curseur en plus d'ouvrir son panneau ne se remarque qu'a l'usage.
  const l = lire(LAUNCHER);
  const fermetureLabel = l.indexOf("</label>");
  const montage = l.indexOf("<TalvexDesktopQuickEmails");
  assert.ok(fermetureLabel > 0 && montage > 0, "le montage ou le label est introuvable");
  assert.ok(montage > fermetureLabel, "la rangee est repassee a l'interieur du <label>");
});

// ----------------------------------------- D. LA GARDE DU THEME, ET LE MONTAGE

test("D1 ni le composant ni les deux modules n'appellent useTheme", () => {
  // G2ter le verifie deja en suivant la chaine ; ce releve-ci nomme les fichiers, pour que
  // l'echec dise lequel a fauté.
  for (const f of [COMPOSANT, STOCKAGE, PALETTE]) {
    assert.ok(!/\buseTheme\s*\(/.test(sansCommentaires(lire(f))), `${f} appelle useTheme`);
  }
});

test("D2 le launcher monte bien la rangee, avec l'email et le retour de selection", () => {
  const l = sansCommentaires(lire(LAUNCHER));
  assert.match(
    l,
    /<TalvexDesktopQuickEmails email=\{email\} onSelect=\{setEmail\} \/>/,
    "le montage a change de forme : verifier que la selection remplit toujours le champ",
  );
});

test("D3 le launcher et les panneaux lisent la MEME palette", () => {
  // Deux jeux de constantes auraient diverge a la premiere retouche, et un panneau d'une
  // autre couleur que la fenetre qui l'ouvre se voit immediatement.
  assert.match(lire(LAUNCHER), /from '\.\.\/lib\/talvexDesktopPalette'/);
  assert.match(lire(COMPOSANT), /from '\.\.\/lib\/talvexDesktopPalette'/);
});

// ----------------------------------------- E. LES LIBELLES, PARTAGES AVEC LE WEB

test("E1 les trois libelles sont ceux de la connexion web, au caractere pres", () => {
  const textesWeb = lire("src/pages/superadmin/views/site-builder/templates/modaleTextes.ts");
  const composant = lire(COMPOSANT);
  for (const [cle, valeur] of [
    ["rapides", "Rapides"],
    ["enregistrer", "Enregistrer"],
    ["gerer", "Gerer"],
    ["titreRapides", "Emails rapides"],
    ["titreGerer", "Gerer les emails"],
  ] as const) {
    assert.ok(textesWeb.includes(`${cle}: '${valeur}'`), `le web n'ecrit plus ${cle}: '${valeur}'`);
    assert.ok(composant.includes(`${cle}: '${valeur}'`), `le launcher n'ecrit plus ${cle}: '${valeur}'`);
  }
});

test("E2 Echap est ecoute en phase de CAPTURE, et sa propagation arretee", () => {
  // Sans cela, la touche traverse jusqu'a ce qui ecoute en dessous : le panneau se ferme
  // AVEC la fenetre de connexion, et l'adresse comme les six chiffres deja saisis sont
  // perdus. C'est le defaut que TalvexQuickEmailShell.tsx:26-37 documente pour le web.
  const code = sansCommentaires(lire(COMPOSANT));
  assert.match(code, /addEventListener\('keydown', auClavier, true\)/, "Echap n'est pas ecoute en capture");
  assert.match(code, /e\.stopPropagation\(\)/, "Echap n'arrete pas sa propagation");
  assert.match(code, /removeEventListener\('keydown', auClavier, true\)/, "l'ecouteur n'est pas retire");
});

test("E3 chaque panneau relit le STOCKAGE a son ouverture, pas l'etat React", () => {
  // Une autre fenetre du launcher, ou l'autre panneau, a pu modifier la liste entre-temps.
  const code = sansCommentaires(lire(COMPOSANT));
  const ouvertures = code.match(/relire\(\);\s*set(Picker|Gestion)\(true\)/g) ?? [];
  assert.equal(ouvertures.length, 2, "un panneau s'ouvre sans relire le stockage");
});
