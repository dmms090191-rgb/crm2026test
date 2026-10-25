// Le code source du projet ne doit plus partir dans le paquet public.
//   node --import tsx --test scripts/bundle/fuiteCodeSource.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync, readdirSync, existsSync, statSync,
  mkdirSync, writeFileSync, rmSync, mkdtempSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { construireStructure } from "../structureProjetPlugin";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * La page « Structure du CRM » listait les fichiers du projet par cinq import.meta.glob.
 * Seules les CLES etaient utilisees — jamais le contenu — mais un glob oblige Vite a EMETTRE
 * un module par fichier trouve, pour que les imports dynamiques restent resolvables.
 *
 * MESURE DU 25/10/2026, sur le meme commit, en ne changeant que ces cinq lignes :
 *
 *   dist/assets avec les globs : 1 190 fichiers, 12 Mo
 *   dist/assets sans les globs :   119 fichiers, 5,8 Mo
 *
 * Et dans le detail de ce qui partait :
 *   153 fichiers portant du SQL de migration  -> le SCHEMA COMPLET de la base
 *    31 fichiers portant du code Deno          -> la LOGIQUE SERVEUR des edge functions
 *    61 fichiers portant des releves de test   -> tout ce que le projet verifie
 *
 * Depuis la creation du projet Android, tout cela partait aussi dans l'APK installe sur les
 * telephones. Ce n'etait donc pas qu'une question de poids.
 *
 * ============== LE PIEGE QUI A FAILLI PASSER ==============
 *
 * La premiere version de ces releves n'interdisait que query:'?raw'. C'etait trop etroit, et
 * la mesure le prouve : le glob d'origine portant sur /src/** n'avait JAMAIS eu de ?raw, et
 * il produisait pourtant des chunks — dont un de 45 octets fabrique depuis un fichier de
 * declarations de types que l'application n'importe meme pas.
 *
 * Ce qui decide Rollup a emettre un module, c'est l'import() statiquement analysable que le
 * glob engendre, PAS le loader. ?raw ne change que le CONTENU du module emis — du texte brut
 * au lieu du code transpile — jamais le FAIT d'en emettre un. Un glob sans ?raw sur
 * /scripts/** rendrait donc 83 chunks de JavaScript transpile : la fuite serait deguisee,
 * pas refermee. D'ou la regle actuelle : AUCUN import.meta.glob sous src/, point.
 *
 * ============== CE QUE CES RELEVES VERIFIENT ==============
 *
 * L'INTENTION (plus de glob, un plugin branche), le COMPORTEMENT (le plugin ne lit jamais le
 * contenu d'un fichier — verifie en l'executant sur un faux projet porteur d'un marqueur), et
 * le PRODUIT (dist/ et les assets Android, quand ils existent). Les trois, parce qu'un releve
 * d'intention seul se contourne par un fichier voisin, et qu'un releve de produit seul ne dit
 * pas ou est la cause.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const MODULE = "src/pages/admin/views/documentation/structureCrmSync.ts";
const PLUGIN = "scripts/structureProjetPlugin.ts";
const JSON_CHEMINS = "src/generated/structureProjet.json";
const VITE = "vite.config.ts";

function fichiersSousSrc(): string[] {
  const out: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  parcourir("src");
  return out;
}

// ------------------------------------------- A. PLUS AUCUN GLOB NE RAMASSE LE CODE SOURCE

test("A1 structureCrmSync n'appelle plus aucun import.meta.glob", () => {
  assert.doesNotMatch(
    sansCommentaires(lire(MODULE)),
    /import\.meta\.glob/,
    "un import.meta.glob est revenu : le code source repartirait dans le paquet public",
  );
});

test("A2 AUCUN fichier de src/ n'utilise import.meta.glob, avec ou sans ?raw", () => {
  // La liste blanche est VIDE et doit le rester : aucun glob n'est justifie ici. Si un besoin
  // legitime apparaissait, l'ajouter explicitement ci-dessous obligerait a motiver
  // l'exception, au lieu de la laisser passer en silence.
  const AUTORISES: string[] = [];
  const fautifs: string[] = [];
  for (const p of fichiersSousSrc()) {
    if (AUTORISES.includes(p)) continue;
    const net = sansCommentaires(lire(p));
    for (const m of net.matchAll(/import\.meta\.glob\(([\s\S]{0,200}?)\)/g)) {
      fautifs.push(`${p} -> ${m[1].trim().slice(0, 70)}`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    `des globs ramassent des fichiers dans le paquet :\n${fautifs.join("\n")}`,
  );
});

// ------------------------------------------------ B. LE MECANISME DE REMPLACEMENT TIENT

test("B1 le plugin est branche dans la configuration Vite", () => {
  const net = sansCommentaires(lire(VITE));
  // L'import ET l'appel, separement : ne verifier que l'un laisserait passer un fichier ou
  // l'appel subsiste sans sa declaration, et reciproquement.
  assert.match(
    net,
    /import\s+structureProjetPlugin\s+from/,
    "le plugin n'est plus importe dans vite.config.ts",
  );
  assert.match(
    net,
    /plugins:\s*\[[^\]]*structureProjetPlugin\(\)/,
    "le plugin n'est plus dans la liste des plugins : le JSON ne serait plus regenere",
  );
});

test("B2 le plugin regenere la liste AU BUILD, pas seulement en developpement", () => {
  const net = sansCommentaires(lire(PLUGIN));
  assert.match(
    net,
    /buildStart\s*\(/,
    "sans buildStart, l'arborescence affichee serait celle du dernier passage en developpement",
  );
  assert.doesNotMatch(
    net,
    /apply:\s*['"]serve['"]/,
    "apply:'serve' empecherait le plugin de tourner au build",
  );
});

test("B3 le plugin ne divulgue AUCUN contenu de fichier — verifie en l'executant", () => {
  // Un releve de TEXTE sur readFileSync serait trompeur : il passerait sur
  // readFileSync(unFichierSource) des lors que le nom de variable contient le bon mot, et
  // rougirait sur un simple renommage. On fabrique donc un faux projet porteur d'un marqueur
  // et l'on verifie que le marqueur n'apparait nulle part dans le resultat.
  const MARQUEUR = "MARQUEUR-SECRET-QUI-NE-DOIT-PAS-SORTIR-7f3a9c";
  const racine = mkdtempSync(join(tmpdir(), "structure-"));
  try {
    for (const [dossier, fichier] of [
      ["src", "composant.tsx"],
      ["src/profond/encore", "module.ts"],
      ["scripts", "outil.ts"],
      ["supabase/functions/une", "index.ts"],
      ["supabase/migrations", "0001_init.sql"],
      ["supabase", "config.toml"],
    ]) {
      mkdirSync(join(racine, dossier), { recursive: true });
      writeFileSync(join(racine, dossier, fichier), `const x = "${MARQUEUR}";\n`);
    }

    const resultat = construireStructure(racine);
    const rendu = JSON.stringify(resultat);

    assert.ok(
      !rendu.includes(MARQUEUR),
      "le contenu d'un fichier s'est retrouve dans la liste des chemins",
    );
    // Et il a bien vu les fichiers : sinon l'absence du marqueur ne prouverait rien.
    assert.ok(resultat.src.includes("/src/composant.tsx"), "le plugin n'a pas vu src/");
    assert.ok(resultat.src.includes("/src/profond/encore/module.ts"), "le plugin n'est pas recursif");
    assert.ok(resultat.scripts.includes("/scripts/outil.ts"), "le plugin n'a pas vu scripts/");
    assert.ok(resultat.supabaseMigrations.includes("/supabase/migrations/0001_init.sql"));
    assert.deepEqual(
      resultat.supabaseRoot,
      ["/supabase/config.toml"],
      "la racine supabase doit rester a plat : un parcours recursif y ramasserait les migrations",
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("B4 le plugin rend le MEME ensemble qu'un parcours independant", () => {
  // C'est ce qui prouve qu'on a referme la fuite SANS changer ce que la page affiche :
  // les cinq motifs d'origine, reproduits ici autrement, doivent donner le meme ensemble.
  const attendu: Record<string, Set<string>> = {
    src: new Set(), supabaseFunctions: new Set(), supabaseMigrations: new Set(),
    supabaseRoot: new Set(), scripts: new Set(),
  };
  const ramasser = (cle: string, racine: string, exts: string[], recursif: boolean) => {
    const parcourir = (d: string) => {
      let entrees;
      try { entrees = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entrees) {
        if (e.name.startsWith(".")) continue;
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) { if (recursif && e.name !== "node_modules") parcourir(p); }
        else if (exts.some((x) => e.name.endsWith(x))) attendu[cle].add("/" + p);
      }
    };
    parcourir(racine);
  };
  ramasser("src", "src", [".ts", ".tsx", ".css", ".json"], true);
  ramasser("supabaseFunctions", "supabase/functions", [".ts"], true);
  ramasser("supabaseMigrations", "supabase/migrations", [".sql"], true);
  ramasser("supabaseRoot", "supabase", [".toml", ".sql"], false);
  ramasser("scripts", "scripts", [".ts", ".js"], true);

  const obtenu = construireStructure(process.cwd());
  for (const cle of Object.keys(attendu)) {
    assert.deepEqual(
      [...obtenu[cle]].sort(),
      [...attendu[cle]].sort(),
      `la liste « ${cle} » differe d'un parcours independant du disque`,
    );
  }
});

// ---------------------------------------------- C. LE JSON NE PORTE QUE DES CHEMINS REELS

const CLES = ["src", "supabaseFunctions", "supabaseMigrations", "supabaseRoot", "scripts"];
const RACINES: Record<string, string> = {
  src: "/src/",
  supabaseFunctions: "/supabase/functions/",
  supabaseMigrations: "/supabase/migrations/",
  supabaseRoot: "/supabase/",
  scripts: "/scripts/",
};

function listes(): Record<string, string[]> {
  assert.ok(existsSync(JSON_CHEMINS), `${JSON_CHEMINS} est absent : lancez un build`);
  return JSON.parse(lire(JSON_CHEMINS)) as Record<string, string[]>;
}

test("C1 les cinq listes existent et ne sont pas vides", () => {
  const j = listes();
  for (const cle of CLES) {
    assert.ok(Array.isArray(j[cle]), `la liste « ${cle} » a disparu du JSON`);
    assert.ok(j[cle].length > 0, `la liste « ${cle} » est vide : la page afficherait un arbre creux`);
  }
});

test("C2 chaque entree est un CHEMIN, jamais un contenu de fichier", () => {
  const j = listes();
  for (const cle of CLES) {
    for (const entree of j[cle]) {
      assert.equal(typeof entree, "string", `une entree de « ${cle} » n'est pas une chaine`);
      assert.match(
        entree,
        /^\/[A-Za-z0-9_./-]+$/,
        `« ${entree.slice(0, 60)} » n'est pas un chemin simple : du contenu a pu se glisser dans le JSON`,
      );
    }
  }
});

test("C3 la barre oblique de tete est conservee", () => {
  // syncStructure() depouille « /supabase/functions/ » pour compter les edge functions :
  // sans la barre de tete, ce depouillage echoue en silence et le compteur tombe a 1.
  const j = listes();
  for (const cle of CLES) {
    for (const entree of j[cle]) {
      assert.ok(entree.startsWith(RACINES[cle]), `« ${entree} » ne commence pas par ${RACINES[cle]}`);
    }
  }
});

test("C4 le JSON reste une liste de chemins, pas une archive du projet", () => {
  // Garde-fou de poids : 1 583 chemins pesent environ 98 Ko. Si ce fichier depassait le mega,
  // c'est que quelque chose d'autre que des chemins y serait entre.
  // Le POIDS seul ne suffit pas : 30 000 chemins ajoutes pesent encore moins d un mega,
  // et la mutation passait. On borne donc aussi le NOMBRE d entrees.
  const total = CLES.reduce((n, cle) => n + (listes()[cle] ?? []).length, 0);
  assert.ok(
    total < 10_000,
    `${total} entrees dans le JSON : ce n est plus un inventaire de chemins`,
  );
  const octets = statSync(JSON_CHEMINS).size;
  assert.ok(
    octets < 400_000,
    `${JSON_CHEMINS} pese ${octets} octets : il ne contient plus seulement des chemins`,
  );
});

test("C4bis aucun chemin fantome : tout ce qui est liste existe sur le disque", () => {
  // Ce releve PEUT rougir pour une raison benigne — un fichier supprime sans rebuild — et
  // c est assume : le JSON est COMMITE, donc un JSON perime fait afficher au site des
  // fichiers qui n existent plus. Le signal est vrai, et le message dit quoi faire.
  // Sans lui, un JSON corrompu passerait sans bruit : la mutation l a montre.
  const j = listes();
  const absents: string[] = [];
  for (const cle of CLES) {
    for (const entree of j[cle]) {
      if (!existsSync(entree.replace(/^\//, ""))) absents.push(entree);
    }
  }
  assert.deepEqual(
    absents.slice(0, 10),
    [],
    `${absents.length} chemin(s) liste(s) n existent plus. Un build regenerera la liste.`,
  );
});

test("C5 le JSON de chemins n'est pas exclu du depot", () => {
  // Il doit etre COMMITE, comme src/generated/auditSnapshot.json : sur un clone frais,
  // `npm run typecheck` ne lance pas Vite, donc personne ne le regenererait, et la
  // compilation echouerait sur un module introuvable.
  let ignore = false;
  try {
    execFileSync("git", ["check-ignore", "-q", JSON_CHEMINS], { stdio: "pipe" });
    ignore = true;
  } catch { /* code non nul = non ignore, ce qu'on veut */ }
  assert.equal(ignore, false, `${JSON_CHEMINS} est ignore par git : un clone frais ne compilerait pas`);
});

test("C6 aucun secret de signature n'est suivi par git", () => {
  // Le depot est PUBLIC. Une cle de signature suivie serait irreparable : il faudrait en
  // changer, et aucune mise a jour ne s'installerait plus par-dessus les versions publiees.
  const suivis = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter((f) => /\.(jks|keystore|p12|pfx)$/.test(f) || /(^|\/)key\.properties$/.test(f));
  assert.deepEqual(suivis, [], `des fichiers de cle sont suivis par git : ${suivis.join(", ")}`);
});

// --------------------------------------------- D. LE COMPTAGE DE LA PAGE RESTE POSSIBLE

test("D1 les edge functions restent denombrables", () => {
  // Reproduit exactement le calcul de syncStructure() : si la forme des chemins changeait,
  // ce compte tomberait a 1 sans que rien d'autre ne bronche.
  const j = listes();
  const familles = new Set(
    j.supabaseFunctions.map((p) => p.replace(/^\/supabase\/functions\//, "").split("/")[0]),
  );
  assert.ok(
    familles.size > 1,
    `une seule famille d'edge function denombree (${[...familles][0]}) : la forme des chemins a change`,
  );
  assert.ok(!familles.has(""), "une famille vide a ete denombree");
});

// ------------------------------------------- E. LE PRODUIT, PAS SEULEMENT L'INTENTION

/** Les deux paquets reellement distribues : le site, et ce qui part sur les telephones. */
const PAQUETS = [
  { nom: "dist (site et bureau Tauri)", dossier: "dist/assets" },
  { nom: "APK Android", dossier: "android/app/src/main/assets/public/assets" },
];

const SIGNATURES = [
  { quoi: "du SQL de migration", motif: /CREATE TABLE|ALTER TABLE|CREATE POLICY/ },
  { quoi: "du code Deno", motif: /Deno\.serve|Deno\.env\.get/ },
  { quoi: "un releve de test", motif: /["']node:test["']|["']node:assert/ },
];

for (const paquet of PAQUETS) {
  test(`E ${paquet.nom} : aucun code source distribue`, (t) => {
    if (!existsSync(paquet.dossier)) {
      // Saut BRUYANT, jamais silencieux : le releve n'a rien verifie, et il le dit.
      t.skip(`${paquet.dossier} est absent — RIEN n'a ete verifie ici. Lancez un build.`);
      return;
    }
    const fichiers = readdirSync(paquet.dossier).filter((f) => /\.(js|css|html)$/.test(f));
    const trouves: string[] = [];
    for (const f of fichiers) {
      if (/\.test-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(f)) trouves.push(`${f} est un releve de test`);
      if (/^20\d{12}_/.test(f)) trouves.push(`${f} est une migration SQL`);
      const contenu = lire(`${paquet.dossier}/${f}`);
      for (const s of SIGNATURES) {
        if (s.motif.test(contenu)) trouves.push(`${f} contient ${s.quoi}`);
      }
    }
    assert.deepEqual(
      trouves.slice(0, 12),
      [],
      `${trouves.length} fuite(s) dans ${paquet.dossier} :\n${trouves.slice(0, 12).join("\n")}`,
    );

    // Plafond de volume : 119 fichiers apres correction, 1 190 avant. Un seuil a 300 aurait
    // rougi sur l'ancien paquet, et laisse de la marge a la croissance normale.
    assert.ok(
      fichiers.length < 300,
      `${fichiers.length} fichiers dans ${paquet.dossier} : un glob a probablement repris`,
    );
  });
}
