// LE garde-fou exige par David : les deux cloches ne se melangent dans AUCUN des deux sens.
//   node --test scripts/crm-immo/clocheIsolation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/*
 * << Ne melange JAMAIS les notifications CRM Immo avec la cloche generale. >>
 * << Et inversement : les notifications CRM Immo ne doivent JAMAIS augmenter le
 *    compteur de la cloche generale Talvex. Je veux un test automatise qui le prouve. >>
 *
 * POURQUOI UN TEST DE SOURCE ET NON UN TEST DE PARCOURS
 *
 * L'accident qu'on redoute est INVISIBLE a l'ecran : ajouter un dixieme terme a la somme
 * de TopBar ne change rien tant que ce terme vaut zero. Aucun test de parcours, aucune
 * capture d'ecran, aucun releve manuel ne le verrait. Et le jour ou il ne vaut plus zero,
 * le chiffre est faux chez toutes les Societes a la fois.
 *
 * Les neuf categories sont par ailleurs enumerees EN DUR dans QUATRE endroits
 * independants qui ne se surveillent pas :
 *   TopBar.tsx                  la somme
 *   AdminNotificationCards.tsx  l'union NotifCategory et le tableau CARDS
 *   useNotifCardOrder.ts        DEFAULT_KEYS
 *   AdminMobileBellMenu.tsx     defaultItems
 * L'isolation est donc acquise par CONSTRUCTION aujourd'hui — et rien ne la protege.
 * C'est ce test qui la protege.
 *
 * Il verifie DEUX choses, dans les deux sens :
 *   1. les ARITES : la cloche generale compte exactement neuf sources, pas dix ;
 *   2. les IMPORTS : aucun fichier des deux mondes ne connait l'autre.
 */

const lire = (p: string) => readFileSync(p, "utf8");

/*
 * Les fichiers du module CITENT volontairement les noms du systeme general pour expliquer
 * pourquoi ils ne s'en servent PAS. La regle porte sur ce qui s'execute, pas sur la prose
 * qui l'explique : on retire donc les commentaires avant de chercher un import interdit.
 */
const OUVRE_BLOC = "/" + "*";
const FERME_BLOC = "*" + "/";
function codeSeul(src: string): string {
  let sortie = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(OUVRE_BLOC, i)) {
      const fin = src.indexOf(FERME_BLOC, i + 2);
      i = fin === -1 ? src.length : fin + 2;
      continue;
    }
    if (src.startsWith("//", i)) {
      const fin = src.indexOf("\n", i);
      i = fin === -1 ? src.length : fin;
      continue;
    }
    sortie += src[i];
    i += 1;
  }
  return sortie;
}

/* Le monde de CRM Immo. */
const DOSSIER_MODULE = "src/pages/admin/views/crm-immo";
const FICHIERS_MODULE = [
  "src/pages/admin/views/CrmImmo.tsx",
  "src/pages/admin/dashboard/CrmImmoGate.tsx",
  "src/hooks/useCrmImmoAccess.ts",
  "src/lib/crmImmoAccess.ts",
  "src/lib/crmImmoAlertes.ts",
  "src/lib/crmImmoColonnes.ts",
  "src/lib/crmImmoRecherche.ts",
  "src/lib/crmImmoSidebar.ts",
  ...readdirSync(DOSSIER_MODULE).map(f => DOSSIER_MODULE + "/" + f),
];

/* Le monde des notifications generales. */
const FICHIERS_GENERAUX = [
  "src/pages/admin/TopBar.tsx",
  "src/pages/admin/components/topbar/AdminNotificationCards.tsx",
  "src/pages/admin/components/topbar/AdminNotificationsHub.tsx",
  "src/pages/admin/components/topbar/AdminMobileBellMenu.tsx",
  "src/hooks/useNotifCardOrder.ts",
  "src/components/notifications/hub/NotifHubShell.tsx",
];

/* Tout ce qui nomme le module, sous ses differentes orthographes. */
const MOTIF_IMMO = /crm[-_]?immo|crmImmo|CrmImmo|CRM_IMMO/i;

test("le retrait des commentaires ne vide pas les fichiers examines", () => {
  /* Garde-fou du garde-fou : si codeSeul avalait tout, la moitie des assertions de ce
     fichier passeraient sans rien verifier. */
  for (const f of [...FICHIERS_MODULE, ...FICHIERS_GENERAUX]) {
    const code = codeSeul(lire(f));
    assert.ok(code.trim().length > 40, f + " : le code examine est vide");
    assert.ok(code.includes("import") || code.includes("export"), f + " : plus aucune declaration");
  }
  /* Et il retire bien ce qu'il doit retirer. */
  const cloche = codeSeul(lire(DOSSIER_MODULE + "/CrmImmoCloche.tsx"));
  assert.ok(!cloche.includes("NotifHubShell"),
    "le commentaire qui CITE NotifHubShell doit avoir ete retire");
});

// ---------------------------------------------------------------------------
// SENS 1 — CRM Immo ne gonfle PAS la cloche generale
// ---------------------------------------------------------------------------

test("la somme de TopBar compte exactement NEUF sources, et aucune n est CRM Immo", () => {
  const src = lire("src/pages/admin/TopBar.tsx");
  const ligne = src.split("\n").find(l => l.includes("const totalNotifCount"));
  assert.ok(ligne, "la ligne `const totalNotifCount` n a pas ete trouvee : TopBar a change de forme");

  const droite = ligne!.slice(ligne!.indexOf("=") + 1).replace(/;$/, "");
  const termes = droite.split("+").map(s => s.trim()).filter(Boolean);
  assert.equal(termes.length, 9,
    "la cloche generale additionne " + termes.length + " sources au lieu de 9 : " + termes.join(" | "));
  for (const terme of termes) {
    assert.ok(!MOTIF_IMMO.test(terme), "un terme CRM Immo s est glisse dans la somme generale : " + terme);
  }
});

test("les CARDS du NotifHub sont NEUF, et aucune n est CRM Immo", () => {
  const src = lire("src/pages/admin/components/topbar/AdminNotificationCards.tsx");

  const debut = src.indexOf("export const CARDS");
  assert.ok(debut > 0, "le tableau CARDS n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("\n];", debut));
  const cles = [...bloc.matchAll(/^\s*\{\s*key:\s*'([^']+)'/gm)].map(m => m[1]);
  assert.equal(cles.length, 9, "CARDS porte " + cles.length + " entrees au lieu de 9 : " + cles.join(", "));
  for (const c of cles) assert.ok(!MOTIF_IMMO.test(c), "CARDS contient " + c);

  /* L'union de types doit suivre : une carte ajoutee sans sa cle ne compilerait pas,
     mais une CLE ajoutee a l'union sans carte passerait, et ouvrirait la porte. */
  const d2 = src.indexOf("export type NotifCategory");
  const union = src.slice(d2, src.indexOf(";", d2));
  const membres = [...union.matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.equal(membres.length, 9, "NotifCategory a " + membres.length + " membres au lieu de 9");
  for (const m of membres) assert.ok(!MOTIF_IMMO.test(m), "NotifCategory contient " + m);
  assert.deepEqual([...cles].sort(), [...membres].sort(), "CARDS et NotifCategory doivent lister les memes cles");
});

test("DEFAULT_KEYS reste a NEUF — une cle ajoutee la se figerait en localStorage", () => {
  /* Le piege particulier de cette liste : l'ordre est mis en cache dans localStorage.
     Une cle ajoutee par erreur SURVIVRAIT au correctif jusqu'a purge du cache de chaque
     navigateur. C'est la seule des quatre dont l'erreur ne se repare pas en deployant. */
  const src = lire("src/hooks/useNotifCardOrder.ts");
  const debut = src.indexOf("const DEFAULT_KEYS");
  assert.ok(debut > 0, "DEFAULT_KEYS n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("];", debut));
  const cles = [...bloc.matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.equal(cles.length, 9, "DEFAULT_KEYS porte " + cles.length + " cles au lieu de 9 : " + cles.join(", "));
  for (const c of cles) assert.ok(!MOTIF_IMMO.test(c), "DEFAULT_KEYS contient " + c);
});

test("la liste mobile de la cloche generale reste a NEUF", () => {
  const src = lire("src/pages/admin/components/topbar/AdminMobileBellMenu.tsx");
  const debut = src.indexOf("const defaultItems");
  assert.ok(debut > 0, "defaultItems n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("];", debut));
  const cles = [...bloc.matchAll(/\{\s*key:\s*'([^']+)'/g)].map(m => m[1]);
  assert.equal(cles.length, 9, "la liste mobile porte " + cles.length + " entrees au lieu de 9");
  for (const c of cles) assert.ok(!MOTIF_IMMO.test(c), "la liste mobile contient " + c);
});

test("AUCUN fichier des notifications generales ne connait CRM Immo", () => {
  /* C'est l'assertion qui attrape << [...CARDS, carteCrmImmo] >> — l'accident le plus
     naturel, parce qu'on croit reutiliser le design. Le reduce de NotifHubShell
     additionnerait les deux compteurs en un seul chiffre, sans erreur et sans
     difference visuelle. */
  for (const f of FICHIERS_GENERAUX) {
    const fautives = lire(f).split("\n")
      .map((l, i) => ({ n: i + 1, l }))
      .filter(x => MOTIF_IMMO.test(x.l))
      .map(x => "ligne " + x.n);
    assert.deepEqual(fautives, [], f + " mentionne CRM Immo : " + fautives.join(", "));
  }
});

// ---------------------------------------------------------------------------
// SENS 2 — la cloche generale ne nourrit PAS CRM Immo
// ---------------------------------------------------------------------------

test("AUCUN fichier de CRM Immo n importe le systeme de notifications generales", () => {
  const INTERDITS = [
    "AdminNotificationCards", "AdminNotificationsHub", "AdminMobileBellMenu",
    "NotifHubShell", "useNotifCardOrder", "useHiddenNotifCards",
    "useUnreadClientMessages", "useUnreadVendorMessages", "useUnreadFromSuperAdmin",
    "useAgendaNotifications", "useAgendaEquipeNotifications", "useAdminProposalNotifs",
  ];
  for (const f of FICHIERS_MODULE) {
    const code = codeSeul(lire(f));
    for (const interdit of INTERDITS) {
      assert.ok(!code.includes(interdit),
        f + " fait reference a " + interdit + " dans son CODE : la cloche du module doit rester autonome");
    }
    /* La verification la plus directe : aucune ligne `import` ne doit designer le
       systeme general. Elle attrape meme un nom absent de la liste ci-dessus. */
    for (const l of code.split("\n").filter(x => /^\s*import\b/.test(x))) {
      assert.ok(!/notif|Notif|topbar/.test(l), f + " importe le systeme general : " + l.trim());
    }
  }
});

test("la cloche du module ne lit QUE ses deux tables", () => {
  const src = lire(DOSSIER_MODULE + "/useCrmImmoAlertes.ts");
  const tables = [...src.matchAll(/\.from\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tables)].sort(), ["crm_immo_dossiers", "crm_immo_etats"],
    "la cloche interroge " + tables.join(", ") + " : elle ne doit lire que ses propres tables");
});

test("V1 sans Realtime : aucun canal dans tout le module", () => {
  /* David : << V1 sans Realtime >>. Un canal ne croiserait rien, mais il n'en veut pas,
     et les quatre tables ne sont de toute facon dans aucune publication. */
  for (const f of FICHIERS_MODULE) {
    const code = codeSeul(lire(f));
    assert.ok(!code.includes(".channel("), f + " ouvre un canal Realtime");
    assert.ok(!code.includes("postgres_changes"), f + " ecoute postgres_changes");
  }
});

test("la cloche du module vit DANS le module, pas dans les dossiers partages", () => {
  /* Un fichier de cloche range dans components/topbar/ ou components/notifications/
     serait la premiere etape vers la fusion : on le trouverait en cherchant << cloche >>
     et on le brancherait sur le hub par reflexe. */
  for (const dossier of ["src/pages/admin/components/topbar", "src/components/notifications"]) {
    const fichiers = readdirSync(dossier, { recursive: true, encoding: "utf8" }) as string[];
    const fautifs = fichiers.filter(f => MOTIF_IMMO.test(f));
    assert.deepEqual(fautifs, [], dossier + " contient " + fautifs.join(", "));
  }
  const chezSoi = readdirSync(DOSSIER_MODULE);
  assert.ok(chezSoi.includes("CrmImmoCloche.tsx"), "CrmImmoCloche.tsx doit vivre dans le dossier du module");
});

test("le badge du module ne sort nulle part : AdminDashboard ne lui prend aucun compteur", () => {
  /* Le chemin par lequel un chiffre pourrait remonter : la vue le passerait a
     AdminDashboard, qui le passerait a TopBar. On verifie que la vue n'expose rien. */
  const vue = codeSeul(lire("src/pages/admin/views/CrmImmo.tsx"));
  assert.ok(!/onBadge|onCount|onNotif/i.test(vue), "la vue CRM Immo expose un compteur vers l exterieur");

  /* Le dashboard ne connait du module que son DROIT, jamais ses alertes. */
  const dashboard = codeSeul(lire("src/pages/admin/AdminDashboard.tsx"));
  for (const l of dashboard.split("\n").filter(x => MOTIF_IMMO.test(x))) {
    assert.ok(/[Aa]cces|useCrmImmoAccess/.test(l),
      "AdminDashboard ne doit connaitre que le droit du module : " + l.trim());
    assert.ok(!/alerte|badge|notif|compte/i.test(l),
      "AdminDashboard touche aux alertes du module : " + l.trim());
  }
});
