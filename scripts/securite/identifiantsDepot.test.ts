// Aucun identifiant de compte reel ne doit revenir dans ce depot PUBLIC.
//   node --import tsx --test scripts/securite/identifiantsDepot.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le depot GitHub de Talvex est PUBLIC. Jusqu'au 25/10/2026, il publiait les adresses et les
 * CODES PIN de comptes REELS, ecrits comme valeurs de repli de variables d'environnement :
 *
 *   e2e/helpers/auth.ts                          4 couples adresse + PIN (les 4 roles)
 *   e2e/admin/info-admin.spec.ts                 adresse + PIN courant + PIN temporaire
 *   e2e/admin/add-lead-client-login-cleanup.spec.ts  adresse + PIN d'un compte client cree
 *   e2e/helpers/createTestAdmin.ts               le PIN donne aux comptes ADMIN crees
 *   PROJECT_ANALYSIS.md                          le rapport de securite les recopiait
 *
 * Une seule et meme valeur de PIN ouvrait les quatre roles, et cette valeur etait en outre
 * TRIVIALE — devinable en quelques essais, meme sans la fuite. Le fichier auth.ts etait suivi
 * depuis le 19 mai 2026 : cinq mois d'exposition.
 *
 * CE QUE CES RELEVES NE PEUVENT PAS FAIRE. Ils empechent le RETOUR du probleme ; ils ne
 * reparent pas le passe. Les valeurs restent lisibles dans l'historique des commits d'un
 * depot public, et aucune modification de fichier n'y change rien. Seule la REVOCATION —
 * changer le PIN des comptes concernes — ferme cette porte-la.
 *
 * LE MODELE A SUIVRE existait deja dans le depot, chez les tests plus recents :
 * e2e/crm-immo.spec.ts lit ses identifiants dans l'environnement SANS repli, et saute le test
 * quand ils manquent. C'est ce patron qui a ete etendu aux quatre fichiers ci-dessus.
 */

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * Les commentaires sont retires avant toute recherche. Sans cela, un releve qui interdit un
 * motif rougit des qu un commentaire le NOMME pour expliquer pourquoi il est interdit — le
 * piege s est deja produit deux fois dans ce depot, sur les regles de sauvegarde Android
 * puis ici meme.
 */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

function fichiersSuivis(filtre: RegExp): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 1e8 })
    .split(/\r?\n/)
    .filter((f) => f && filtre.test(f));
}

/** Un code a six chiffres entoure de guillemets, d'apostrophes ou d'accents graves. */
const CODE_LITTERAL = /['"`][0-9]{6}['"`]/g;

/** Une adresse chez un fournisseur grand public ou chez Talvex : donnee personnelle. */
const ADRESSE_REELLE = /[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo|talvex)\.[A-Za-z]{2,}/g;

// ----------------------------------------------------- A. LES TESTS DE BOUT EN BOUT

test("A1 aucun fichier e2e ne porte de code a six chiffres en dur", () => {
  const fautifs: string[] = [];
  for (const f of fichiersSuivis(/^e2e\/.*\.ts$/)) {
    const n = (lire(f).match(CODE_LITTERAL) ?? []).length;
    if (n > 0) fautifs.push(`${f} (${n})`);
  }
  assert.deepEqual(
    fautifs,
    [],
    `des codes PIN sont ecrits en dur dans un depot PUBLIC :\n${fautifs.join("\n")}`,
  );
});

test("A2 aucune variable E2E_ n'a de repli porteur d'une valeur", () => {
  // `process.env.X || ''` est sain : il signale l'absence. `process.env.X || 'valeur'`
  // publie la valeur, et c'est exactement la forme qui a fait fuiter les quatre comptes.
  const fautifs: string[] = [];
  for (const f of fichiersSuivis(/^e2e\/.*\.ts$/)) {
    for (const m of lire(f).matchAll(/process\.env\.(E2E_[A-Z_]+)\s*\|\|\s*'([^']+)'/g)) {
      fautifs.push(`${f} -> ${m[1]} a un repli en dur`);
    }
  }
  assert.deepEqual(fautifs, [], `des replis publient une valeur :\n${fautifs.join("\n")}`);
});

test("A3 les quatre fichiers corriges lisent bien l'environnement", () => {
  // Sans cela, « plus de valeur en dur » pourrait simplement vouloir dire « le fichier a ete
  // vide de sa substance » : on verifie que le mecanisme de remplacement est en place.
  const attendus: Array<[string, RegExp]> = [
    ["e2e/helpers/auth.ts", /process\.env\.E2E_SUPER_ADMIN_EMAIL/],
    ["e2e/admin/info-admin.spec.ts", /process\.env\.E2E_ADMIN_EMAIL/],
    ["e2e/admin/add-lead-client-login-cleanup.spec.ts", /process\.env\.E2E_LEAD_EMAIL/],
    ["e2e/helpers/createTestAdmin.ts", /pinAleatoire\(\)/],
  ];
  for (const [f, motif] of attendus) {
    assert.match(lire(f), motif, `${f} ne lit plus ses identifiants de la bonne source`);
  }
});

test("A4 l'absence d'identifiants fait SAUTER le test, elle ne le fait pas echouer", () => {
  // Un echec ferait chercher un bogue du produit la ou il n'y a qu'une variable manquante.
  const auth = lire("e2e/helpers/auth.ts");
  assert.match(auth, /test\.skip\(/, "auth.ts ne saute plus quand les identifiants manquent");
  for (const role of ["SuperAdmin", "Admin", "Client", "Vendor"]) {
    const bloc = auth.match(new RegExp(`connect${role}\\(page: Page\\) \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(bloc, `connect${role} est introuvable`);
    assert.match(
      bloc[1],
      /exigeIdentifiants\(/,
      `connect${role} ne verifie plus la presence des identifiants`,
    );
  }
});

test("A5 les comptes crees par les tests naissent avec un mot de passe imprevisible", () => {
  // e2e/admin/creation-admin.spec.ts cree un compte ADMIN et ne le supprime jamais. Tant que
  // c'est le cas, le moins que puisse faire le helper est de ne pas lui donner un mot de
  // passe publie. randomInt, et non Math.random : imprevisible, pas seulement varie.
  const helper = sansCommentaires(lire("e2e/helpers/pinAleatoire.ts"));
  assert.match(helper, /randomInt/, "le tirage n'utilise plus node:crypto");
  assert.doesNotMatch(helper, /Math\.random/, "Math.random ne convient pas pour un mot de passe");
  assert.match(lire("e2e/helpers/createTestAdmin.ts"), /pin: pinAleatoire\(\)/);
});

// ------------------------------------------------------------ B. LA DOCUMENTATION

test("B1 aucun document Markdown ne recopie d'identifiant", () => {
  // Le rapport de securite du projet decrivait la fuite... en la rejouant en clair, dans le
  // meme depot public. Decrire le TYPE d'un secret est utile ; en recopier la VALEUR annule
  // le benefice du rapport.
  const fautifs: string[] = [];
  for (const f of fichiersSuivis(/\.md$/)) {
    const s = lire(f);
    const codes = (s.match(CODE_LITTERAL) ?? []).length;
    const adresses = (s.match(ADRESSE_REELLE) ?? []).length;
    if (codes || adresses) fautifs.push(`${f} (${codes} code(s), ${adresses} adresse(s))`);
  }
  assert.deepEqual(fautifs, [], `des documents recopient des identifiants :\n${fautifs.join("\n")}`);
});

// --------------------------------------------------------- C. LES SECRETS DE SIGNATURE

test("C1 aucun fichier de cle n'est suivi par git", () => {
  const suivis = fichiersSuivis(/\.(jks|keystore|p12|pfx|mobileprovision|cer)$|(^|\/)key\.properties$/);
  assert.deepEqual(suivis, [], `des fichiers de cle sont suivis : ${suivis.join(", ")}`);
});

test("C2 aucun fichier d'environnement n'est suivi, hors exemple", () => {
  const suivis = fichiersSuivis(/(^|\/)\.env/).filter((f) => !/\.example$/.test(f));
  assert.deepEqual(suivis, [], `des fichiers .env sont suivis : ${suivis.join(", ")}`);
});

test("C3 .gitignore couvre les secrets des trois plateformes", () => {
  const lignes = lire(".gitignore").split(/\r?\n/).map((l) => l.trim());
  for (const motif of ["*.jks", "*.keystore", "key.properties", "android/local.properties"]) {
    assert.ok(lignes.includes(motif), `.gitignore ne couvre plus ${motif}`);
  }
});

// ------------------------------------------------------------- D. LE RESTE DU DEPOT

test("D1 aucun fichier source ne porte d'adresse personnelle nouvelle", () => {
  // Une liste d'exceptions EXPLICITE : ces occurrences ont ete examinees une par une le
  // 25/10/2026 et sont des donnees d'interface ou de test, pas des identifiants. Toute
  // NOUVELLE occurrence ailleurs fera rougir ce releve, et devra etre justifiee ici.
  const TOLERES = new Set([
    "e2e/boutique3d-isolation.spec.ts",
    "e2e/israel-haya.spec.ts",
    "scripts/runtime/quickEmailsLauncher.test.ts",
    "src/components/table/smartphonePreviewData.ts",
    "src/pages/superadmin/views/SAApiIaModal.tsx",
    "src/pages/superadmin/views/cerveau-ia/BrainOfficialResponsesModal.tsx",
    "src/pages/superadmin/views/cerveau-ia/SACerveauCards.tsx",
    "supabase/functions/send-push-notification/index.ts",
  ]);
  const nouveaux: string[] = [];
  for (const f of fichiersSuivis(/\.(ts|tsx|js|jsx)$/)) {
    if (TOLERES.has(f)) continue;
    const n = (lire(f).match(ADRESSE_REELLE) ?? []).length;
    if (n > 0) nouveaux.push(`${f} (${n})`);
  }
  assert.deepEqual(
    nouveaux,
    [],
    `des adresses personnelles sont apparues hors de la liste examinee :\n${nouveaux.join("\n")}`,
  );
});
