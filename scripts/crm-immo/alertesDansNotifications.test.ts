// Les alertes CRM Immo DANS les notifications generales : la nouvelle regle, et ce qui
// reste vrai de l'ancienne.
//   node --test scripts/crm-immo/alertesDansNotifications.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/*
 * ================= LA DECISION A CHANGE, LE 20 OCTOBRE 2026 =================
 *
 * ANCIENNE REGLE, desormais ANNULEE :
 *   << CRM Immo ne doit jamais apparaitre dans la cloche generale. >>
 *
 * NOUVELLE REGLE :
 *   les alertes CRM Immo sont la DIXIEME categorie du hub Notifications general, et
 *   elles n'y apparaissent QUE pour les Societes qui possedent reellement le module.
 *
 * ---------- POURQUOI CE FICHIER EST LE MEME FICHIER ----------
 *
 * Il s'appelait clocheIsolation.test.ts et prouvait exactement l'inverse. Il n'a pas ete
 * supprime, et c'est deliberе : le RISQUE qu'il surveille n'a pas change, seul son signe
 * a change. Les categories sont enumerees EN DUR dans QUATRE endroits independants qui ne
 * se surveillent pas :
 *
 *   TopBar.tsx                  la somme de la pastille
 *   AdminNotificationCards.tsx  l'union NotifCategory et le tableau CARDS
 *   useNotifCardOrder.ts        DEFAULT_KEYS
 *   AdminMobileBellMenu.tsx     defaultItems
 *
 * Hier l'accident redoute etait qu'un dixieme terme ENTRE dans la somme. Aujourd'hui c'est
 * qu'il en SORTE, ou qu'il y entre SANS SON CONDITIONNEMENT AU DROIT — et dans les deux
 * cas l'erreur est invisible a l'ecran : un terme qui vaut zero ne change aucun chiffre,
 * et une Societe qui n'a pas le module ne verra rien tant qu'aucune autre n'a d'alerte.
 * Le jour ou le chiffre bouge, il est faux partout a la fois.
 *
 * Supprimer ce fichier aurait donc rendu la nouvelle regle AUSSI fragile que l'ancienne
 * etait protegee. Il a ete retourne, pas jete. Et la section G casse explicitement si
 * quelqu'un restaure l'ancienne regle.
 */

const lire = (p: string) => readFileSync(p, "utf8");

/*
 * Les fichiers des deux mondes CITENT volontairement les noms de l'autre pour expliquer
 * ce qu'ils en font, ou ne font pas. Une regle porte sur ce qui s'execute, pas sur la
 * prose qui l'explique : on retire donc les commentaires avant de chercher.
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
  "src/contexts/CrmImmoAlertesContext.tsx",
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
  "src/pages/admin/components/topbar/AdminNotificationDetail.tsx",
  "src/pages/admin/components/topbar/AdminMobileBellMenu.tsx",
  "src/hooks/useNotifCardOrder.ts",
  "src/components/notifications/hub/NotifHubCards.tsx",
  "src/components/notifications/hub/NotifHubShell.tsx",
];

/* Tout ce qui nomme le module, sous ses differentes orthographes. */
const MOTIF_IMMO = /crm[-_]?immo|crmImmo|CrmImmo|CRM_IMMO/i;

/* Les NEUF categories d'origine. Elles doivent toutes survivre a l'arrivee de la dixieme. */
const NEUF = [
  "client", "vendeur", "super-admin", "agenda", "equipe",
  "propositions", "rdv", "decalages", "demandes-decalage",
];
const DIX = [...NEUF, "crm-immo"];

test("garde du garde — le retrait des commentaires ne vide pas les fichiers examines", () => {
  /* Si codeSeul avalait tout, la moitie des assertions de ce fichier passeraient sans
     rien verifier. */
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

// ===========================================================================
// A — LA DIXIEME CATEGORIE EXISTE, DANS LES QUATRE LISTES
// ===========================================================================

test("A1 — la somme de TopBar compte DIX sources, et la dixieme est CONDITIONNEE au droit", () => {
  const src = lire("src/pages/admin/TopBar.tsx");
  const ligne = src.split("\n").find(l => l.includes("const totalNotifCount"));
  assert.ok(ligne, "la ligne `const totalNotifCount` n a pas ete trouvee : TopBar a change de forme");

  const droite = ligne!.slice(ligne!.indexOf("=") + 1).replace(/;$/, "");
  const termes = droite.split("+").map(s => s.trim()).filter(Boolean);
  assert.equal(termes.length, 10,
    "la cloche generale additionne " + termes.length + " sources au lieu de 10 : " + termes.join(" | "));

  const immo = termes.filter(t => MOTIF_IMMO.test(t));
  assert.equal(immo.length, 1,
    "il doit y avoir EXACTEMENT un terme CRM Immo, pas " + immo.length + " : " + immo.join(" | "));

  /*
   * LE point de cette assertion. Un terme inconditionnel ferait entrer le compteur du
   * module dans la pastille de TOUTES les Societes. Il vaudrait zero chez celles qui
   * n'ont pas le module — donc rien ne se verrait — jusqu'au jour ou un bug de droit le
   * rendrait non nul. Le conditionnement n'est pas une optimisation, c'est la regle.
   */
  assert.match(immo[0], /crmImmoActif\s*\?/,
    "le terme CRM Immo n est pas conditionne au droit : " + immo[0]);
});

test("A2 — CARDS porte DIX cartes dont crm-immo, et NotifCategory suit exactement", () => {
  const src = lire("src/pages/admin/components/topbar/AdminNotificationCards.tsx");

  const debut = src.indexOf("export const CARDS");
  assert.ok(debut > 0, "le tableau CARDS n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("\n];", debut));
  const cles = [...bloc.matchAll(/^\s*\{\s*key:\s*'([^']+)'/gm)].map(m => m[1]);
  assert.deepEqual([...cles].sort(), [...DIX].sort(),
    "CARDS ne porte pas les dix categories attendues : " + cles.join(", "));

  /* L'union de types doit suivre : une carte ajoutee sans sa cle ne compilerait pas,
     mais une CLE ajoutee a l'union sans carte passerait, et ouvrirait la porte. */
  const d2 = src.indexOf("export type NotifCategory");
  const union = src.slice(d2, src.indexOf(";", d2));
  const membres = [...union.matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual([...membres].sort(), [...DIX].sort(),
    "NotifCategory ne porte pas les dix categories attendues : " + membres.join(", "));
});

test("A3 — DEFAULT_KEYS porte DIX cles dont crm-immo", () => {
  /* Le piege particulier de cette liste : l'ordre est mis en cache dans localStorage.
     Une cle RETIREE d'ici disparaitrait de l'ordre, mais l'ancien ordre cache garderait
     la carte en place chez les utilisateurs existants — et chez les nouveaux elle se
     rangerait en fin de liste. Les deux populations ne verraient pas la meme chose. */
  const src = lire("src/hooks/useNotifCardOrder.ts");
  const debut = src.indexOf("const DEFAULT_KEYS");
  assert.ok(debut > 0, "DEFAULT_KEYS n a pas ete trouve");
  const bloc = codeSeul(src.slice(debut, src.indexOf("];", debut)));
  const cles = [...bloc.matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual([...cles].sort(), [...DIX].sort(),
    "DEFAULT_KEYS ne porte pas les dix cles attendues : " + cles.join(", "));
});

test("A4 — la liste mobile n ajoute CRM Immo que SOUS CONDITION du droit", () => {
  const src = lire("src/pages/admin/components/topbar/AdminMobileBellMenu.tsx");
  const debut = src.indexOf("const defaultItems");
  assert.ok(debut > 0, "defaultItems n a pas ete trouve");
  const bloc = src.slice(debut, src.indexOf("];", debut));
  const cles = [...bloc.matchAll(/\{\s*key:\s*'([^']+)'/g)].map(m => m[1]);

  /* Ici la dixieme n'est pas DANS le litteral : elle est poussee apres, sous condition.
     C'est la forme la plus honnete — la liste de base reste celle de toutes les
     Societes, et l'ajout est visiblement conditionnel. */
  assert.deepEqual([...cles].sort(), [...NEUF].sort(),
    "le litteral defaultItems doit porter les NEUF categories de base : " + cles.join(", "));

  const apres = codeSeul(src.slice(src.indexOf("];", debut)));
  assert.match(apres, /if\s*\(\s*crmImmoActif\s*\)[\s\S]{0,300}?defaultItems\.push\(\s*\{\s*key:\s*'crm-immo'/,
    "CRM Immo n est pas ajoute a la liste mobile sous condition du droit");
});

test("A5 — les NEUF categories d origine sont intactes dans les quatre listes", () => {
  /* L'arrivee d'une dixieme ne doit pas en deplacer, renommer ni perdre une seule.
     On le verifie nommement, liste par liste. */
  const cards = lire("src/pages/admin/components/topbar/AdminNotificationCards.tsx");
  const ordre = codeSeul(lire("src/hooks/useNotifCardOrder.ts"));
  const mobile = lire("src/pages/admin/components/topbar/AdminMobileBellMenu.tsx");
  const topbar = lire("src/pages/admin/TopBar.tsx");

  for (const cle of NEUF) {
    assert.ok(cards.includes("'" + cle + "'"), "CARDS / NotifCategory a perdu " + cle);
    assert.ok(ordre.includes("'" + cle + "'"), "DEFAULT_KEYS a perdu " + cle);
    assert.ok(mobile.includes("'" + cle + "'"), "la liste mobile a perdu " + cle);
  }

  /* Et les neuf compteurs d'origine sont toujours additionnes. */
  const ligne = topbar.split("\n").find(l => l.includes("const totalNotifCount"))!;
  for (const compteur of [
    "unreadClientCount", "unreadVendorCount", "unreadSuperAdminCount",
    "agendaPersoCount", "agendaEquipeCount", "proposalsCount",
    "confirmedCount", "rescheduleCount", "rescheduleRequestCount",
  ]) {
    assert.ok(ligne.includes(compteur), "la somme generale a perdu " + compteur);
  }
});

// ===========================================================================
// B — LA CARTE N EXISTE QUE SI LA SOCIETE POSSEDE LE MODULE
// ===========================================================================

test("B1 — la carte CRM Immo n est pas EMISE sans le droit, et le droit est strict", () => {
  const code = codeSeul(lire("src/pages/admin/components/topbar/AdminNotificationsHub.tsx"));

  /*
   * << Pas emise >> et non << masquee >> : une carte masquee reste dans la liste, garde sa
   * place dans l'ordre enregistre, et surtout l'oeil du mode edition permettrait de la
   * rendre visible. Le filtre doit donc s'appliquer AVANT que la carte n'existe.
   */
  const i = code.indexOf("const cards");
  assert.ok(i > 0, "la construction des cartes du hub n a pas ete trouvee");
  const bloc = code.slice(i, i + 600);

  const posFiltre = bloc.indexOf(".filter(");
  const posMap = bloc.indexOf(".map(");
  assert.ok(posFiltre > 0, "le hub ne filtre plus les cartes : CRM Immo serait emise pour tous");
  assert.ok(posFiltre < posMap,
    "le filtre du droit doit passer AVANT le .map : sinon la carte est construite puis retiree");
  assert.match(bloc, /crm-immo/, "le filtre ne nomme pas crm-immo");

  /* `=== true` et non une verite approximative : `undefined` doit fermer, pas ouvrir. */
  assert.match(bloc, /crmImmoActif\s*===\s*true/,
    "le droit n est pas teste strictement : une prop absente ouvrirait la carte");
});

test("B2 — UNE SEULE verite du droit : aucun fichier general ne relit la table d acces", () => {
  /*
   * Deux verites du droit, c'est une panne intermittente : la carte apparaitrait selon
   * laquelle des deux a repondu la premiere. Le droit est calcule une fois, dans
   * AdminDashboard, et descend en prop.
   */
  for (const f of FICHIERS_GENERAUX) {
    const code = codeSeul(lire(f));
    for (const interdit of ["useCrmImmoAccess", "crm_immo_acces", "has_crm_immo_access", "peutOuvrirCrmImmo"]) {
      assert.ok(!code.includes(interdit),
        f + " recalcule le droit du module (" + interdit + ") : il doit le recevoir en prop");
    }
  }
});

// ===========================================================================
// C — UNE SEULE SOURCE, UN SEUL CALCUL, UN SEUL COUT RESEAU
// ===========================================================================

/* Tous les fichiers de src/, pour les comptages d'unicite. */
function tousLesFichiersSrc(): string[] {
  return (readdirSync("src", { recursive: true, encoding: "utf8" }) as string[])
    .filter(f => /\.(ts|tsx)$/.test(f))
    .map(f => "src/" + f.split("\\").join("/"));
}

test("C1 — useCrmImmoAlertes est appele EXACTEMENT UNE FOIS dans tout src/", () => {
  /*
   * David : << Je ne veux pas : deux hooks reseau separes, deux calculs de badge, deux
   * sources de verite. >> Deux appels du hook, c'est deux etats React independants : le
   * hub et la page divergeraient des qu'une alerte serait traitee d'un cote, et personne
   * ne saurait lequel croire. Ils paieraient aussi le reseau deux fois.
   */
  const appels: string[] = [];
  for (const f of tousLesFichiersSrc()) {
    if (f.endsWith("useCrmImmoAlertes.ts")) continue; // sa propre definition
    const code = codeSeul(lire(f));
    for (const [n, l] of code.split("\n").entries()) {
      if (/useCrmImmoAlertes\s*\(/.test(l)) appels.push(f + ":" + (n + 1));
    }
  }
  assert.equal(appels.length, 1,
    "le hook des alertes est appele " + appels.length + " fois : " + appels.join(", "));
  assert.match(appels[0], /AdminDashboard\.tsx/,
    "l appel unique doit vivre dans AdminDashboard, au-dessus des deux surfaces : " + appels[0]);
});

test("C2 — le badge est calcule EXACTEMENT UNE FOIS", () => {
  const appels: string[] = [];
  for (const f of tousLesFichiersSrc()) {
    if (f.endsWith("crmImmoAlertes.ts")) continue; // sa propre definition
    const code = codeSeul(lire(f));
    for (const [n, l] of code.split("\n").entries()) {
      if (/compteBadge\s*\(/.test(l)) appels.push(f + ":" + (n + 1));
    }
  }
  assert.equal(appels.length, 1,
    "compteBadge est appele " + appels.length + " fois : " + appels.join(", "));
  assert.match(appels[0], /useCrmImmoAlertes\.ts/,
    "le badge doit etre calcule dans le hook, pas chez un consommateur : " + appels[0]);
});

test("C3 — les deux tables du module ne sont lues QUE par le hook", () => {
  const lecteurs: string[] = [];
  for (const f of tousLesFichiersSrc()) {
    const code = codeSeul(lire(f));
    if (/\.from\('crm_immo_(dossiers|etats)'\)/.test(code)) lecteurs.push(f);
  }
  /* La vue du module lit aussi les dossiers pour son tableau : c'est legitime, ce n'est
     pas le chemin des alertes. On exige seulement qu'aucun fichier GENERAL ne les lise. */
  for (const f of lecteurs) {
    assert.ok(!FICHIERS_GENERAUX.includes(f),
      f + " interroge les tables du module : le hub doit recevoir les alertes en prop");
  }
  assert.ok(lecteurs.some(f => f.endsWith("useCrmImmoAlertes.ts")),
    "le hook des alertes ne lit plus ses tables");
});

test("C4 — le hub recoit le badge du hook, et les ACTIVES, pas la liste filtree par la page", () => {
  const dash = codeSeul(lire("src/pages/admin/AdminDashboard.tsx"));

  assert.match(dash, /crmImmoCount=\{alertesImmo\.badge\}/,
    "le compteur du hub n est plus celui du hook : deuxieme calcul de badge");

  /*
   * `alertes` suit le selecteur Actives / Traitees / Toutes de la PAGE du module. Le hub
   * n'a pas ce selecteur : s'il recevait `alertes`, choisir << Traitees >> sur la page
   * changerait la liste du hub, qui montrerait des echeances deja traitees pendant que sa
   * pastille, elle, compte les actives. Liste et chiffre se contrediraient.
   */
  assert.match(dash, /crmImmoEntries=\{alertesImmo\.actives\}/,
    "le hub ne recoit pas les alertes ACTIVES");
  assert.ok(!/crmImmoEntries=\{alertesImmo\.alertes\}/.test(dash),
    "le hub recevrait la liste filtree par le selecteur de la page : sa liste et sa pastille se contrediraient");
});

test("C5 — la page du module lit la source par le contexte, elle ne rappelle pas le hook", () => {
  const vue = codeSeul(lire("src/pages/admin/views/CrmImmo.tsx"));
  assert.ok(vue.includes("useAlertesImmoPartagees"),
    "la vue du module ne lit pas la source partagee");
  assert.ok(!/useCrmImmoAlertes\s*\(/.test(vue),
    "la vue du module rappelle le hook : seconde source de verite");
});

// ===========================================================================
// D — UNE ALERTE NE PEUT PAS APPARAITRE DEUX FOIS
// ===========================================================================

test("D1 — la cle d une ligne du hub reprend la cle d unicite de la BASE", () => {
  const detail = lire("src/pages/admin/components/topbar/AdminNotificationDetail.tsx");

  /* Une cle de rendu qui ne serait pas unique ferait apparaitre la meme echeance deux
     fois, ou en ferait disparaitre une — React garderait l'une et jetterait l'autre. */
  assert.match(detail, /key=\{`\$\{a\.dossier_id\}\|\$\{a\.genre\}\|\$\{a\.periode\}`\}/,
    "la cle d une ligne CRM Immo n est pas (dossier_id, genre, periode)");

  /*
   * Et elle doit reprendre LA MEME cle que la contrainte d'unicite de la base, sinon le
   * rendu pourrait distinguer deux lignes que la base considere identiques, ou l'inverse.
   * On relit la migration pour ne pas se contenter de s'en souvenir.
   */
  const migration = lire("supabase/migrations/20261019221621_scope_crm_immo_etats_unique_to_company.sql");

  /*
   * La migration CITE l'ancienne contrainte — dans son expose des motifs, et dans sa
   * procedure de rollback. Chercher le premier << UNIQUE ( >> du fichier rend donc
   * l'ANCIENNE cle, celle qui portait l'oracle de contenu. On ne garde que le DDL.
   */
  const ddl = codeSeul(migration).split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
  assert.ok(!/ROLLBACK/.test(ddl), "le depouillement des commentaires SQL a laisse passer le rollback");

  const m = ddl.match(/ADD\s+CONSTRAINT\s+crm_immo_etats_unique_par_echeance\s+UNIQUE\s*\(([^)]+)\)/i);
  assert.ok(m, "la contrainte d unicite n a pas ete trouvee dans le DDL de la migration");
  const colonnes = m![1].split(",").map(s => s.trim());
  assert.deepEqual(colonnes, ["company_id", "dossier_id", "genre", "periode"],
    "la contrainte d unicite a change de colonnes : " + colonnes.join(", "));
  /* company_id est implicite dans le hub : une seule Societe y est affichee a la fois. */
});

// ===========================================================================
// E — LE CLIC OUVRE LE BON DOSSIER
// ===========================================================================

test("E1 — cliquer une alerte du hub ouvre LE dossier concerne, dans la vue du module", () => {
  /*
   * Le 20 octobre, ce contrat a ete RENFORCE : les deux cloches transmettent l ALERTE
   * entiere, et non plus seulement son dossier_id.
   *
   * Pourquoi : un meme dossier peut porter DEUX alertes en meme temps — une fin de
   * contrat et un loyer. Avec le seul dossier_id, le gestionnaire ne pouvait designer
   * aucune des deux, donc il ne pouvait pas marquer lue CELLE qu on venait d ouvrir. Et
   * CRM Immo etait de ce fait la SEULE des dix categories a ne pas marquer lu au clic :
   * la notification restait neuve apres avoir ete ouverte, et le compteur ne baissait pas.
   *
   * Le couple (dossier, genre, periode) est ce qui identifie une alerte, en base comme
   * dans l historique des notifications.
   */
  for (const f of ["src/pages/admin/components/topbar/AdminNotificationDetail.tsx",
                   "src/pages/admin/components/topbar/AdminMobileBellMenu.tsx"]) {
    const src = codeSeul(lire(f));
    assert.match(src, /onCrmImmoEntryClick\?\.\(\s*a\s*\)/,
      f + " : la ligne ne transmet pas l alerte entiere");
    assert.doesNotMatch(src, /onCrmImmoEntryClick\?\.\(\s*a\.dossier_id\s*\)/,
      f + " : la ligne ne transmet encore que le dossier_id");
  }

  const dash = codeSeul(lire("src/pages/admin/AdminDashboard.tsx"));
  const i = dash.indexOf("onCrmImmoEntryClick");
  assert.ok(i > 0, "AdminDashboard ne branche pas le clic des alertes");
  /* Le gestionnaire tient desormais sur plusieurs lignes : on prend le BLOC, pas la ligne. */
  const bloc = dash.slice(i, i + 400);

  assert.match(bloc, /\(\s*alerte\s*\)/, "le gestionnaire ne recoit pas l alerte");
  /* Trois effets, indissociables : marquer lue, memoriser QUEL dossier, basculer sur la
     vue. Sans le premier le compteur ne baisse pas ; sans l un des deux autres, on ouvre
     la bonne page sur le mauvais dossier, ou l inverse. */
  assert.match(bloc, /marquerLue\(\s*alerte\s*\)/, "le clic ne marque pas l alerte lue");
  assert.match(bloc, /setDossierImmoAOuvrir\(\s*alerte\.dossier_id\s*\)/,
    "le dossier a ouvrir n est pas memorise");
  assert.match(bloc, /setActiveView\('crm-immo'\)/, "le clic ne bascule pas sur la vue du module");
  /* Marquer lu n est pas traiter : seul un geste explicite dans le module traite. */
  assert.doesNotMatch(bloc, /marquerTraitee/, "le clic marque TRAITEE, ce qu il ne doit pas faire");
});

// ===========================================================================
// F — CE QUI RESTE VRAI DE L ANCIENNE REGLE
// ===========================================================================
//
// Le sens 2 n'a PAS change : le general descend vers le module, jamais l'inverse. Le
// module ne lit rien des notifications generales, n'ouvre aucun canal, et sa cloche
// locale — que David veut garder — reste chez elle.

test("F1 — aucun fichier de CRM Immo n importe le systeme de notifications generales", () => {
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
        f + " fait reference a " + interdit + " dans son CODE : le module reste autonome");
    }
  }
});

test("F2 — la cloche du module ne lit QUE les tables de CRM Immo", () => {
  /*
   * L'isolement du module : sa cloche ne doit pas aller chercher ailleurs. Elle lisait
   * deux tables ; elle en lit TROIS depuis le 22 octobre 2026.
   *
   * crm_immo_loyers a rejoint la liste pour une seule raison, et c'est une regle posee
   * par David : << loyer encaisse = ne doit plus rester comme loyer actif a encaisser >>.
   * Sans cette lecture, la cloche reclamerait un loyer deja paye, et contredirait
   * l'onglet Echeancier — exactement ce qu'on cherche a eviter.
   *
   * Les contrats, eux, ne sont PAS lus : les trois colonnes du dossier sont deja le
   * reflet de la periode en cours, tenu par declencheur. Les relire serait une seconde
   * source pour la meme verite.
   */
  const src = lire(DOSSIER_MODULE + "/useCrmImmoAlertes.ts");
  const tables = [...src.matchAll(/\.from\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tables)].sort(),
    ["crm_immo_dossiers", "crm_immo_etats", "crm_immo_loyers"],
    "la cloche interroge " + tables.join(", ") + " : elle ne doit lire que ses propres tables");

  /* Et seuls les encaissements ACTIFS comptent : une annulation rend l'echeance due. */
  assert.match(src, /\.is\('annule_le', null\)/,
    "la cloche compterait les encaissements ANNULES comme encaisses");
});

test("F3 — V1 sans Realtime : aucun canal dans tout le module", () => {
  /* David : << V1 sans Realtime >>. Les quatre tables ne sont de toute facon dans aucune
     publication, mais l'absence de canal doit rester verifiee et non supposee. */
  for (const f of FICHIERS_MODULE) {
    const code = codeSeul(lire(f));
    assert.ok(!code.includes(".channel("), f + " ouvre un canal Realtime");
    assert.ok(!code.includes("postgres_changes"), f + " ecoute postgres_changes");
  }
});

test("F4 — la cloche locale du module vit DANS le module", () => {
  /*
   * Elle est maintenant REDONDANTE avec le hub general — et c'est voulu : << JE VEUX LA
   * GARDER >>. Elle a ses filtres, ses actions lire / traiter, son historique. Mais son
   * fichier doit rester chez lui : range dans components/topbar/, on le brancherait sur
   * le hub par reflexe, et on se retrouverait avec deux rendus du meme etat.
   */
  for (const dossier of ["src/pages/admin/components/topbar", "src/components/notifications"]) {
    const fichiers = readdirSync(dossier, { recursive: true, encoding: "utf8" }) as string[];
    const fautifs = fichiers.filter(f => MOTIF_IMMO.test(f));
    assert.deepEqual(fautifs, [], dossier + " contient un FICHIER du module : " + fautifs.join(", "));
  }
  const chezSoi = readdirSync(DOSSIER_MODULE);
  assert.ok(chezSoi.includes("CrmImmoCloche.tsx"), "CrmImmoCloche.tsx doit vivre dans le dossier du module");
});

// ===========================================================================
// G — LE TEST QUI CASSE SI QUELQU UN RESTAURE L ANCIENNE REGLE
// ===========================================================================

/*
 * La signature de l'ancienne regle. Chacune de ces phrases a REELLEMENT existe dans le
 * depot, et chacune AFFIRME le cloisonnement. Les retrouver, c'est retrouver la regle.
 *
 * On cherche ici dans le texte BRUT, commentaires compris — contrairement au reste de ce
 * fichier. C'est voulu : une regle enoncee en prose est une regle. Le prochain lecteur
 * qui tombe sur << aucun chiffre ne peut remonter >> dans un commentaire y croira, et
 * retirera CRM Immo du hub pour se conformer a ce qu'il lit.
 */
const SIGNATURES_ANCIENNE_REGLE: Array<{ motif: RegExp; ou: string }> = [
  { motif: /clocheIsolation/, ou: "le nom de l ancien fichier de garde" },
  { motif: /NI TopBar/, ou: "l en-tete du hook : << elle ne touche NI TopBar >>" },
  { motif: /aucun chiffre ne peut remonter/i, ou: "le commentaire du test e2e" },
  { motif: /aucun chiffre n'?e?n? ?sort/i, ou: "l en-tete du hook" },
  { motif: /jamais appara[iî]tre dans la cloche/i, ou: "l enonce direct de l ancienne regle" },
  { motif: /jamais appara[iî]tre dans les notifications g[eé]n[eé]rales/i, ou: "l enonce direct de l ancienne regle" },
  { motif: /JAMAIS augmenter le compteur/i, ou: "l enonce direct de l ancienne regle" },
  { motif: /L'ISOLATION, a l'ecran/, ou: "le bloc du test e2e" },
  { motif: /cloche GENERALE ne bouge pas/i, ou: "le nom du test e2e" },
];

test("G1 — l ancienne regle est ANNULEE : rien dans le code ne doit la reaffirmer", () => {
  /*
   * Demande explicite de David : << Je veux aussi un test qui casse si quelqu'un remet la
   * regle ancienne : CRM Immo ne doit jamais apparaitre dans les notifications
   * generales. >>
   *
   * La restauration prendrait deux formes :
   *   - par RETRAIT : sortir crm-immo des quatre listes. A1 a A5 cassent deja, et la
   *     seconde moitie de ce test le redit en nommant la decision.
   *   - par REAFFIRMATION : reecrire la regle, en commentaire ou en assertion. C'est la
   *     forme dangereuse, parce qu'elle ne casse rien — elle persuade. Un futur lecteur
   *     lit << aucun chiffre ne peut remonter >>, le croit, et defait le travail.
   *
   * On balaye donc le code du depot a la recherche des phrases de l'ancienne regle. Les
   * DOCUMENTS sont exclus : docs/crm-immo/plan-front-v1.md enregistre ce qui a ete decide
   * le 19 octobre, et cela reste vrai historiquement. Un document date ne se corrige pas,
   * il se complete — la revision y est notee a sa date.
   */
  const candidats: string[] = [];
  for (const dossier of ["src", "scripts", "e2e"]) {
    for (const f of readdirSync(dossier, { recursive: true, encoding: "utf8" }) as string[]) {
      const chemin = dossier + "/" + f.split("\\").join("/");
      if (!/\.(ts|tsx|sql)$/.test(chemin)) continue;
      if (chemin.endsWith("alertesDansNotifications.test.ts")) continue; // ce fichier les CITE
      candidats.push(chemin);
    }
  }
  assert.ok(candidats.length > 100,
    "le balayage n a trouve que " + candidats.length + " fichiers : garde-fou inerte");

  const fautes: string[] = [];
  for (const chemin of candidats) {
    const brut = lire(chemin);
    for (const { motif, ou } of SIGNATURES_ANCIENNE_REGLE) {
      const n = brut.split("\n").findIndex(l => motif.test(l));
      if (n >= 0) fautes.push(chemin + ":" + (n + 1) + "  (" + ou + ")");
    }
  }
  assert.deepEqual(fautes, [],
    "L ANCIENNE REGLE A ETE REAFFIRMEE.\n"
    + "  << CRM Immo ne doit jamais apparaitre dans les notifications generales >> est\n"
    + "  ANNULEE depuis le 20 octobre 2026. Les alertes CRM Immo sont la dixieme categorie\n"
    + "  du hub Notifications general, pour les Societes qui possedent le module.\n"
    + "  Endroits fautifs :\n    " + fautes.join("\n    "));
});

test("G2 — la nouvelle regle est inscrite dans les quatre listes, nommement", () => {
  /*
   * Le pendant du test precedent : la restauration PAR RETRAIT. A1 a A5 la detectent
   * deja, mais leurs messages parlent d'arite — << 9 au lieu de 10 >> se lit comme une
   * liste qu'on aurait oublie de mettre a jour. Celui-ci nomme la decision, pour que le
   * message dise ce qu'il faut comprendre.
   */
  const LISTES: Array<[string, string]> = [
    ["la somme de la pastille generale", "src/pages/admin/TopBar.tsx"],
    ["les cartes du hub et l union NotifCategory", "src/pages/admin/components/topbar/AdminNotificationCards.tsx"],
    ["l ordre par defaut des cartes", "src/hooks/useNotifCardOrder.ts"],
    ["la liste de la cloche mobile", "src/pages/admin/components/topbar/AdminMobileBellMenu.tsx"],
    ["le panneau de detail du hub", "src/pages/admin/components/topbar/AdminNotificationDetail.tsx"],
  ];
  for (const [quoi, fichier] of LISTES) {
    assert.ok(MOTIF_IMMO.test(codeSeul(lire(fichier))),
      "CRM Immo a disparu de " + quoi + " (" + fichier + ").\n"
      + "  C est l ancienne regle restauree par retrait. Depuis le 20 octobre 2026, les\n"
      + "  alertes CRM Immo sont la dixieme categorie du hub Notifications general.");
  }
});

test("G3 — le test e2e affirme l INCLUSION, et plus l isolation", () => {
  const spec = lire("e2e/crm-immo.spec.ts");
  assert.ok(!/not\.toBe\(chiffreModule\)/.test(spec),
    "le test e2e affirme encore que la pastille generale differe du compteur du module");
  assert.match(spec, /toBeGreaterThanOrEqual\(chiffreModule\)/,
    "le test e2e ne verifie plus que la pastille generale inclut le compteur du module");
});

test("G4 — la regle est ecrite la ou on la cherchera", () => {
  /*
   * Un garde-fou qui ne dit pas CE QU'IL protege se fait desactiver au premier echec :
   * on lit le message, on ne comprend pas l'intention, on retire l'assertion. La
   * decision doit donc etre lisible dans les fichiers qu'on ouvre en premier.
   */
  const hub = lire("src/pages/admin/components/topbar/AdminNotificationsHub.tsx");
  assert.ok(/poss[eè]de|poss[eè]dent|droit/i.test(hub),
    "AdminNotificationsHub n explique pas que la carte depend du droit");

  const hook = lire(DOSSIER_MODULE + "/useCrmImmoAlertes.ts");
  assert.ok(/DEUX surfaces|deux surfaces/.test(hook),
    "useCrmImmoAlertes n explique pas qu il sert maintenant deux surfaces");
  assert.ok(/alertesDansNotifications\.test\.ts/.test(hook),
    "useCrmImmoAlertes ne renvoie pas au garde-fou qui le protege");
});
