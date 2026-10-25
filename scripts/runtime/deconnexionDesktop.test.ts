// La deconnexion : LOCALE sur le bureau, GLOBALE sur le web et la PWA.
//   node --import tsx --test scripts/runtime/deconnexionDesktop.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { porteeDeconnexion } from "../../src/lib/porteeDeconnexion";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * But, tranche par David le 25/10/2026 : se deconnecter du logiciel Windows ne doit pas
 * fermer la session du telephone. Donc portee LOCALE en desktop, et GLOBALE ailleurs.
 *
 * TROIS ACCIDENTS SONT POSSIBLES, ET AUCUN NE SE VOIT A LA RELECTURE :
 *
 *  1. NE CORRIGER QU'UN SEUL CHEMIN. Le depot comptait HUIT appels a signOut, dont CINQ
 *     atteignables depuis l'application installee. Les trois ecrans d'etat sont rendus
 *     AVANT la branche estDesktop() d'App.tsx : un utilisateur bloque qui clique
 *     « Deconnexion » emprunte donc un de ces chemins, dans la fenetre Tauri. Corriger le
 *     seul handleLogout aurait laisse quatre portes ouvertes, et la promesse faite a David
 *     aurait ete fausse sans que rien ne le signale.
 *
 *  2. ELARGIR LA PORTEE AU WEB. Rendre la deconnexion locale sur le web ou la PWA
 *     laisserait des sessions actives ailleurs apres un logout volontaire : c'est une
 *     regression de SECURITE, et elle est silencieuse.
 *
 *  3. PARIER SUR UNE CASCADE DE DEFAUTS. Hors du bureau, la portee doit valoir undefined
 *     et non `{}`. Precision apres verification — un `{}` donnerait AUJOURD'HUI la meme
 *     requete, car `scope` y vaudrait undefined puis serait rattrape par le defaut de
 *     `admin.signOut(jwt, scope = SIGN_OUT_SCOPES[0])`, soit 'global'. Mais cela ne tient
 *     que par DEUX defauts en cascade dans une dependance : qu'auth-js valide strictement
 *     le scope recu, ou reordonne SIGN_OUT_SCOPES, et `{}` divergerait en silence. La
 *     section A fige donc la forme qui exprime l'intention.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// Les cinq chemins atteignables depuis l'application installee.
const CHEMINS_BUREAU = [
  "src/App.tsx",
  "src/app/AppStatusScreens.tsx",
  "src/app/AppUnauthorizedPage.tsx",
  "src/pages/company-super-admin/CompanySuperAdminDashboard.tsx",
];

// Les trois du FLUX DE CONNEXION, propres au web et a la PWA, volontairement intacts.
const CHEMINS_CONNEXION_WEB = [
  "src/components/LoginModal.tsx",
  "src/components/PwaLoginPage.tsx",
  "src/pages/superadmin/views/site-builder/templates/TalvexLoginModal.tsx",
];

// ------------------------------------------------ A. LA PORTEE, PAR LE COMPORTEMENT

test("A1 le bureau demande une portee LOCALE", () => {
  assert.deepEqual(porteeDeconnexion(true), { scope: "local" });
});

test("A2 le web et la PWA ne demandent RIEN, pour garder le defaut global", () => {
  assert.equal(porteeDeconnexion(false), undefined);
});

test("A3 hors bureau, ce n'est PAS un objet vide", () => {
  // Voir l'accident n3 en tete : un objet vide donnerait aujourd'hui la meme requete, par
  // une cascade de deux defauts d'auth-js. On ne parie pas la-dessus — la portee du web
  // s'exprime par une absence d'argument, pas par un objet a remplir.
  const p = porteeDeconnexion(false);
  assert.equal(typeof p, "undefined", `porteeDeconnexion(false) rend ${JSON.stringify(p)} au lieu de undefined`);
});

test("A4 la portee locale ne vaut jamais 'global' ni 'others'", () => {
  // 'others' deconnecterait les AUTRES appareils en gardant celui-ci : l'exact inverse du
  // but. auth-js precise d'ailleurs qu'aucun evenement SIGNED_OUT n'est emis dans ce cas.
  const p = porteeDeconnexion(true);
  assert.ok(p && p.scope === "local", `portee inattendue : ${JSON.stringify(p)}`);
});

test("A5 l'appel reel branche bien la portee sur le runtime", () => {
  const code = sansCommentaires(lire("src/lib/deconnexion.ts"));
  assert.match(
    code,
    /signOut\(porteeDeconnexion\(estDesktop\(\)\)\)/,
    "deconnecterSupabase ne relie plus la portee au runtime",
  );
});

// ------------------------------------------------ B. LA COUVERTURE DES CINQ CHEMINS

test("B1 aucun chemin de bureau n'appelle plus signOut en direct", () => {
  const fautifs = CHEMINS_BUREAU.filter((f) =>
    /supabase\.auth\.signOut\s*\(/.test(sansCommentaires(lire(f))),
  );
  assert.deepEqual(
    fautifs,
    [],
    `ces chemins de bureau contournent la portee locale :\n  ${fautifs.join("\n  ")}`,
  );
});

test("B2 les cinq chemins passent par le point unique", () => {
  const manquants = CHEMINS_BUREAU.filter((f) => !lire(f).includes("deconnecterSupabase"));
  assert.deepEqual(manquants, [], `ces chemins n'utilisent pas la deconnexion partagee :\n  ${manquants.join("\n  ")}`);
});

test("B3 AppStatusScreens couvre bien SES DEUX boutons", () => {
  // Ce fichier porte deux ecrans distincts — acces desactive (App.tsx:185) et domaine
  // bloque (App.tsx:184). N'en corriger qu'un laisserait l'autre global.
  const code = sansCommentaires(lire("src/app/AppStatusScreens.tsx"));
  const n = code.split("deconnecterSupabase()").length - 1;
  assert.equal(n, 2, `${n} bouton(s) couvert(s) au lieu de 2 dans AppStatusScreens`);
});

test("B4 le web et la PWA gardent leur signOut de flux de connexion", () => {
  // Ces trois-la referment une session refusee sur un domaine. Le launcher de bureau ne
  // monte aucun des trois : en desktop, ces lignes ne sont jamais atteintes. Les toucher
  // serait modifier le web pour rien — ce que David a explicitement exclu.
  const perdus = CHEMINS_CONNEXION_WEB.filter((f) =>
    !/supabase\.auth\.signOut\s*\(/.test(sansCommentaires(lire(f))),
  );
  assert.deepEqual(perdus, [], `le flux de connexion web a ete modifie ici :\n  ${perdus.join("\n  ")}`);
});

test("B5 le decompte des signOut directs dans src/ est exactement celui attendu", () => {
  // QUATRE, et seulement quatre : les trois du flux de connexion web, plus le point de
  // passage lui-meme — c'est lui qui appelle signOut pour tout le monde, sa presence dans
  // cette liste est donc la preuve qu'il existe encore. S'il en apparait un cinquieme, il
  // faut decider s'il est atteignable depuis le bureau, et le brancher si oui.
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(e.name)) fichiers.push(p);
    }
  };
  parcourir("src");
  const avecSignOut = fichiers
    .filter((f) => /supabase\.auth\.signOut\s*\(/.test(sansCommentaires(lire(f))))
    .sort();
  assert.deepEqual(
    avecSignOut,
    [...CHEMINS_CONNEXION_WEB, "src/lib/deconnexion.ts"].sort(),
    "la liste des fichiers appelant signOut en direct a change : verifier si le nouveau est atteignable en desktop",
  );
});

// ------------------------------------------------ C. CE QUI NE DOIT PAS AVOIR BOUGE

test("C1 handleLogout garde son try/catch et sa purge de sessionStorage", () => {
  // La correction ne devait changer QUE la portee. Avaler les erreurs autrement, ou
  // cesser de purger le jeton local, serait un changement de comportement non demande.
  const code = lire("src/App.tsx");
  assert.match(code, /try \{ await deconnecterSupabase\(\); \} catch \{/, "le try/catch de handleLogout a change");
  assert.match(code, /key\.startsWith\('sb-'\) && key\.endsWith\('-auth-token'\)/, "la purge du jeton local a disparu");
});

test("C2 les boutons des ecrans d'etat enchainent toujours sur onClear()", () => {
  for (const f of ["src/app/AppStatusScreens.tsx", "src/app/AppUnauthorizedPage.tsx"]) {
    assert.match(
      lire(f),
      /await deconnecterSupabase\(\); onClear\(\);/,
      `${f} n'appelle plus onClear apres la deconnexion`,
    );
  }
});

test("C3 le tableau de bord Societe recharge toujours apres deconnexion", () => {
  const code = lire("src/pages/company-super-admin/CompanySuperAdminDashboard.tsx");
  assert.match(
    code,
    /await deconnecterSupabase\(\);\s*\n\s*window\.location\.reload\(\);/,
    "le rechargement apres deconnexion a disparu",
  );
});

test("C4 le telephone virtuel sort toujours AVANT toute deconnexion", () => {
  // handleLogout commence par un postMessage et un return quand l'application tourne dans
  // le telephone simule : la deconnexion y est deleguee au parent, et ne doit pas se faire
  // en plus ici. Un signOut ajoute avant ce return fermerait la session de l'hote.
  const code = sansCommentaires(lire("src/App.tsx"));
  const debut = code.indexOf("const handleLogout");
  const extrait = code.slice(debut, debut + 420);
  const posPhone = extrait.indexOf("IS_VIRTUAL_PHONE");
  const posSortie = extrait.indexOf("return;");
  const posDeco = extrait.indexOf("deconnecterSupabase");
  assert.ok(posPhone >= 0 && posSortie > posPhone, "la sortie du telephone virtuel a disparu de handleLogout");
  assert.ok(posDeco > posSortie, "la deconnexion passe desormais AVANT la sortie du telephone virtuel");
});
