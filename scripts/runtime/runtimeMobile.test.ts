// Le runtime mobile : quatre contextes, quatre comportements, et aucun melange.
//   node --import tsx --test scripts/runtime/runtimeMobile.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runtimeDepuisSignaux, type SignauxRuntime } from "../../src/lib/runtime";
import { porteeDeconnexion } from "../../src/lib/porteeDeconnexion";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * L'audit du 25/10/2026 a trouve que le point de rupture d'une application Capacitor
 * n'etait PAS le stockage, mais `display-mode: standalone`. Les deux issues etaient
 * mauvaises, et aucune ne se voit a la relecture :
 *
 *   - s'il vaut VRAI en WebView, main.tsx purge les jetons `sb-*-auth-token` a chaque
 *     lancement : l'utilisateur est deconnecte a chaque ouverture, par le code lui-meme ;
 *   - s'il vaut FAUX, App.tsx rend la LANDING WEB a un utilisateur deconnecte, et le
 *     tableau de bord PC a un utilisateur connecte, au lieu de la coquille mobile.
 *
 * Trois autres pieges, tous mesures :
 *   - estDesktop() devient FAUX en mobile la ou il PROTEGEAIT : la deconnexion repasserait
 *     en portee globale, et fermer sa session sur le telephone fermerait celle de Windows ;
 *   - le service worker s'enregistrerait (le runtime retombe sur 'web'), et une WebView
 *     Capacitor le SERT reellement — on ne peut donc pas compter sur son echec ;
 *   - `window.Capacitor` existe aussi sur le WEB des que @capacitor/core est dans le
 *     paquet : detecter le mobile par sa presence classerait le site en mobile.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const AUCUN: SignauxRuntime = {
  tauri: false, afficheAutonome: false, standaloneApple: false, capacitorNatif: false,
};

// ------------------------------------------------ A. LES QUATRE CONTEXTES

test("A1 web -> web", () => {
  assert.equal(runtimeDepuisSignaux(AUCUN), "web");
});

test("A2 PWA -> pwa", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, afficheAutonome: true }), "pwa");
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, standaloneApple: true }), "pwa");
});

test("A3 Tauri -> desktop", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, tauri: true }), "desktop");
});

test("A4 Capacitor natif -> mobile", () => {
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, capacitorNatif: true }), "mobile");
});

test("A5 LA PRIORITE EXACTE : desktop > mobile > pwa > web", () => {
  // L'ordre n'est pas cosmetique. Une application Capacitor peut repondre vrai a
  // display-mode : testee apres la PWA, elle serait classee « pwa », et c'est tout le
  // defaut que ce chantier corrige.
  assert.equal(runtimeDepuisSignaux({ tauri: true, capacitorNatif: true, afficheAutonome: true, standaloneApple: true }), "desktop");
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, capacitorNatif: true, afficheAutonome: true }), "mobile");
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, capacitorNatif: true, standaloneApple: true }), "mobile");
  assert.equal(runtimeDepuisSignaux({ ...AUCUN, afficheAutonome: true }), "pwa");
});

test("A6 une application Capacitor n'est JAMAIS prise pour une PWA", () => {
  // Le releve central de ce fichier. Quelle que soit la reponse de display-mode, le
  // runtime doit dire « mobile ».
  for (const autonome of [true, false]) {
    for (const apple of [true, false]) {
      assert.equal(
        runtimeDepuisSignaux({ tauri: false, capacitorNatif: true, afficheAutonome: autonome, standaloneApple: apple }),
        "mobile",
        `capacitorNatif avec afficheAutonome=${autonome} standaloneApple=${apple}`,
      );
    }
  }
});

// ------------------------------------------------ B. LA DETECTION NE SE FIE PAS A LA PRESENCE

test("B1 le mobile se detecte par un APPEL, pas par la presence de window.Capacitor", () => {
  // @capacitor/core pose window.Capacitor sur le WEB aussi, des qu'il entre dans le
  // paquet — et il y entre desormais, puisque le stockage de session l'importe. Tester sa
  // presence classerait donc le site ordinaire en « mobile ».
  const code = sansCommentaires(lire("src/lib/runtime.ts"));
  assert.match(code, /isNativePlatform\s*===\s*'function'/, "la detection ne verifie plus que c'est une fonction");
  assert.match(code, /cap\.isNativePlatform\(\)\s*===\s*true/, "la detection n'APPELLE plus isNativePlatform");
  assert.ok(
    !/fenetre\.Capacitor\s*!==\s*undefined|'Capacitor'\s+in\s+/.test(code),
    "la detection se fie a la PRESENCE de window.Capacitor",
  );
});

test("B2 runtime.ts n'importe AUCUN paquet Capacitor", () => {
  // Ce module doit rester sans dependance : les releves l'importent sous Node, et il est
  // lu avant tout. Capacitor pose son marqueur de lui-meme, comme Tauri.
  const code = lire("src/lib/runtime.ts");
  assert.ok(!/from\s+['"]@capacitor/.test(code), "runtime.ts importe un paquet Capacitor");
});

// ------------------------------------------------ C. LE SERVICE WORKER

test("C1 aucune application installee n'enregistre de service worker", () => {
  const code = sansCommentaires(lire("src/main.tsx"));
  assert.match(code, /if \(estApplicationInstallee\(\)\) \{/, "la garde ne couvre plus les deux runtimes installes");
  assert.ok(!/if \(estDesktop\(\)\) \{/.test(code), "la garde est revenue au seul bureau : le mobile enregistrerait");
});

test("C2 le WEB et la PWA enregistrent TOUJOURS le service worker", () => {
  // Le releve qui compte le plus ici : reparer le mobile en privant le web de son
  // fonctionnement hors connexion serait une regression muette.
  const code = sansCommentaires(lire("src/main.tsx"));
  assert.match(
    code,
    /\} else if \('serviceWorker' in navigator\) \{\s*navigator\.serviceWorker\.register\('\/service-worker\.js'\)/,
    "la branche web/PWA n'enregistre plus le service worker",
  );
});

// ------------------------------------------------ D. LA DECONNEXION

test("D1 logout mobile = LOCAL", () => {
  assert.deepEqual(porteeDeconnexion(true), { scope: "local" });
});

test("D2 le web garde la portee globale", () => {
  assert.equal(porteeDeconnexion(false), undefined);
});

test("D3 la portee est branchee sur LES DEUX runtimes installes", () => {
  // Avec estDesktop(), le mobile repasserait en portee globale : se deconnecter du
  // telephone fermerait la session Windows. C'est l'inverse exact de ce qui a ete valide.
  const code = sansCommentaires(lire("src/lib/deconnexion.ts"));
  assert.match(code, /porteeDeconnexion\(estApplicationInstallee\(\)\)/, "la portee n'est plus branchee sur les applications installees");
  assert.ok(!/porteeDeconnexion\(estDesktop\(\)\)/.test(code), "la portee est revenue au seul bureau");
});

// ------------------------------------------------ E. LE STOCKAGE DE SESSION

test("E1 le web et la PWA gardent sessionStorage, mot pour mot", () => {
  // Exigence de David : ne rien changer au comportement Web/PWA.
  const code = sansCommentaires(lire("src/lib/stockageSession.ts"));
  assert.match(code, /return estMobile\(\) \? adaptateurMobile : sessionStorage;/, "le choix du stockage a change de forme");
});

test("E2 le jeton mobile n'est range NI dans localStorage NI dans sessionStorage", () => {
  // Trois boucles de purge existent deja (main.tsx x2, App.tsx) et effacent les cles
  // sb-*-auth-token de ces deux magasins. Y ranger le jeton mobile le placerait sous une
  // boucle qui l'efface — et la documentation de Preferences avertit en plus que les
  // systemes mobiles peuvent vider localStorage sans prevenir.
  const code = sansCommentaires(lire("src/lib/stockageSession.ts"));
  const adaptateur = code.slice(code.indexOf("const adaptateurMobile"), code.indexOf("export function stockageSession"));
  assert.ok(!/localStorage/.test(adaptateur), "l'adaptateur mobile ecrit dans localStorage");
  assert.ok(!/sessionStorage/.test(adaptateur), "l'adaptateur mobile ecrit dans sessionStorage");
  assert.match(adaptateur, /api\.setItem\(cle, valeur\)/, "l'adaptateur n'ecrit plus dans le coffre");
  // Et le coffre doit etre le SEUL magasin mobile : plus de Preferences, qui ecrivait en
  // clair dans shared_prefs et partait dans les sauvegardes Google Drive.
  assert.ok(!/Preferences/.test(code), "le stockage mobile utilise encore @capacitor/preferences");
});

test("E3 setItem NE REJETTE JAMAIS, et garde une copie en memoire", () => {
  // auth-js n'a AUCUN cache interne : un setItem qui echoue perd le jeton, au pire moment
  // — l'ancien jeton de rafraichissement vient d'etre consomme par le serveur. La memoire
  // est donc un filet, pas une optimisation.
  const code = sansCommentaires(lire("src/lib/stockageSession.ts"));
  const corps = code.slice(code.indexOf("async setItem"), code.indexOf("async removeItem"));
  assert.match(corps, /memoire\.set\(cle, valeur\);/, "setItem ne garde plus de copie en memoire");
  assert.match(corps, /catch\s*\{/, "setItem peut desormais rejeter");
  const avant = corps.indexOf("memoire.set");
  const apres = corps.indexOf("api.setItem");
  assert.ok(avant >= 0 && apres > avant, "la memoire n'est plus ecrite AVANT le coffre");
  // Une ecriture ratee doit etre RETENUE, sinon le filet ne sait pas qu'il doit servir.
  assert.match(corps, /ecrituresEnEchec\.add\(cle\)/, "un echec d'ecriture n'est plus retenu");
  assert.match(corps, /ecrituresEnEchec\.delete\(cle\)/, "une ecriture reussie ne leve plus le drapeau");
});

test("E3bis LA PRECEDENCE DU FILET : la memoire prime sur un disque en retard", () => {
  // LE DEFAUT CORRIGE. La premiere version relisait le magasin et ECRASAIT la memoire avec
  // ce qu'elle y trouvait. Apres une ecriture ratee, elle rendait donc l'ANCIEN jeton et
  // detruisait le jeton frais : le filet ne protegeait pas, il nuisait. Avec Preferences
  // ce mode d'echec etait quasi inatteignable ; le coffre le rend ATTEIGNABLE — cle
  // invalidee apres changement de code PIN, materiel occupe, appareil verrouille.
  const code = sansCommentaires(lire("src/lib/stockageSession.ts"));
  const getItem = code.slice(code.indexOf("async getItem"), code.indexOf("async setItem"));
  assert.match(
    getItem,
    /if \(ecrituresEnEchec\.has\(cle\)\) return memoire\.get\(cle\) \?\? null;/,
    "getItem relit le coffre meme quand la derniere ecriture a echoue : il rendrait une valeur perimee",
  );
  // Et cette garde doit PRECEDER la lecture du coffre, sinon elle ne garde rien.
  const garde = getItem.indexOf("ecrituresEnEchec.has(cle)");
  const lecture = getItem.indexOf("api.getItem(cle)");
  assert.ok(garde >= 0 && lecture > garde, "la garde est posee APRES la lecture du coffre");
});

test("E3ter l'import du coffre est DYNAMIQUE, donc absent des paquets web", () => {
  // Le plugin embarque une implementation navigateur reservee au deboguage, qui ecrit en
  // clair dans localStorage. Un import statique la ferait entrer dans les paquets web,
  // PWA et Tauri, et son code de premier niveau s'y executerait — c'est exactement ce qui
  // s'est produit avec @capacitor/core, dont l'import statique a pose window.Capacitor
  // jusque dans le navigateur ordinaire. Ici, le coffre n'est meme pas telecharge.
  const code = sansCommentaires(lire("src/lib/stockageSession.ts"));
  assert.match(code, /import\('@aparajita\/capacitor-secure-storage'\)/, "l'import du coffre n'est plus dynamique");
  assert.ok(
    !/^import .*@aparajita\/capacitor-secure-storage/m.test(code),
    "le coffre est importe statiquement : son implementation web entrerait dans les paquets",
  );
});

test("E4 la session Supabase passe par ce choix, et par lui seul", () => {
  const code = sansCommentaires(lire("src/lib/supabase.ts"));
  assert.match(code, /storage: stockageSession\(\)/, "le client Supabase n'utilise plus le choix de stockage");
  assert.ok(!/storage: sessionStorage/.test(code), "le client force encore sessionStorage");
  // Meme authentification, memes comptes, memes roles : rien d'autre ne bouge.
  assert.match(code, /persistSession: true/, "persistSession a change");
  assert.match(code, /autoRefreshToken: true/, "autoRefreshToken a change");
});

// ------------------------------------------------ F. CE QUI NE DEVAIT PAS BOUGER

test("F1 Tauri Desktop reste inchange", () => {
  const r = sansCommentaires(lire("src/lib/runtime.ts"));
  assert.match(r, /if \(signaux\.tauri\) return 'desktop';/, "la detection du bureau a change");
  const app = sansCommentaires(lire("src/App.tsx"));
  assert.match(app, /if \(estDesktop\(\)\) \{/, "la branche du launcher de bureau a disparu");
  assert.match(app, /return <TalvexDesktopLauncher onLogin=\{handleLogin\} \/>;/, "le launcher n'est plus rendu");
  assert.match(app, /if \(!estDesktop\(\) &&/, "la garde qui empeche la coquille mobile sur PC a disparu");
});

test("F2 main.tsx ne purge PAS les jetons de l'application native", () => {
  // La PURGE des jetons au lancement est faite pour la PWA, dont la session ne doit pas
  // survivre a la fermeture. Sur mobile natif, le jeton vit dans le coffre et DOIT survivre :
  // appliquer la purge la-bas forcerait une reconnexion a chaque ouverture.
  const code = sansCommentaires(lire("src/main.tsx"));
  assert.match(
    code,
    /!estMobile\(\)\s*\n?\s*&& \(window\.matchMedia\('\(display-mode: standalone\)'\)\.matches/,
    "main.tsx purgerait les jetons de l'application native a chaque lancement",
  );
});

test("F2bis App.tsx REND la coquille telephone sur mobile natif", () => {
  /*
   * CE RELEVE EXISTE PARCE QUE SON PREDECESSEUR FIGEAIT UN DEFAUT.
   *
   * Il exigeait la meme soustraction `!estMobile()` dans les DEUX fichiers. Elle est juste
   * dans main.tsx, ou le signal commande la purge des jetons. Elle etait fausse dans
   * App.tsx, ou le meme signal commande le RENDU : en natif, estMobile() vaut vrai, donc le
   * drapeau valait toujours faux, donc ni <PwaMobileShell> ni <PwaLoginPage> n'etaient
   * jamais rendus. Sur un telephone, on recevait le tableau de bord concu pour un PC.
   *
   * Un releve peut verrouiller une faute aussi bien qu'une protection. Celui-ci verifie
   * desormais l'INTENTION — le mobile recoit la coquille telephone — et non la forme d'une
   * ligne.
   */
  const code = sansCommentaires(lire("src/App.tsx"));
  assert.match(
    code,
    /const IS_COQUILLE_TELEPHONE = estMobile\(\)\s*\n?\s*\|\|/,
    "App.tsx ne donne plus la coquille telephone au mobile natif",
  );
  assert.doesNotMatch(
    code,
    /IS_COQUILLE_TELEPHONE = !estMobile\(\)/,
    "la soustraction fautive est revenue : le mobile recevrait l'interface PC",
  );
  // Et les deux rendus qui en dependent doivent toujours exister.
  assert.match(code, /<PwaMobileShell/, "la coquille mobile n'est plus rendue");
  assert.match(code, /<PwaLoginPage/, "la page de connexion mobile n'est plus rendue");
});

test("F3 la purge des jetons de session epargne le mobile", () => {
  // Elle est gardee par IS_PWA, qui soustrait desormais le mobile. Sans cela, elle
  // s'executerait a chaque lancement de l'application Android.
  const code = sansCommentaires(lire("src/main.tsx"));
  assert.match(code, /if \(IS_PWA && !IS_SITE_PREVIEW && !IS_EMBEDDED\) \{/, "la garde de la purge a change");
});
