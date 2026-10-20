// Le module suit le theme actif, et ne demande jamais sa hauteur en pourcentage.
//   node --test scripts/crm-immo/theme.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/*
 * TROIS REGLES, chacune payee par un defaut reel de ce depot.
 *
 * 1. AUCUNE COULEUR EN DUR. Le depot a 16 themes, dont 5 clairs. Une couleur ecrite a la
 *    main passe le build, passe le typecheck, s'affiche correctement sur les sombres, et
 *    devient illisible sur les clairs — dont Talixy. Elle ne se decouvre qu'a l'oeil,
 *    theme par theme, c'est-a-dire jamais.
 *
 * 2. AUCUN h-full NI height: 100%. ThemeContext interpose un `<div key={scopeId}>` SANS
 *    STYLE entre la page et son conteneur. Un `height: 100%` est un contrat avec TOUS
 *    les ancetres : cette div sans hauteur le rompt, en silence. Le defaut a deja ete
 *    mesure sur le site public, ou il a casse un template entier. On s'etend par flex-1
 *    et min-h-0, qui ne dependent d'aucun ancetre.
 *
 * 3. LE MOBILE EXISTE VRAIMENT. David : « ne compresse pas simplement le tableau ». Le
 *    tableau porte `hidden md:block`, les fiches `md:hidden` : les deux ne sont jamais
 *    montes ensemble, et sous 768 px il n'y a aucun <table>.
 *
 * Les commentaires sont retires avant de chercher : ces fichiers CITENT volontairement
 * les contre-exemples pour expliquer les pieges. La regle porte sur ce qui s'execute.
 */

const OUVRE = "/" + "*";
const FERME = "*" + "/";
function codeSeul(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(OUVRE, i)) {
      const f = src.indexOf(FERME, i + 2);
      i = f === -1 ? src.length : f + 2;
      continue;
    }
    if (src.startsWith("//", i)) {
      const f = src.indexOf("\n", i);
      i = f === -1 ? src.length : f;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

const DOSSIER = "src/pages/admin/views/crm-immo";
/* Les fichiers du panel SOCIETE : ceux que la Societe voit, donc ceux qui doivent suivre
   son theme. La bascule d'octroi du panel Talvex est traitee a part, plus bas. */
const FICHIERS = [
  "src/pages/admin/views/CrmImmo.tsx",
  "src/pages/admin/dashboard/CrmImmoGate.tsx",
  ...readdirSync(DOSSIER).filter(f => f.endsWith(".tsx")).map(f => DOSSIER + "/" + f),
];

const COULEURS = [
  { motif: /#[0-9a-fA-F]{3,8}\b/, quoi: "une couleur hexadecimale" },
  { motif: /\brgba?\(/, quoi: "une couleur rgb()/rgba()" },
  { motif: /\b(?:text|bg|border)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/, quoi: "une classe de couleur Tailwind" },
  { motif: /\b(?:text|bg)-(?:white|black)\b/, quoi: "text-white ou bg-white" },
];

test("aucune couleur en dur dans les fichiers du panel Societe", () => {
  for (const f of FICHIERS) {
    const code = codeSeul(readFileSync(f, "utf8"));
    assert.ok(code.trim().length > 40, f + " : le code examine est vide");
    for (const c of COULEURS) {
      const m = c.motif.exec(code);
      assert.equal(m, null,
        f + " porte " + c.quoi + " en dur (" + (m ? m[0] : "") + ") : illisible sur les 5 themes clairs");
    }
  }
});

test("aucune hauteur en pourcentage : la div sans style de ThemeContext la romprait", () => {
  for (const f of FICHIERS) {
    const code = codeSeul(readFileSync(f, "utf8"));
    assert.ok(!/\bh-full\b/.test(code), f + " utilise h-full");
    assert.ok(!/height:\s*['"]?100%/.test(code), f + " demande height: 100%");
    assert.ok(!/\bmin-h-screen\b/.test(code), f + " utilise min-h-screen, qui ignore la zone reelle");
  }
});

test("la vue s etend par flex, et laisse son contenu se reduire", () => {
  const vue = codeSeul(readFileSync("src/pages/admin/views/CrmImmo.tsx", "utf8"));
  assert.ok(/flex-1/.test(vue), "la vue doit s etendre par flex-1");
  assert.ok(/min-h-0/.test(vue), "min-h-0 est obligatoire, sinon le contenu refuse de se reduire");
});

test("LE MOBILE : un tableau cache et des fiches, jamais les deux ensemble", () => {
  const table = codeSeul(readFileSync(DOSSIER + "/CrmImmoTable.tsx", "utf8"));
  const cards = codeSeul(readFileSync(DOSSIER + "/CrmImmoCards.tsx", "utf8"));

  assert.ok(/hidden md:block/.test(table),
    "CrmImmoTable doit porter `hidden md:block` : sous 768 px il ne doit pas exister");
  assert.ok(/md:hidden/.test(cards),
    "CrmImmoCards doit porter `md:hidden` : au-dessus de 768 px il ne doit pas exister");

  /* Les fiches ne doivent contenir AUCUN tableau : ce serait un tableau comprime
     deguise, exactement ce que David a refuse. */
  assert.ok(!/<table/.test(cards), "CrmImmoCards contient un <table> : ce n est pas une presentation mobile");
  assert.ok(!/overflow-x-auto/.test(cards), "CrmImmoCards defile horizontalement : interdit a 375 px");

  /* Et la vue monte bien les DEUX, en laissant les breakpoints decider. */
  const vue = readFileSync("src/pages/admin/views/CrmImmo.tsx", "utf8");
  assert.ok(vue.includes("<CrmImmoTable"), "la vue doit monter le tableau");
  assert.ok(vue.includes("<CrmImmoCards"), "la vue doit monter les fiches");
});

test("les fiches mobiles LISENT la configuration des colonnes, elles ne codent pas les champs", () => {
  /* Sans ca, les deux presentations divergeraient des la premiere colonne personnalisee :
     le tableau l afficherait, les fiches non. */
  const cards = codeSeul(readFileSync(DOSSIER + "/CrmImmoCards.tsx", "utf8"));
  assert.ok(/colonnes/.test(cards), "les fiches doivent recevoir les colonnes");
  assert.ok(/valeurAffichee/.test(cards), "les fiches doivent lire les valeurs par le meme chemin que le tableau");
});

test("la bascule d octroi du panel Talvex suit la convention de sa voisine", () => {
  /* Elle vit a cote de SAAdminsAiSwitch, qui ecrit ses couleurs en dur. Les tokeniser
     seule produirait deux bascules differentes cote a cote dans la meme colonne. On
     assume donc l'exception, mais on verifie qu'elle reste LIMITEE a ce fichier et
     qu'elle emploie exactement les memes valeurs que sa voisine. */
  const mien = readFileSync("src/pages/superadmin/views/admins/SAAdminsCrmImmoSwitch.tsx", "utf8");
  const voisine = readFileSync("src/pages/superadmin/views/admins/SAAdminsAiSwitch.tsx", "utf8");
  for (const couleur of (mien.match(/#[0-9a-fA-F]{6}/g) ?? [])) {
    assert.ok(voisine.includes(couleur),
      "la bascule CRM Immo emploie " + couleur + ", que sa voisine n utilise pas : tokeniser plutot qu inventer");
  }
});
