// Le reessai reserve au transport, et la distinction qui le rend possible (module pur).
//   node --test scripts/crm-immo/accesTransport.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  demanderAcces,
  estErreurDeTransport,
  decrireErreur,
  peutOuvrirCrmImmo,
  accesRefuse,
  RECUL_AVANT_REESSAI_MS,
  type ReponseBrute,
} from "../../src/lib/crmImmoAccess.ts";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le 26/10/2026, un porteur voyait « CRM Immo n'a pas pu etre verifie » sur le site, dans
 * le navigateur de son telephone. Les journaux ont montre que la requete ARRIVAIT, qu'elle
 * REUSSISSAIT, et qu'elle rendait meme `true` : HTTP 200, corps de 4 octets. Elle mettait
 * 23 038 ms a le faire. Le navigateur renoncait avant, postgrest-js fabriquait un objet
 * error, et la Porte le lisait comme un refus de la base.
 *
 * TROIS PIEGES, et aucun ne se voit a la relecture :
 *
 *   1. UNE PANNE DE RESEAU A LA MEME FORME QU'UN REFUS. postgrest-js ne rejette pas sa
 *      promesse : il attrape la panne de fetch et rend un objet error ordinaire. Le seul
 *      discriminant structurel est le CODE : PostgREST et PostgreSQL nomment toujours leur
 *      erreur ('42501', 'PGRST301', '22P02'), une TypeError de fetch n'a pas de `.code`.
 *      Se brancher sur le MESSAGE serait se brancher sur la langue du telephone.
 *
 *   2. REESSAYER EN BOUCLE AGGRAVERAIT LA PANNE. La cause est une file d'attente : le
 *      tableau de bord lance jusqu'a 21 requetes dans la meme seconde contre un lot de
 *      5 connexions PostgREST. Des reessais en rafale allongeraient cette file. UN essai,
 *      un recul, puis on conclut — et jamais un troisieme.
 *
 *   3. REESSAYER UN REFUS SERAIT ABSURDE. Un droit refuse ne deviendra pas accorde en
 *      redemandant. Le reessai doit etre reserve au cas ou la reponse n'est JAMAIS ARRIVEE,
 *      sans quoi on double la charge sur les chemins qui fonctionnent.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Une erreur telle que PostgREST la rend : elle porte TOUJOURS un code. */
const erreurServeur = (code: string, message: string) => ({ code, message, details: null, hint: null });

/** Une erreur telle que postgrest-js la fabrique sur une panne de fetch : code VIDE. */
const erreurTransport = (message = "TypeError: Failed to fetch") =>
  ({ code: "", message, details: "", hint: "" });

/** Un banc d'essai qui compte les appels et les reculs, sans reseau ni attente reelle. */
function banc(reponses: ReponseBrute[]) {
  const reculs: number[] = [];
  let appels = 0;
  return {
    appeler: async (): Promise<ReponseBrute> => {
      const r = reponses[Math.min(appels, reponses.length - 1)];
      appels++;
      return r;
    },
    attendre: async (ms: number) => { reculs.push(ms); },
    get appels() { return appels; },
    get reculs() { return reculs; },
  };
}

// ------------------------------------------- A. LES SIX CAS QUI COMPTENT

test("A1 200 + true : l'acces est accorde, du premier coup, sans recul", async () => {
  const b = banc([{ data: true, error: null }]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.etat, "accorde");
  assert.equal(peutOuvrirCrmImmo(r.etat), true, "la Porte doit s'ouvrir");
  assert.equal(r.essais, 1, "une reussite ne doit JAMAIS coûter un second appel");
  assert.equal(b.reculs.length, 0, "aucune attente sur un chemin qui fonctionne");
  assert.equal(r.detail, null, "pas d'erreur, donc rien a afficher");
});

test("A2 200 + false : l'acces est refuse, et ce refus n'est pas reessaye", async () => {
  const b = banc([{ data: false, error: null }]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.etat, "refuse");
  assert.equal(accesRefuse(r.etat), true, "l'ecran doit dire « n'est pas active »");
  assert.equal(peutOuvrirCrmImmo(r.etat), false);
  assert.equal(r.essais, 1, "redemander un refus ne le changerait pas");
  assert.equal(b.reculs.length, 0);
});

test("A3 erreur SERVEUR avec code : on conclut, sans reessai aveugle", async () => {
  // Les trois erreurs serveur reellement mesurees sur ce projet le 26/10/2026.
  for (const [code, message] of [
    ["42501", "permission denied for function has_crm_immo_access"],
    ["PGRST301", "No suitable key or wrong key type"],
    ["22P02", "invalid input syntax for type uuid"],
  ]) {
    const b = banc([{ data: null, error: erreurServeur(code, message) }]);
    const r = await demanderAcces(b.appeler, b.attendre);

    assert.equal(r.etat, "erreur", `${code} doit fermer la porte`);
    assert.equal(r.essais, 1, `${code} est une reponse du serveur : la redemander est inutile`);
    assert.equal(b.reculs.length, 0, `${code} ne doit declencher aucune attente`);
    assert.equal(r.detail?.code, code, "le code doit remonter a l'ecran");
    assert.equal(r.detail?.message, message);
    assert.equal(r.detail?.transport, false, `${code} n'est PAS une panne de transport`);
  }
});

test("A4 erreur de TRANSPORT sans code : un seul reessai, apres un recul", async () => {
  const b = banc([
    { data: null, error: erreurTransport() },
    { data: null, error: erreurTransport() },
  ]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.essais, 2, "le compte rendu doit dire qu'il a fallu deux essais");
  assert.equal(r.etat, "erreur", "les deux essais ayant echoue, la porte se ferme");
  assert.equal(b.appels, 2, "exactement deux appels : un essai, un reessai");
  assert.equal(b.reculs.length, 1, "exactement un recul");
  assert.equal(b.reculs[0], RECUL_AVANT_REESSAI_MS, "le recul doit laisser la file se degager");
  assert.ok(RECUL_AVANT_REESSAI_MS >= 2000 && RECUL_AVANT_REESSAI_MS <= 3000,
    `le recul vaut ${RECUL_AVANT_REESSAI_MS} ms : hors de la fourchette 2000-3000 convenue`);
});

test("A5 second essai REUSSI : CRM Immo s'ouvre, la panne est oubliee", async () => {
  // C'est le cas qui justifie tout le reste : la requete aboutit cote serveur, seul le
  // premier transport a renonce. Le porteur ne doit rien voir du tout.
  const b = banc([
    { data: null, error: erreurTransport() },
    { data: true, error: null },
  ]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.etat, "accorde", "le droit est accorde : la Porte doit s'ouvrir");
  assert.equal(peutOuvrirCrmImmo(r.etat), true);
  assert.equal(r.essais, 2);
  assert.equal(r.detail, null, "la panne rattrapee ne doit laisser AUCUNE trace a l'ecran");
});

test("A6 second essai ECHOUE : ecran d'erreur, avec le message reel", async () => {
  const b = banc([
    { data: null, error: erreurTransport() },
    { data: null, error: erreurTransport("TypeError: Load failed") },
  ]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.etat, "erreur");
  assert.equal(accesRefuse(r.etat), false, "une panne n'est PAS un refus : l'ecran doit differer");
  assert.equal(peutOuvrirCrmImmo(r.etat), false, "une panne ne laisse pas entrer");
  assert.equal(r.essais, 2);
  assert.equal(r.detail?.transport, true);
  assert.equal(r.detail?.code, null, "une panne de transport n'a pas de code");
  assert.equal(r.detail?.message, "TypeError: Load failed",
    "c'est le message du DERNIER essai qui est affiche");
});

// -------------------------------------- B. LES BORNES : jamais de boucle

test("B1 un transport qui echoue toujours s'arrete a DEUX appels", async () => {
  // La borne qui protege la file d'attente. Sans elle, la correction aggraverait la cause.
  const b = banc([{ data: null, error: erreurTransport() }]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(b.appels, 2, "jamais un troisieme appel, quoi qu'il arrive");
  assert.equal(b.reculs.length, 1, "jamais un second recul");
  assert.equal(r.essais, 2);
});

test("B2 le reessai ne se declenche QUE sur le transport, pas sur un code", async () => {
  // Un serveur qui repond, meme pour refuser, a dit son dernier mot.
  const b = banc([
    { data: null, error: erreurServeur("42501", "permission denied") },
    { data: true, error: null },
  ]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(b.appels, 1, "une erreur nommee par le serveur ne se redemande pas");
  assert.equal(r.etat, "erreur", "et surtout : on ne doit PAS tomber sur le `true` suivant");
});

test("B3 une panne au premier essai suivie d'un REFUS conclut au refus", async () => {
  const b = banc([
    { data: null, error: erreurTransport() },
    { data: false, error: null },
  ]);
  const r = await demanderAcces(b.appeler, b.attendre);

  assert.equal(r.etat, "refuse", "le second essai fait foi");
  assert.equal(r.detail, null);
  assert.equal(b.appels, 2);
});

// ------------------------------- C. LE DISCRIMINANT : code vide, pas message

test("C1 une erreur SANS code est du transport ; avec code, elle ne l'est pas", () => {
  assert.equal(estErreurDeTransport({ code: "", message: "Failed to fetch" }), true);
  assert.equal(estErreurDeTransport({ message: "Failed to fetch" }), true, "code absent");
  assert.equal(estErreurDeTransport({ code: null, message: "x" }), true, "code null");
  assert.equal(estErreurDeTransport({ code: "42501", message: "x" }), false);
  assert.equal(estErreurDeTransport({ code: "PGRST301", message: "x" }), false);
});

test("C2 pas d'erreur du tout : ce n'est pas du transport", () => {
  // Le piege serait de rendre vrai sur null : on reessaierait alors chaque succes.
  assert.equal(estErreurDeTransport(null), false);
  assert.equal(estErreurDeTransport(undefined), false);
});

test("C3 le discriminant ne lit JAMAIS le message", () => {
  /* Le message d'une panne de fetch est formule par le navigateur et TRADUIT dans la
     langue du systeme : « Failed to fetch » (Chrome), « Load failed » (Safari),
     « NetworkError... » (Firefox). Un releve qui passerait sur l'un echouerait sur l'autre,
     et la panne reapparaitrait sur les telephones d'une autre langue. */
  const code = sansCommentaires(lire("src/lib/crmImmoAccess.ts"));
  const fonction = code.slice(code.indexOf("export function estErreurDeTransport"));
  const corps = fonction.slice(0, fonction.indexOf("\n}"));
  assert.doesNotMatch(corps, /message/i, "estErreurDeTransport lit le message : fragile a la langue");
  assert.doesNotMatch(corps, /fetch|Failed|Network|Load/i, "un texte de navigateur sert de critere");
});

test("C4 decrireErreur rend un detail affichable, et rien quand tout va bien", () => {
  assert.equal(decrireErreur(null), null);
  assert.equal(decrireErreur(undefined), null);

  const serveur = decrireErreur(erreurServeur("42501", "permission denied"));
  assert.deepEqual(serveur, { code: "42501", message: "permission denied", transport: false });

  const reseau = decrireErreur(erreurTransport());
  assert.deepEqual(reseau, { code: null, message: "TypeError: Failed to fetch", transport: true });

  // Une erreur mal formee ne doit pas produire « undefined » a l'ecran.
  const bancal = decrireErreur({});
  assert.equal(bancal?.message, "Erreur inconnue");
  assert.equal(bancal?.code, null);
});

// ------------------------------------- D. CE QUE L'ECRAN MONTRE VRAIMENT

test("D1 la Porte AFFICHE le code et le message reels", () => {
  const code = sansCommentaires(lire("src/pages/admin/dashboard/CrmImmoGate.tsx"));
  assert.match(code, /detail\?: DetailErreur \| null/, "la Porte ne recoit plus le detail");
  assert.match(code, /crm-immo-erreur-detail/, "le bloc de detail a disparu de l'ecran");
  assert.match(code, /detail\.code \? `\$\{detail\.code\} — \$\{detail\.message\}` : detail\.message/,
    "le code et le message ne sont plus affiches tels quels");
});

test("D2 une panne de transport se raconte AUTREMENT qu'une verification ratee", () => {
  // Les deux ferment la porte, mais le geste utile differe : ici, reessayer suffit souvent.
  const code = sansCommentaires(lire("src/pages/admin/dashboard/CrmImmoGate.tsx"));
  assert.match(code, /detail\?\.transport/, "l'ecran ne distingue plus le transport");
});

test("D3 le detail ne s'affiche JAMAIS sur un refus", () => {
  /* Un refus est une decision, pas un incident : y coller un code d'erreur inquieterait
     une Societe qui n'a simplement pas souscrit au module. */
  const code = sansCommentaires(lire("src/pages/admin/dashboard/CrmImmoGate.tsx"));
  assert.match(code, /\{!refus && detail && \(/, "le detail n'est plus conditionne au non-refus");
});

test("D4 le detail traverse toute la chaine, de AdminDashboard a la Porte", () => {
  // Une prop qui s'arrete en route ne casse RIEN : l'ecran redevient simplement muet,
  // et le prochain incident coute de nouveau une heure de journaux.
  const dashboard = sansCommentaires(lire("src/pages/admin/AdminDashboard.tsx"));
  assert.match(dashboard, /detail: crmImmoDetailErreur/, "le hook ne rend plus le detail au dashboard");
  assert.match(dashboard, /crmImmoDetailErreur=\{crmImmoDetailErreur\}/, "le detail n'est plus descendu");

  const renderer = sansCommentaires(lire("src/pages/admin/dashboard/AdminViewRenderer.tsx"));
  assert.match(renderer, /crmImmoDetailErreur\?: DetailErreur \| null/, "le renderer ne declare plus la prop");
  assert.match(renderer, /detail=\{crmImmoDetailErreur\}/, "le renderer ne la passe plus a la Porte");
});

test("D5 le hook expose le detail a cote de l'etat", () => {
  const hook = sansCommentaires(lire("src/hooks/useCrmImmoAccess.ts"));
  assert.match(hook, /return \{ etat, detail, recharger: interroger \}/, "le hook ne rend plus le detail");
  assert.match(hook, /demanderAcces\(/, "le hook n'utilise plus la sequence a reessai");
  assert.doesNotMatch(hook, /\.rpc\([^)]*\)\s*\.then\(/,
    "l'ancien appel direct sans reessai subsiste dans le hook");
});

// ------------------- E. LE REJET : la panne qui ne dit RIEN est la pire

test("E1 un appelant qui LEVE est traite comme une panne de transport", async () => {
  /* Si demanderAcces laissait passer le rejet, le `.then` du hook ne l'attraperait pas,
     setEtat ne serait jamais appele, et la Porte afficherait un rond qui tourne SANS FIN.
     C'est la panne exacte payee le 25/10/2026 sur le coffre Capacitor. */
  let appels = 0;
  const appeler = async (): Promise<ReponseBrute> => {
    appels++;
    throw new TypeError("Failed to fetch");
  };
  const r = await demanderAcces(appeler, async () => {});

  assert.equal(r.etat, "erreur", "un rejet doit CONCLURE, jamais laisser l'ecran en attente");
  assert.equal(appels, 2, "un rejet est du transport : il merite son unique reessai");
  assert.equal(r.detail?.transport, true);
  assert.match(r.detail?.message ?? "", /Failed to fetch/, "le message reel doit survivre");
});

test("E2 un rejet suivi d'une reussite ouvre quand meme CRM Immo", async () => {
  let appels = 0;
  const appeler = async (): Promise<ReponseBrute> => {
    appels++;
    if (appels === 1) throw new Error("boom");
    return { data: true, error: null };
  };
  const r = await demanderAcces(appeler, async () => {});

  assert.equal(r.etat, "accorde");
  assert.equal(r.detail, null, "la panne rattrapee ne laisse aucune trace");
});

test("E3 une valeur non-Error levee ne produit pas « [object Object] » a l'ecran", async () => {
  const appeler = async (): Promise<ReponseBrute> => { throw "coupure"; };
  const r = await demanderAcces(appeler, async () => {});

  assert.equal(r.etat, "erreur");
  assert.equal(r.detail?.message, "coupure");
});

test("E4 le hook garde un filet, meme si demanderAcces ne leve plus", () => {
  // Ceinture ET bretelles : demanderAcces convertit deja les rejets, mais un `.then` sans
  // `.catch` est precisement la forme qui a produit le blocage du coffre Capacitor.
  const hook = sansCommentaires(lire("src/hooks/useCrmImmoAccess.ts"));
  assert.match(hook, /\.catch\(/, "le hook n'a plus de filet : un rejet figerait l'ecran");
  assert.match(hook, /setEtat\('erreur'\)/, "le filet ne conclut plus l'etat");
});

test("D6 le recul passe par le compteur de demandes", () => {
  /* Pendant les 2,5 secondes d'attente, l'utilisateur peut changer de Societe en Visu.
     La reponse tardive doit alors etre JETEE, sinon elle ecraserait le droit de la
     Societe reellement affichee — un module ouvert pour la mauvaise Societe. */
  const hook = sansCommentaires(lire("src/hooks/useCrmImmoAccess.ts"));
  /*
   * On COMPTE, on ne constate pas. Une passe de mutation l'a montre : la garde existe
   * desormais a DEUX issues — la reponse et le rejet — et un releve qui se contente de
   * trouver le motif reste vert quand on en supprime une seule. Il faut les deux, sinon
   * une reponse tardive pourrait ouvrir le module pour la MAUVAISE Societe.
   */
  const gardes = hook.match(/if \(n !== demande\.current\) return;/g) ?? [];
  assert.equal(gardes.length, 2,
    `la garde d'annulation doit proteger les DEUX issues du hook, ${gardes.length} trouvee(s)`);
});
