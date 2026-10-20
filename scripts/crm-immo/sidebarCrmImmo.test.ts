// Tests du choix de conception de la barre laterale : le DROIT, jamais le drapeau `hidden`.
//   node --test scripts/crm-immo/sidebarCrmImmo.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sectionsAvecCrmImmo, ENTREE_CRM_IMMO } from "../../src/lib/crmImmoSidebar.ts";
import {
  defaultEntries, visibleEntries, reconcileLayout,
  type LayoutDefaultSection, type LayoutEntry,
} from "../../src/lib/sidebarLayout.ts";

/* La forme reelle de LAYOUT_SECTIONS du panel Societe, reduite a ce qui compte ici. */
const SECTIONS: LayoutDefaultSection[] = [
  { title: "Principal", items: [
    { id: "vue-ensemble", label: "Dashboard" },
    { id: "boutique", label: "Boutique" },
    { id: "cabinet", label: "Cabinet" },
    { id: "site", label: "Site" },
    { id: "logo", label: "Logo", hidden: true },
  ] },
  { title: "Gestion des leads", items: [
    { id: "crm", label: "CRM Leads" },
    { id: "statuts", label: "Statuts" },
  ] },
];

const ids = (sections: LayoutDefaultSection[]) => sections.flatMap(s => s.items.map(i => i.id));
const itemIds = (entries: LayoutEntry[]) =>
  entries.filter(e => e.kind === "item").map(e => (e as { id: string }).id);
const item = (entries: LayoutEntry[], id: string) =>
  entries.find(e => e.kind === "item" && (e as { id: string }).id === id) as { hidden?: boolean } | undefined;

/* On retire les commentaires avant de chercher un motif interdit dans le code source.
   Les deux fichiers CITENT volontairement le contre-exemple en commentaire pour
   expliquer le piege : la regle porte sur ce qui s'execute, pas sur la prose. */
const sansCommentaires = (src: string) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

test("SANS droit : l entree n est pas MASQUEE, elle n est pas EMISE", () => {
  const sans = sectionsAvecCrmImmo(SECTIONS, false);
  assert.ok(!ids(sans).includes("crm-immo"), "l entree ne doit pas exister du tout");
  /* Identite preservee : si ce tableau changeait a chaque rendu, `defaults` changerait
     avec lui et l'effet de chargement de useSidebarLayout se relancerait en boucle —
     une panne invisible a l'ecran, visible seulement au reseau. */
  assert.equal(sans, SECTIONS, "sans droit, le tableau d entree doit etre rendu tel quel");
});

test("AVEC droit : l entree est emise VISIBLE, dans Principal, juste apres Cabinet", () => {
  const avec = sectionsAvecCrmImmo(SECTIONS, true);
  const principal = avec.find(s => s.title === "Principal")!;
  const place = principal.items.findIndex(i => i.id === "crm-immo");
  assert.ok(place > 0, "l entree doit etre dans le compartiment Principal");
  assert.equal(principal.items[place - 1].id, "cabinet", "elle se place juste apres Cabinet");
  assert.equal(principal.items[place].hidden, undefined, "elle ne doit JAMAIS porter hidden");
  /* Pas sous « Gestion des leads » : ce serait contredire a l'oeil la regle fondatrice
     du module — CRM Immo ne se melange pas aux leads. */
  const leads = avec.find(s => s.title === "Gestion des leads")!;
  assert.ok(!leads.items.some(i => i.id === "crm-immo"), "pas sous Gestion des leads");
  /* Rien d'autre n'a bouge. */
  assert.deepEqual(
    ids(avec).filter(i => i !== "crm-immo"), ids(SECTIONS),
    "aucun autre onglet n est ajoute, retire ni deplace",
  );
});

test("LE PIEGE DU BOUTON « Par defaut » : il ne peut plus couter l onglet", () => {
  /* resetToDefault remplace le brouillon par defaultEntries(sections), et confirmReorder
     l'enregistre TEL QUEL, sans fusion. C'est donc ce tableau-la qui part en base quand
     une Societe clique « Par defaut » puis « Valider ». Il doit contenir CRM Immo, et le
     contenir VISIBLE. */
  const brouillon = defaultEntries(sectionsAvecCrmImmo(SECTIONS, true));
  const entree = item(brouillon, "crm-immo");
  assert.ok(entree, "« Par defaut » perdrait l onglet");
  assert.notEqual(entree!.hidden, true, "« Par defaut » le remasquerait");
  /* Et il survit au filtre de rendu. */
  assert.ok(itemIds(visibleEntries(brouillon)).includes("crm-immo"),
    "l onglet doit rester visible apres « Par defaut »");
});

test("une configuration DEJA enregistree recupere l onglet quand le droit arrive", () => {
  /* Cas reel : Bellisimmo avait deja range ses onglets avant que le module existe.
     Signature : reconcileLayout(defaults, saved, panel, entity) — les DEFAUTS d'abord.
     Les inverser rendrait la sauvegarde telle quelle et le test passerait pour de
     mauvaises raisons. */
  const avant = defaultEntries(sectionsAvecCrmImmo(SECTIONS, false));
  assert.ok(!itemIds(avant).includes("crm-immo"), "premisse : l onglet n existait pas");

  const sauvegarde = { v: 2 as const, panel: "admin" as const, entity: "u1", entries: avant };
  const apres = reconcileLayout(
    defaultEntries(sectionsAvecCrmImmo(SECTIONS, true)), sauvegarde, "admin", "u1",
  );

  assert.ok(itemIds(apres).includes("crm-immo"), "reconcileLayout doit ajouter l onglet neuf");
  assert.notEqual(item(apres, "crm-immo")!.hidden, true, "il doit arriver VISIBLE, pas masque");
  /* Et il ne doit pas avoir emporte les choix precedents de la Societe. */
  for (const id of itemIds(avant)) {
    assert.ok(itemIds(apres).includes(id), `l onglet ${id} a disparu de la configuration`);
  }
});

test("une Societe SANS droit garde une configuration sans CRM Immo", () => {
  /* Le cas symetrique : rien ne doit apparaitre chez qui n'a pas le module, meme apres
     une reconciliation. */
  const avant = defaultEntries(sectionsAvecCrmImmo(SECTIONS, true));
  const sauvegarde = { v: 2 as const, panel: "admin" as const, entity: "u2", entries: avant };
  const apres = reconcileLayout(
    defaultEntries(sectionsAvecCrmImmo(SECTIONS, false)), sauvegarde, "admin", "u2",
  );
  assert.ok(!itemIds(apres).includes("crm-immo"),
    "une Societe sans droit ne doit pas conserver l onglet d une configuration anterieure");
});

test("le code source ne porte JAMAIS le droit dans un drapeau hidden", () => {
  const sidebar = readFileSync("src/pages/admin/Sidebar.tsx", "utf8");
  const pur = readFileSync("src/lib/crmImmoSidebar.ts", "utf8");

  /* LAYOUT_SECTIONS est la declaration INCONDITIONNELLE : 'crm-immo' y serait emis pour
     toutes les Societes, droit ou pas. */
  const debut = sidebar.indexOf("const LAYOUT_SECTIONS");
  assert.ok(debut > 0, "le bloc LAYOUT_SECTIONS n a pas ete trouve");
  const declaration = sidebar.slice(debut, sidebar.indexOf("\n];", debut));
  assert.ok(declaration.length > 100, "le bloc LAYOUT_SECTIONS est suspectement court");
  assert.ok(!declaration.includes("crm-immo"),
    "'crm-immo' est declare dans LAYOUT_SECTIONS : il serait emis sans droit");

  for (const paire of [["Sidebar.tsx", sidebar], ["crmImmoSidebar.ts", pur]] as const) {
    const code = sansCommentaires(paire[1]);
    /* Garde-fou du garde-fou : si le retrait des commentaires avalait tout, l assertion
       suivante passerait sans rien verifier. */
    assert.ok(code.includes("crm-immo"), paire[0] + " : 'crm-immo' a disparu du code examine");
    assert.ok(!/crm-immo[^\n]*hidden\s*:\s*true/.test(code),
      paire[0] + " : l entree CRM Immo porte hidden: true dans le code");
  }

  /* L'icone doit etre dans ICONS : une icone oubliee ne leve AUCUNE erreur (ICONS est un
     Record<string, ReactNode>, pas Record<ActiveView, ...>) et rend un <span> vide. */
  assert.ok(/'crm-immo':\s*<\w+/.test(sidebar), "l icone de 'crm-immo' manque dans ICONS");

  /* Le rendu doit attendre que le droit soit resolu avant de pouvoir enregistrer un ordre. */
  assert.ok(sidebar.includes("!layout.loaded || !crmImmoResolu"),
    "le rendu n attend pas que le droit soit resolu : une validation ecrirait un ordre sans CRM Immo");
});

test("l entree exportee est bien celle attendue", () => {
  assert.equal(ENTREE_CRM_IMMO.id, "crm-immo");
  assert.equal(ENTREE_CRM_IMMO.label, "CRM Immo");
  assert.ok(!("hidden" in ENTREE_CRM_IMMO), "l entree de reference ne porte aucun drapeau hidden");
});
