// La vue d'arrivee de Bellisimmo : CRM Immo, pour elle seule, et SANS clignotement.
//   node --import tsx --test scripts/crm-immo/vueArriveeBellisimmo.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import {
  vueArriveeAdmin,
  VUE_ARRIVEE_CRM_IMMO_COMPANY_ID,
  CLE_COMPANY_ID,
} from "../../src/lib/vueArriveeAdmin";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Demande de David du 25/10/2026 : les utilisateurs de « Bellisimmo » arrivent sur
 * CRM Immo. Une premiere version basculait dans un useEffect — elle fonctionnait, mais
 * David a vu le Dashboard apparaitre une fraction de seconde avant la bascule. La decision
 * se prend donc desormais AVANT le premier rendu.
 *
 * TROIS ACCIDENTS POSSIBLES, aucun visible a la relecture :
 *
 *   1. REVENIR A UNE CORRECTION APRES COUP. Decider dans un effet, ou repartir de
 *      companyId, ramene le clignotement : CompanyIdContext part de null et ne se remplit
 *      que dans un useEffect, donc il n'y a RIEN a lire au premier rendu.
 *
 *   2. CROIRE QUE LA VUE DE DEPART OUVRE LE MODULE. Elle ne l'ouvre pas : CrmImmoGate
 *      n'evalue son lazy() que sur un droit 'accorde'. Retirer la Porte, ou la court-
 *      circuiter, serait le vrai danger — pas la vue de depart.
 *
 *   3. ELARGIR LA BASCULE. Sans la comparaison d'identifiant, toutes les Societes
 *      partiraient sur CRM Immo ; sans le drapeau de Visu, le Super Admin et le Groupe
 *      seraient deplaces eux aussi.
 */

const F = "src/pages/admin/AdminDashboard.tsx";
const lire = () => readFileSync(F, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ------------------------------------------------ A. LA DECISION, PAR LE COMPORTEMENT

test("A1 Bellisimmo part sur CRM Immo", () => {
  assert.equal(vueArriveeAdmin(VUE_ARRIVEE_CRM_IMMO_COMPANY_ID, false), "crm-immo");
});

test("A2 toute autre Societe part sur la vue d'ensemble", () => {
  for (const autre of [
    "a0000000-0000-0000-0000-000000000001", // David Schemmama
    "442ca590-3757-4ea9-a010-cb45d11f0ad6", // johanna boutique 1
    "a88da833-932f-4fd7-9e89-1b7f72ad5362", // Talvex
    "112ca840-ecfd-48b1-8f9b-b00e6dd04455", // Torah
  ]) {
    assert.equal(vueArriveeAdmin(autre, false), "vue-ensemble", `${autre} ne devrait pas basculer`);
  }
});

test("A3 une Societe inconnue ne bascule pas", () => {
  // Le cas du stockage vide ou illisible : on retombe sur le comportement d'origine.
  assert.equal(vueArriveeAdmin(null, false), "vue-ensemble");
  assert.equal(vueArriveeAdmin("", false), "vue-ensemble");
});

test("A4 aucune Visu n'est deplacee, Groupe compris", () => {
  // Meme pour Bellisimmo : si quelqu'un regarde le panneau d'un autre, il n'est pas deplace.
  assert.equal(vueArriveeAdmin(VUE_ARRIVEE_CRM_IMMO_COMPANY_ID, true), "vue-ensemble");
});

test("A5 l'identifiant vise est bien celui mesure en base", () => {
  // companies.name = 'Bellisimmo', crm_immo_acces.active = true, verifie le 25/10/2026.
  // Une faute de frappe ici ne ferait RIEN basculer, en silence.
  assert.equal(VUE_ARRIVEE_CRM_IMMO_COMPANY_ID, "87875350-40c8-4ee5-be3b-9398fa4106bf");
});

test("A6 la cle lue est bien celle qu'ecrit App.tsx", () => {
  // Si l'une des deux derive, la decision se prend sur une valeur absente et le
  // clignotement revient — sans aucune erreur pour le signaler.
  assert.equal(CLE_COMPANY_ID, "crm_company_id");
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(
    app,
    /localStorage\.setItem\('crm_company_id', cid\)/,
    "App.tsx n'ecrit plus la Societe sous cette cle : la vue de depart ne pourra plus la lire",
  );
  // Et il doit EFFACER quand il n'y a pas de Societe. Sans ce nettoyage, un utilisateur
  // sans Societe heriterait de celle du compte precedent et partirait sur CRM Immo sans
  // aucune raison — defaut trouve en relisant ma propre solution, avant tout test.
  assert.match(
    app,
    /else localStorage\.removeItem\('crm_company_id'\);/,
    "App.tsx ne nettoie plus la cle : une Societe peut etre heritee du compte precedent",
  );
});

// ------------------------------------------------ B. PAS DE CLIGNOTEMENT

test("B1 la vue de depart est DECIDEE au premier rendu", () => {
  const code = sansCommentaires(lire());
  assert.match(
    code,
    /useState<ActiveView>\(\(\) =>\s*vueArriveeAdmin\(societeMemorisee\(\), isSAViewing === true\),?\s*\)/,
    "la vue de depart n'est plus calculee au premier rendu : le clignotement reviendrait",
  );
});

test("B2 elle ne repart PAS de companyId, qui vaut null au premier rendu", () => {
  // CompanyIdContext : useState<string | null>(null) puis un useEffect. Decider avec cette
  // valeur redonnerait exactement le defaut que David a signale.
  const ctx = readFileSync("src/contexts/CompanyIdContext.tsx", "utf8");
  assert.match(ctx, /useState<string \| null>\(null\)/, "CompanyIdContext ne part plus de null : reverifier le raisonnement");
  const code = sansCommentaires(lire());
  assert.ok(
    !/useState<ActiveView>\([^)]*companyId/.test(code),
    "la vue de depart lit companyId, qui n'est pas encore connu au premier rendu",
  );
});

test("B3 l'effet de rattrapage est conserve", () => {
  // Il ne sert que si le stockage n'a rien rendu. Le retirer rendrait ces cas
  // silencieusement inoperants : l'utilisateur resterait sur le Dashboard.
  const code = sansCommentaires(lire());
  assert.match(code, /if \(arriveeInitialeAppliquee\) return;/, "le rattrapage a disparu");
  assert.match(code, /setActiveView\('crm-immo'\);/, "le rattrapage ne bascule plus");
});

// ------------------------------------------------ C. LA PORTE RESTE SEULE MAITRE DU DROIT

test("C1 partir sur crm-immo n'ouvre pas le module sans droit", () => {
  // C'est ce qui rend la vue de depart inoffensive : le lazy() n'est evalue que dans la
  // branche « accorde », et 'inconnu' affiche un spinner au lieu d'ouvrir.
  const porte = readFileSync("src/pages/admin/dashboard/CrmImmoGate.tsx", "utf8");
  assert.match(porte, /if \(peutOuvrirCrmImmo\(etat\)\) \{/, "la Porte n'exige plus le droit avant de monter le module");
  assert.match(porte, /if \(etat === 'inconnu'\) return chargement;/, "la Porte n'attend plus un droit non resolu");
  assert.match(porte, /const CrmImmo = lazy\(importCrmImmo\);/, "le module n'est plus charge paresseusement par la Porte");
});

test("C2 le renderer passe toujours par la Porte", () => {
  const r = readFileSync("src/pages/admin/dashboard/AdminViewRenderer.tsx", "utf8");
  assert.match(
    r,
    /case 'crm-immo': return <CrmImmoGate etat=\{crmImmoAcces\}/,
    "la vue crm-immo ne passe plus par la Porte",
  );
});

// ------------------------------------------------ D. CE QUI NE DEVAIT PAS BOUGER

test("D1 le panneau Societe n'est pas touche", () => {
  // Bellisimmo a le role technique « admin », donc le panneau Admin. Le vrai panneau
  // Societe n'a d'ailleurs aucun onglet CRM Immo.
  const csa = readFileSync("src/pages/company-super-admin/CompanySuperAdminDashboard.tsx", "utf8");
  assert.match(csa, /useState<CSAView>\('overview'\)/, "la vue initiale du panneau Societe a change");
  const vues = readFileSync("src/pages/company-super-admin/CSASidebar.tsx", "utf8");
  assert.ok(!/type CSAView[^;]*crm-immo/.test(vues), "crm-immo a ete ajoute aux vues du panneau Societe");
});

test("D2 ni Commercial ni Client ne sont concernes", () => {
  for (const f of ["src/pages/vendor/VendorDashboard.tsx", "src/pages/client/ClientDashboard.tsx"]) {
    assert.ok(
      !readFileSync(f, "utf8").includes("vueArriveeAdmin"),
      `${f} porte desormais une vue d'arrivee CRM Immo`,
    );
  }
});

test("D3 la decision ne vit qu'a UN endroit", () => {
  // Deux copies de la regle divergeraient : la barre laterale et la vue ne diraient plus
  // la meme chose, selon celle qui aurait ete mise a jour.
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(e.name)) fichiers.push(p);
    }
  };
  parcourir("src");
  const porteurs = fichiers
    .filter((f) => sansCommentaires(readFileSync(f, "utf8")).includes("87875350-40c8-4ee5-be3b-9398fa4106bf"))
    .sort();
  assert.deepEqual(
    porteurs,
    ["src/lib/vueArriveeAdmin.ts"],
    "l'identifiant de Bellisimmo est desormais ecrit a plusieurs endroits",
  );
});
