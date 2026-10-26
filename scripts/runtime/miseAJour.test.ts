// L'application installee doit savoir qu'une version plus recente existe.
//   node --import tsx --test scripts/runtime/miseAJour.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { versionEstPlusRecente, ADRESSE_MANIFESTE } from "../../src/lib/miseAJour";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le 25/10/2026, la premiere version Android ne demarrait pas. Son porteur n'avait aucun
 * moyen d'apprendre qu'une correction existait : une application posee sur un appareil reste
 * figee a la version du jour ou on l'a installee, et rien ne la relie a ce qui est publie.
 * Il aurait fallu qu'il retourne de lui-meme sur la page de telechargement.
 *
 * DEUX PIEGES, et aucun des deux ne se voit a la relecture :
 *
 *   1. L'ADRESSE DU MANIFESTE DOIT ETRE ABSOLUE. Dans une WebView Capacitor, la page est
 *      servie depuis https://localhost : un fetch('/telechargements.json') lirait le fichier
 *      EMBARQUE DANS L'APPLICATION, c'est-a-dire l'etat du monde au moment de sa compilation.
 *      L'application se comparerait a elle-meme et ne trouverait jamais rien. Le symptome
 *      serait « la mise a jour ne s'annonce jamais » — indiscernable d'un reseau coupe.
 *
 *   2. LES VERSIONS SE COMPARENT NOMBRE PAR NOMBRE. Une comparaison de chaines dit que
 *      « 0.1.9 » est superieur a « 0.1.10 », parce que '9' vient apres '1'. Le defaut
 *      n'apparaitrait qu'a la dixieme version corrective, longtemps apres avoir ete ecrit.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// --------------------------------------------------- A. LA COMPARAISON DE VERSIONS

test("A1 une version plus recente est reconnue", () => {
  assert.equal(versionEstPlusRecente("0.1.1", "0.1.0"), true);
  assert.equal(versionEstPlusRecente("0.2.0", "0.1.9"), true);
  assert.equal(versionEstPlusRecente("1.0.0", "0.9.9"), true);
});

test("A2 la meme version, ou une plus ancienne, ne declenche rien", () => {
  assert.equal(versionEstPlusRecente("0.1.0", "0.1.0"), false);
  assert.equal(versionEstPlusRecente("0.1.0", "0.1.1"), false);
  assert.equal(versionEstPlusRecente("0.9.9", "1.0.0"), false);
});

test("A3 la comparaison est NUMERIQUE, pas alphabetique", () => {
  // Le piege : en comparaison de chaines, '9' > '1', donc « 0.1.9 » passerait pour plus
  // recent que « 0.1.10 ». On ne s'en apercevrait qu'a la dixieme correction.
  assert.equal(versionEstPlusRecente("0.1.10", "0.1.9"), true, "0.1.10 doit etre plus recent que 0.1.9");
  assert.equal(versionEstPlusRecente("0.1.9", "0.1.10"), false);
  assert.equal(versionEstPlusRecente("0.10.0", "0.9.0"), true);
  assert.equal(versionEstPlusRecente("2.0.0", "10.0.0"), false);
});

test("A4 un suffixe est ECARTE, pas seulement tolere", () => {
  assert.equal(versionEstPlusRecente("0.2.0-beta", "0.1.0"), true);
  assert.equal(versionEstPlusRecente("0.1.0", "0.2.0-beta"), false);

  /*
   * LE CAS QUI DISTINGUE « ecarter » de « tolerer », et qu'une passe de mutation a revele.
   *
   * parseInt('0-rc') rend deja 0 : on pourrait croire qu'il suffit de decouper sur les
   * points et de laisser parseInt faire le menage. C'est vrai pour « 0.2.0-beta », qui a
   * trois segments. Ce ne l'est plus pour « 0.1.0-rc.2 », qui en a QUATRE : le decoupage
   * brut donne [0, 1, 0, 2], et ce quatrieme nombre ferait passer une release candidate
   * pour plus recente que la version finale qu'elle precede.
   *
   * Sans ce cas, retirer le nettoyage ne faisait rougir aucun releve.
   */
  assert.equal(
    versionEstPlusRecente("0.1.0-rc.2", "0.1.0"),
    false,
    "une release candidate ne doit pas passer pour plus recente que la version finale",
  );
  assert.equal(versionEstPlusRecente("0.1.0", "0.1.0-rc.2"), false);
});

test("A5 des versions de longueurs differentes se comparent quand meme", () => {
  assert.equal(versionEstPlusRecente("0.2", "0.1.9"), true);
  assert.equal(versionEstPlusRecente("1", "0.9.9"), true);
  assert.equal(versionEstPlusRecente("0.1", "0.1.0"), false);
});

// ------------------------------------------------------ B. L'ADRESSE INTERROGEE

test("B1 le manifeste est lu sur le SITE, par une adresse absolue", () => {
  assert.match(
    ADRESSE_MANIFESTE,
    /^https:\/\/[^/]+\/telechargements\.json$/,
    "l'adresse n'est pas une URL absolue en https",
  );
  assert.doesNotMatch(ADRESSE_MANIFESTE, /localhost/, "l'adresse pointe vers l'hote local");
});

test("B2 aucun fetch relatif ne subsiste dans le module", () => {
  // Un fetch('/telechargements.json') lirait le fichier embarque dans l'application.
  const code = sansCommentaires(lire("src/lib/miseAJour.ts"));
  assert.doesNotMatch(
    code,
    /recuperer\(\s*['"`]\//,
    "un chemin relatif est interroge : l'application se comparerait a elle-meme",
  );
  assert.match(code, /recuperer\(ADRESSE_MANIFESTE/, "le module n'interroge plus l'adresse publique");
});

// --------------------------------------------- C. QUAND L'ON SE TAIT, ET POURQUOI

test("C1 rien n'est propose hors d'une application installee", () => {
  // Le site et la PWA se rechargent depuis le serveur : ils SONT la derniere version.
  const code = sansCommentaires(lire("src/lib/miseAJour.ts"));
  assert.match(
    code,
    /if \(!estApplicationInstallee\(\)\) return null;/,
    "le site ou la PWA se verraient proposer de se mettre a jour",
  );
});

test("C2 la meme regle que la page de telechargement, pas une seconde", () => {
  // Si l'entree n'est pas complete, la page affiche « Bientot disponible ». Le bandeau ne
  // doit pas, lui, proposer un lien : ce serait exactement le faux bouton qu'on refuse.
  const code = sansCommentaires(lire("src/lib/miseAJour.ts"));
  assert.match(code, /estTelechargeable\(entree\)/, "le bandeau n'applique plus la regle commune");
});

test("C3 une erreur reseau ne derange pas l'utilisateur", () => {
  const code = sansCommentaires(lire("src/lib/miseAJour.ts"));
  assert.match(code, /catch \{\s*return null;/, "un echec reseau remonterait jusqu'a l'interface");
});

// ------------------------------------------------------------ D. LE BANDEAU

test("D1 le bandeau n'utilise AUCUN theme", () => {
  /*
   * Il est monte au-dessus de branches qui n'ont pas de ThemeProvider — le launcher de
   * bureau en est une, et c'est delibere. Un useTheme ici leverait exactement comme il l'a
   * fait dans PwaLoginPage, et remplacerait toute l'application par un ecran d'erreur.
   */
  const code = sansCommentaires(lire("src/components/BandeauMiseAJour.tsx"));
  assert.doesNotMatch(code, /useTheme|useThemeTokens/, "le bandeau lit un theme : il levera hors provider");
});

test("D2 le bandeau est monte au plus haut niveau, hors page de telechargement", () => {
  const code = sansCommentaires(lire("src/main.tsx"));
  assert.match(code, /import BandeauMiseAJour from/, "le bandeau n'est plus importe");
  assert.match(code, /<BandeauMiseAJour \/>/, "le bandeau n'est plus monte");
  // Il doit etre dans la branche de l'application, pas a cote de TelechargerPage.
  const brancheApp = code.match(/<>\s*<App \/>([\s\S]*?)<\/>/);
  assert.ok(brancheApp, "le bandeau n'accompagne plus <App />");
  assert.match(brancheApp[1], /<BandeauMiseAJour \/>/);
});

test("D3 un refus vaut pour une version, pas pour toujours", () => {
  // Memoriser « ne plus jamais proposer » condamnerait l'utilisateur a rester sur une
  // version cassee. On memorise LA version refusee, et la suivante se represente.
  const code = sansCommentaires(lire("src/components/BandeauMiseAJour.tsx"));
  assert.match(code, /setItem\(CLE_REFUS, version\)/, "le refus ne retient plus quelle version");
  assert.match(code, /getItem\(CLE_REFUS\) === version/, "le refus n'est plus compare a la version");
});

test("D4 le lien du bandeau vient du manifeste, jamais d'une adresse ecrite en dur", () => {
  const code = sansCommentaires(lire("src/components/BandeauMiseAJour.tsx"));
  assert.match(code, /href=\{maj\.url\}/, "le lien n'est plus celui du manifeste");
  assert.doesNotMatch(code, /href="https?:/, "une adresse est ecrite en dur dans le bandeau");
});

// ------------------------------------------------- E. LA VERSION GRAVEE AU BUILD

test("E1 la version est injectee depuis la source unique", () => {
  const vite = sansCommentaires(lire("vite.config.ts"));
  assert.match(vite, /__VERSION_TALVEX__/, "la version n'est plus gravee dans le paquet");
  assert.match(
    vite,
    /tauri\.conf\.json/,
    "la version ne vient plus de src-tauri/tauri.conf.json : il y aurait deux sources",
  );
});

test("E2 TypeScript connait cette constante", () => {
  assert.match(
    lire("src/vite-env.d.ts"),
    /declare const __VERSION_TALVEX__: string;/,
    "la declaration a disparu : le typecheck echouerait",
  );
});
