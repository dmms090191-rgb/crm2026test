// Tests du droit d'acces CRM Immo (module pur, aucun reseau).
//   node --test scripts/crm-immo/acces.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lireReponseAcces,
  peutOuvrirCrmImmo,
  accesResolu,
  accesRefuse,
  type EtatAcces,
} from "../../src/lib/crmImmoAccess.ts";

test("seul true accorde : tout le reste ferme la porte", () => {
  assert.equal(lireReponseAcces(true, null), "accorde");
  assert.equal(lireReponseAcces(false, null), "refuse");
  assert.equal(lireReponseAcces(null, null), "refuse", "une absence de ligne est un refus");
  assert.equal(lireReponseAcces(undefined, null), "refuse", "une fonction absente est un refus");
  /* La verite au sens de JavaScript ne doit JAMAIS servir ici : la RPC rend un
     booleen, et une chaine non vide ou un 1 signalent une reponse inattendue. */
  assert.equal(lireReponseAcces("true", null), "refuse", "une chaine n'accorde pas");
  assert.equal(lireReponseAcces(1, null), "refuse", "un nombre n'accorde pas");
  assert.equal(lireReponseAcces({}, null), "refuse", "un objet n'accorde pas");
});

test("une panne reseau n'est pas un refus, et n'ouvre pas non plus", () => {
  const etat = lireReponseAcces(null, { message: "Failed to fetch" });
  assert.equal(etat, "erreur");
  assert.equal(peutOuvrirCrmImmo(etat), false, "une panne ne laisse pas entrer");
  assert.equal(accesRefuse(etat), false, "une panne ne doit pas s'afficher comme un refus definitif");
  /* L'erreur est examinee AVANT la donnee : supabase-js rend data = null des
     qu'il y a une erreur, et un null lu sans regarder l'erreur se lirait comme
     un refus — l'ecran accuserait alors la Societe au lieu du reseau. */
  assert.equal(lireReponseAcces(true, { message: "boom" }), "erreur",
    "l'erreur l'emporte meme si une donnee traine");
});

test("'inconnu' n'est NI accorde NI refuse : c'est ce qui permet d'attendre", () => {
  const etat: EtatAcces = "inconnu";
  assert.equal(peutOuvrirCrmImmo(etat), false);
  assert.equal(accesRefuse(etat), false);
  assert.equal(accesResolu(etat), false);
  /* C'est l'assertion qui protege contre la << simplification >> en booleen.
     Avec un booleen initialise a false, accesResolu n'existerait pas et la barre
     laterale enregistrerait un ordre d'onglets SANS CRM Immo pendant la fenetre
     de chargement — l'onglet reviendrait ensuite en fin de liste, hors de son
     compartiment, et personne ne saurait pourquoi. */
  assert.notEqual(etat, "refuse", "inconnu et refuse doivent rester distincts");
});

test("peutOuvrirCrmImmo ne repond oui que sur 'accorde'", () => {
  const tous: EtatAcces[] = ["inconnu", "accorde", "refuse", "erreur"];
  const ouverts = tous.filter(peutOuvrirCrmImmo);
  assert.deepEqual(ouverts, ["accorde"], "un seul etat ouvre le module");
});

test("accesResolu : les trois etats de reponse, et seulement eux", () => {
  const tous: EtatAcces[] = ["inconnu", "accorde", "refuse", "erreur"];
  assert.deepEqual(tous.filter(accesResolu), ["accorde", "refuse", "erreur"]);
});

test("accesRefuse : seul le refus definitif s'explique a l'ecran", () => {
  const tous: EtatAcces[] = ["inconnu", "accorde", "refuse", "erreur"];
  assert.deepEqual(tous.filter(accesRefuse), ["refuse"]);
});
