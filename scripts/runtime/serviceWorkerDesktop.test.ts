// Le service worker : actif sur le web et la PWA, ABSENT de l'application installee.
//   node --import tsx --test scripts/runtime/serviceWorkerDesktop.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Mesure du 25/10/2026 : en Tauri, la fenetre s'ouvrait BLANCHE apres chaque nouvelle
 * version. Le coupable n'est pas le worker lui-meme mais son cache : il sert un index.html
 * d'une version precedente, qui cite un chunk de script dont le nom a change au build
 * suivant. Le navigateur demande un fichier absent, aucun module ne s'execute, #root reste
 * vide. Aucune erreur visible, aucun releve rouge — c'est ce qui rend ce defaut dangereux.
 *
 * DEUX ACCIDENTS SONT POSSIBLES, ET TOUS DEUX INVISIBLES A LA RELECTURE :
 *
 *   1. CASSER LE WEB EN VOULANT REPARER LE BUREAU. Si la garde devenait un simple retrait
 *      de l'enregistrement, le web et la PWA perdraient leur fonctionnement hors connexion
 *      sans que rien ne le signale. La section A exige que la branche web soit TOUJOURS la.
 *
 *   2. OUBLIER LE SECOND ENREGISTREMENT. src/lib/pushNotifications.ts enregistre le MEME
 *      fichier, et usePushNotifications.ts:48 l'appelle des le montage de
 *      PushNotificationSettings — atteignable dans le CRM apres connexion, dans le menu
 *      profil de l'admin, du client et du company_super_admin. Sans garde la, le worker
 *      reviendrait en desktop a la premiere ouverture de ces reglages, et l'ecran blanc
 *      avec lui, des mois plus tard. La section B le ferme.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const MAIN = "src/main.tsx";
const PUSH = "src/lib/pushNotifications.ts";

// ------------------------------------- A. LE DEMARRAGE : BUREAU MUET, WEB INCHANGE

test("A1 l'enregistrement au demarrage est garde par le runtime", () => {
  const code = sansCommentaires(lire(MAIN));
  assert.match(code, /if \(estDesktop\(\)\) \{/, "la garde de runtime a disparu de main.tsx");
  assert.match(code, /from '\.\/lib\/runtime'/, "main.tsx n'importe plus le runtime");
});

test("A2 le WEB et la PWA enregistrent TOUJOURS le service worker", () => {
  // Le releve qui compte le plus de ce fichier. Reparer le bureau en privant le web de son
  // fonctionnement hors connexion serait une regression muette : rien ne la signalerait.
  const code = sansCommentaires(lire(MAIN));
  assert.match(
    code,
    /\} else if \('serviceWorker' in navigator\) \{\s*navigator\.serviceWorker\.register\('\/service-worker\.js'\)/,
    "la branche web/PWA n'enregistre plus le service worker",
  );
});

test("A3 le bureau desinscrit ce qui traine, et vide les caches", () => {
  // Un worker pose par une version anterieure reprendrait la main au demarrage suivant.
  const code = sansCommentaires(lire(MAIN));
  const bureau = code.slice(code.indexOf("if (estDesktop()) {"), code.indexOf("} else if"));
  assert.match(bureau, /getRegistrations\(\)/, "le bureau ne desinscrit pas les workers existants");
  assert.match(bureau, /\.unregister\(\)/, "le bureau n'appelle pas unregister");
  assert.match(bureau, /caches\.keys\(\)/, "le bureau ne vide pas les caches");
  assert.match(bureau, /caches\.delete\(/, "le bureau ne supprime aucun cache");
});

test("A4 le bureau ne recharge PAS la page tout seul", () => {
  // Un rechargement automatique au demarrage est un risque de boucle : si la condition qui
  // le declenche reste vraie apres le reload, l'application tourne en rond, et sur un
  // ecran blanc l'utilisateur n'a aucun moyen de l'arreter.
  const code = sansCommentaires(lire(MAIN));
  assert.ok(!/location\.reload\(/.test(code), "main.tsx recharge la page : risque de boucle");
});

test("A5 l'enregistrement n'a PAS ete simplement supprime", () => {
  // Une seule occurrence doit subsister : celle de la branche web. Zero voudrait dire que
  // le web a perdu son worker ; deux, qu'une branche a ete dupliquee par megarde.
  const code = sansCommentaires(lire(MAIN));
  const n = code.split("navigator.serviceWorker.register(").length - 1;
  assert.equal(n, 1, `main.tsx contient ${n} enregistrement(s) au lieu d'un seul (celui du web)`);
});

// ------------------------------------- B. LE SECOND ENREGISTREMENT, CELUI DES PUSH

test("B1 le support des notifications est declare indisponible en desktop", () => {
  const code = sansCommentaires(lire(PUSH));
  assert.match(
    code,
    /if \(estDesktop\(\)\) return \{ supported: false, needsPwa: false \};/,
    "getPushSupport ne ferme plus la porte en desktop",
  );
});

test("B2 l'enregistrement par les notifications est refuse en desktop", () => {
  const code = sansCommentaires(lire(PUSH));
  const fn = code.slice(code.indexOf("export async function registerServiceWorker"));
  const corps = fn.slice(0, fn.indexOf("export async function subscribeToPush"));
  assert.match(corps, /if \(estDesktop\(\)\) return null;/, "registerServiceWorker enregistre encore en desktop");
});

test("B3 la garde precede l'enregistrement, elle ne le suit pas", () => {
  // Une garde posee APRES le register ne garderait rien du tout.
  const code = sansCommentaires(lire(PUSH));
  const garde = code.indexOf("if (estDesktop()) return null;");
  const reg = code.indexOf("navigator.serviceWorker.register(");
  assert.ok(garde > 0 && reg > 0, "garde ou enregistrement introuvable");
  assert.ok(garde < reg, "la garde est placee apres l'enregistrement : elle ne protege rien");
});

test("B4 les fonctions qui attendent `ready` sont bien celles qui exigeaient la garde", () => {
  // navigator.serviceWorker.ready ne se resout JAMAIS sans worker enregistre. C'est la
  // raison pour laquelle refuser l'enregistrement ne suffisait pas : il fallait aussi
  // declarer le support indisponible, sinon ces appels resteraient pendants et l'etat
  // d'abonnement ne serait jamais connu. Elles sont DEUX — unsubscribeFromPush et
  // getActiveSubscription ; subscribeToPush, lui, traite deja le null par sw_unavailable.
  // Si ce nombre change, reverifier le raisonnement ci-dessus.
  const code = sansCommentaires(lire(PUSH));
  const n = code.split("navigator.serviceWorker.ready").length - 1;
  assert.equal(n, 2, `${n} attente(s) de ready au lieu de 2 : revoir la garde de getPushSupport`);
});

// ------------------------------------- C. CE QUI NE DOIT PAS AVOIR BOUGE

test("C1 le service worker lui-meme existe toujours : le web en depend", () => {
  assert.ok(existsSync("public/service-worker.js"), "public/service-worker.js a disparu");
});

test("C2 index.html n'enregistre aucun service worker de son cote", () => {
  // Si un enregistrement y apparaissait, il echapperait entierement a la garde : le script
  // en ligne d'index.html s'execute avant tout module, et ne passe par aucun runtime.
  const html = lire("index.html");
  assert.ok(
    !/serviceWorker\s*\.\s*register/.test(html),
    "index.html enregistre un service worker, hors de portee de la garde",
  );
});

test("C3 aucun TROISIEME enregistrement n'est apparu dans src/", () => {
  // Le balayage qui a trouve les deux premiers. S'il en sort un de plus un jour, il lui
  // faudra sa propre garde — ce releve est la pour qu'on le sache a ce moment-la.
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(e.name)) fichiers.push(p);
    }
  };
  parcourir("src");
  const coupables = fichiers.filter((f) =>
    /serviceWorker\s*\.\s*register\s*\(/.test(sansCommentaires(lire(f))),
  );
  assert.deepEqual(
    coupables.sort(),
    ["src/lib/pushNotifications.ts", "src/main.tsx"],
    "la liste des fichiers qui enregistrent un service worker a change : chacun doit etre garde",
  );
});
