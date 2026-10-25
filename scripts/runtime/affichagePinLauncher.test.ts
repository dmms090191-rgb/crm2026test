// L'affichage du code a six chiffres dans le launcher de bureau.
//   node --import tsx --test scripts/runtime/affichagePinLauncher.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le 25 octobre 2026, David a signale un oeil mal place dans la 6e case du code, qui ne
 * revelait qu'un chiffre. CE N'ETAIT PAS NOTRE CODE : WebView2 injecte de lui-meme un
 * revelateur dans TOUT champ `type="password"` (le pseudo-element ::-ms-reveal). Il
 * appartient a son champ, donc il s'affiche DANS la case et ne devoile que celle-ci.
 *
 * Deux conditions sont donc necessaires, et aucune ne se voit a la relecture :
 *
 *   1. NEUTRALISER LE REVELATEUR NATIF. Sans la regle CSS, il revient — et il reviendrait
 *      silencieusement, puisque rien dans le code applicatif ne le mentionne.
 *
 *   2. UN SEUL ETAT POUR LES SIX CASES. Un etat par case reproduirait exactement le defaut
 *      d'origine : un chiffre revele, cinq masques.
 *
 * Et une exigence de David : l'oeil ne doit appartenir a AUCUNE case. Il est donc pose
 * apres le groupe des six, pas a l'interieur.
 */

const LAUNCHER = "src/components/TalvexDesktopLauncher.tsx";
const lire = () => readFileSync(LAUNCHER, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ------------------------------------- A. LE REVELATEUR NATIF EST BIEN NEUTRALISE

test("A1 ::-ms-reveal et ::-ms-clear sont masques", () => {
  const code = lire();
  assert.match(code, /\.tvx-pin::-ms-reveal/, "la neutralisation de ::-ms-reveal a disparu");
  assert.match(code, /\.tvx-pin::-ms-clear/, "la neutralisation de ::-ms-clear a disparu");
  assert.match(code, /display: none !important/, "la regle ne masque plus rien");
});

test("A2 les six champs portent la classe visee par cette regle", () => {
  // La regle ne sert a rien si les champs ne la portent pas. C'est le genre d'oubli qui
  // laisse l'oeil natif revenir sans qu'aucun releve ne s'en apercoive.
  const code = sansCommentaires(lire());
  assert.match(code, /className="tvx-champ tvx-pin"/, "les cases du code ne portent plus la classe tvx-pin");
});

// ------------------------------------- B. UN SEUL ETAT, POUR LES SIX CASES

test("B1 l'affichage est commande par un etat UNIQUE", () => {
  const code = sansCommentaires(lire());
  assert.match(code, /const \[codeVisible, setCodeVisible\] = useState\(false\)/, "l'etat d'affichage a change de forme");
  // Masque par defaut : le code ne doit pas s'afficher sans geste explicite.
  assert.ok(!/useState\(true\)[^)]*codeVisible/.test(code), "le code serait visible par defaut");
});

test("B2 les six cases lisent CE MEME etat, et aucune n'a le sien", () => {
  const code = sansCommentaires(lire());
  assert.match(
    code,
    /type=\{codeVisible \? 'text' : 'password'\}/,
    "le type des cases n'est plus commande par l'etat unique",
  );
  // Une seule declaration de type dans la boucle : les six cases sont rendues par un map,
  // donc une occurrence couvre bien les six. S'il y en avait plusieurs, c'est qu'une case
  // aurait ete sortie de la boucle — le defaut d'origine.
  const n = code.split("type={codeVisible ?").length - 1;
  assert.equal(n, 1, `${n} declarations de type au lieu d'une seule : une case a ete sortie de la boucle`);
});

test("B3 les six cases sont bien rendues par une seule boucle", () => {
  const code = sansCommentaires(lire());
  assert.match(code, /\{digits\.map\(\(d, i\) => \(/, "les six cases ne sont plus rendues par un map");
});

// ------------------------------------- C. L'OEIL N'APPARTIENT A AUCUNE CASE

test("C1 l'oeil est pose APRES le groupe des six cases", () => {
  // Exigence explicite de David. Un bouton place a l'interieur du groupe reprendrait la
  // place d'une case, ce qui etait precisement le defaut constate.
  const code = lire();
  const finBoucle = code.indexOf("))}");
  const oeil = code.indexOf("aria-label={codeVisible ? 'Masquer le code'");
  assert.ok(finBoucle > 0 && oeil > 0, "boucle ou bouton introuvable");
  assert.ok(oeil > finBoucle, "le bouton oeil est repasse a l'interieur du groupe des cases");
});

test("C2 l'oeil ne soumet pas le formulaire", () => {
  // Sans type="button", un bouton declenche la soumission par defaut : cliquer sur l'oeil
  // tenterait une connexion avec un code incomplet.
  const code = lire();
  const bloc = code.slice(code.indexOf("onClick={() => setCodeVisible"));
  const avant = code.slice(0, code.indexOf("onClick={() => setCodeVisible"));
  assert.match(avant.slice(-220), /type="button"/, "le bouton oeil n'est pas type=\"button\"");
  assert.ok(bloc.length > 0, "bouton introuvable");
});

test("C3 l'oeil garde un espacement propre avec la derniere case", () => {
  const code = sansCommentaires(lire());
  assert.match(
    code,
    /display: 'flex', alignItems: 'center', gap: 12, marginTop: 13/,
    "l'espacement entre les cases et l'oeil a change",
  );
});

// ------------------------------------- D. CE QUI NE DEVAIT PAS BOUGER

test("D1 le pave numerique et la longueur d'une case sont conserves", () => {
  const code = sansCommentaires(lire());
  assert.match(code, /inputMode="numeric"/, "inputMode numeric a disparu");
  assert.match(code, /maxLength=\{1\}/, "maxLength=1 a disparu : la navigation automatique en depend");
});

test("D2 la navigation automatique entre les cases est intacte", () => {
  // On exige le BRANCHEMENT sur les champs, pas la simple presence du nom : les trois
  // fonctions restent citees par la destructuration de usePinInput meme si plus aucun
  // champ ne les appelle. Une premiere version de ce releve s'y est laissee prendre —
  // retirer le onKeyDown des cases ne la faisait pas rougir.
  const code = sansCommentaires(lire());
  for (const branchement of [
    "onChange={(e) => handlePinInput(i, e.target.value)}",
    "onKeyDown={(e) => handlePinKeyDown(i, e)}",
    "onFocus={() => handlePinFocus(i)}",
  ]) {
    assert.ok(
      code.includes(branchement),
      `les cases du code ne branchent plus « ${branchement} » : la navigation automatique serait cassee`,
    );
  }
});

test("D3 l'authentification n'a pas bouge", () => {
  const code = sansCommentaires(lire());
  assert.match(code, /supabase\.auth\.signInWithPassword\(\{ email, password: code \}\)/, "l'appel d'authentification a change");
  assert.ok(!/updateUser\s*\(/.test(code), "le launcher ecrit desormais dans user_metadata");
  assert.equal(code.split("signInWithPassword").length - 1, 1, "il y a plus d'un appel d'authentification");
});

test("D4 aucun stockage nouveau n'est apparu pour l'affichage du code", () => {
  // L'etat d'affichage est volatil, et doit le rester : persister « code visible » ferait
  // rouvrir le launcher avec les chiffres en clair a l'ecran.
  const code = sansCommentaires(lire());
  const cles = code.match(/localStorage\.(get|set|remove)Item\([^)]*\)/g) ?? [];
  for (const c of cles) {
    assert.ok(
      c.includes("LAST_EMAIL_KEY"),
      `une cle de stockage inattendue est apparue dans le launcher : ${c}`,
    );
  }
});
