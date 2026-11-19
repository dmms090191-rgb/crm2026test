// Theme des la premiere image et « Liste des groupes » sans spinner central (19/11/2026).
//   node --import tsx --test scripts/demarrage/themeEtGroupes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Diagnostic du 19/11/2026 (journaux de production) : depuis bdc81f0, App rend l'ecran puis lance
 * refreshSession() sans l'attendre. Ce rafraichissement tient le VERROU GLOBAL d'auth-js pendant
 * tout son aller-retour (jusqu'a 46 s mesures, dont un 504). Trois consommateurs attendaient ce
 * verrou pour redemander une identite qu'App connaissait deja :
 *   - ThemeProvider : portee 'none', panel revele en 'dark' au bout de 600 ms, puis DEMONTE et
 *     REMONTE par <div key={scopeId}> quand la session repondait (vue ramenee au Dashboard) ;
 *   - SuperAdminSidebar : 24 onglets par defaut et le bouclier au lieu des 7 onglets et du logo ;
 *   - la Liste des groupes, qui repartait d'une liste VIDE a chaque ouverture, sous un spinner.
 * Ces releves figent le correctif : les graines d'identite, la memoire des groupes (sessionStorage,
 * jamais localStorage), son effacement a la deconnexion, et la relecture forcee apres ecriture.
 * Le comportement a la premiere image est mesure, lui, par le harnais navigateur du chantier.
 */

const RACINE = process.cwd();
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8").replace(/\r\n/g, "\n");

/* Retrait des commentaires par l'analyseur TypeScript (meme methode que scripts/securite/l0AuthId.test.ts). */
function sansCommentaires(src: string, nom = "source.tsx"): string {
  const genre = /\.(tsx|jsx)$/.test(nom) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const fichier = ts.createSourceFile(nom, src, ts.ScriptTarget.Latest, true, genre);
  const plages: Array<[number, number]> = [];
  const noter = (debut: number, fin: number) => { plages.push([debut, fin]); };
  const visiter = (noeud: ts.Node): void => {
    if (noeud.kind >= ts.SyntaxKind.FirstJSDocNode && noeud.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const enfants = noeud.getChildren(fichier);
    if (enfants.length > 0) { enfants.forEach(visiter); return; }
    if (noeud.kind === ts.SyntaxKind.JsxText || noeud.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces) return;
    const debut = noeud.getFullStart();
    ts.forEachTrailingCommentRange(src, debut, noter);
    ts.forEachLeadingCommentRange(src, debut, noter);
  };
  visiter(fichier);
  const car = src.split("");
  for (const [d, f] of plages) for (let i = d; i < f; i++) if (car[i] !== "\n") car[i] = " ";
  return car.join("");
}
const code = (chemin: string) => sansCommentaires(lire(chemin), chemin);

test("ThemeProvider part de l'identite connue et ne la perd que sur une vraie deconnexion", () => {
  const c = code("src/contexts/ThemeContext.tsx");
  assert.match(c, /knownUserId\?: string \| null;/, "la prop knownUserId a disparu");
  assert.match(c, /const \[sessionUserId, setSessionUserId\] = useState<string \| null>\(knownUserId\);/,
    "sessionUserId ne part plus de l'identite connue : la portee 'none' et le rendu 'dark' reviendraient");
  assert.match(c, /if \(!session && knownUserId\) return;/, "getSession sans session effacerait l'identite connue");
  assert.match(c, /if \(!session && knownUserId && event !== 'SIGNED_OUT'\) return;/,
    "seule une vraie deconnexion doit retirer l'identite connue");
  /* Un choix fait pendant le verrou n'est ni defait ni ecrase en cache par la lecture du montage. */
  assert.match(c, /const modifieLocalement = useRef\(false\);/, "le drapeau de choix local a disparu");
  assert.match(c, /useLayoutEffect\(\(\) => \{\s*modifieLocalement\.current = false;\s*if \(scope\.kind === 'none'\)/, "le drapeau n'est plus remis a zero dans l'effet de PORTEE");
  assert.equal(c.split("modifieLocalement.current = false").length - 1, 1, "le drapeau est remis a zero ailleurs que dans l'effet de portee : un choix serait defait");
  /* Les ecritures du theme partent en file : la plus ancienne ne peut plus arriver en dernier. */
  assert.match(c, /const fileEcritures = useRef<Promise<void>>\(Promise\.resolve\(\)\);/, "la file des ecritures du theme a disparu");
  assert.match(c, /const tache = fileEcritures\.current\.then\(\(\) => saveScopeData\(scope, partial\)\);\s*fileEcritures\.current = tache\.catch\(/,
    "les ecritures du theme ne sont plus ordonnees : sous le verrou, la plus ancienne pourrait ecraser le choix en base");
  assert.ok(!/setTimeout\(run, 300\)|savingRef/.test(c), "l'ancien delai de 300 ms est revenu a la place de la file");
  assert.match(c, /if \(cancelled \|\| !slice \|\| modifieLocalement\.current\) return;/,
    "la lecture du montage peut defaire un choix fait pendant le verrou, et memoriser l'ancien theme");
  for (const setter of ["setTheme = useCallback((t: Theme) => {", "applyCustomTheme = useCallback((ctKey", "clearCustomTheme = useCallback(() => {", "setGlassConfig = useCallback((config: GlassConfig) => {"]) {
    const i = c.indexOf(setter);
    assert.ok(i >= 0, `setter introuvable : ${setter}`);
    assert.match(c.slice(i, i + 160), /modifieLocalement\.current = true;/, `${setter} ne signale plus le choix local`);
  }
  /* Les invariants figes par les releves Talixy restent intacts. */
  assert.match(c, /useState<Theme>\('dark'\)/);
  assert.match(c, /cachedTheme \?\? 'dark'/);
  assert.match(c, /<div key=\{scopeId\}>/);
});

test("l'identite connue descend jusqu'au theme et au menu du panel Talvex, bureau et telephone", () => {
  const shell = code("src/app/AppShell.tsx");
  assert.match(shell, /knownUserId=\{knownUserId\} dashboardHost>/, "AppShell ne transmet plus knownUserId au ThemeProvider");

  const routeur = code("src/app/AppDashboardRouter.tsx");
  assert.match(routeur, /<AppShell panelRole="super_admin" knownUserId=\{saUserId\}>/, "la branche Talvex ne seme plus l'identite du theme");
  assert.match(routeur, /initialUserId=\{saUserId\} initialCompanyId=\{userCompanyId\}/, "le menu Talvex ne recoit plus ses graines");

  const app = code("src/App.tsx");
  assert.match(app, /userCompanyId=\{userCompanyId\}/, "App ne transmet plus userCompanyId au routeur");
  assert.match(app, /knownUserId=\{role === 'super_admin' \? saUserId : null\}/,
    "la coquille telephone ne seme plus l'identite du Talvex Administrateur (et elle ne doit jamais semer celle d'un autre role)");

  const tableau = code("src/pages/superadmin/SuperAdminDashboard.tsx");
  /* Ligne a ligne : les props contiennent des fleches (=>), qu'un [^>]* ne saurait traverser. */
  const rendus = tableau.split("\n").filter(l => l.includes("<SuperAdminSidebar "));
  assert.equal(rendus.length, 2, `deux rendus du menu attendus (tiroir mobile et colonne bureau) : ${rendus.length}`);
  for (const r of rendus) {
    assert.ok(r.includes("initialUserId={initialUserId} initialCompanyId={initialCompanyId}"),
      "un des deux menus ne recoit pas les graines : il peindrait les onglets par defaut pendant le verrou");
  }

  const menu = code("src/pages/superadmin/SuperAdminSidebar.tsx");
  assert.match(menu, /useState<string \| null>\(initialUserId\)/, "le menu repart d'un userId nul : onglets par defaut pendant le verrou");
  assert.match(menu, /useState<string \| null>\(initialCompanyId\)/, "le menu repart d'un companyId nul : bouclier par defaut pendant le verrou");
  assert.match(menu, /supabase\.auth\.getSession\(\)/, "le getSession de suivi du menu a disparu");
  assert.match(menu, /setCompanyId\(metaId \?\? null\);/, "une session sans Societe laisserait la graine (et le logo d'une autre Societe)");

  /* TELEPHONE : le mini arc (sous 768 px) et la barre de la coquille lisent la navigation par
     useTalixyMobileNav. Ils recoivent la MEME identite, par le contexte pose dans AppShell. */
  assert.match(shell, /<IdentiteConnueContext\.Provider value=\{knownUserId \?\? null\}>/, "AppShell ne pose plus l'identite connue pour la navigation mobile");
  const nav = code("src/talixy/useTalixyMobileNav.ts");
  assert.match(nav, /const identiteConnue = useIdentiteConnue\(\);/, "la navigation mobile ne lit plus l'identite connue");
  assert.match(nav, /useState<string \| null>\(\(\) => \(actif \? identiteConnue : null\)\)/,
    "la navigation mobile repart d'un userId nul (onglets par defaut pendant le verrou), ou l'utilise inactive");
  /* Les invariants figes par scripts/runtime/coquilleMobile.test.ts (H2, I1) restent intacts. */
  assert.match(nav, /if \(!actif\) return;/);
  assert.match(nav, /entityUserId: actif \? userId : null/);
  assert.match(tableau, /useTalixyMobileNav\('super_admin', SA_SECTIONS, PROTECTED_TAB_IDS, activeView\)/);
});

test("le logo : dernier connu pour le seul menu Talvex, garde champ par champ en cas d'echec", () => {
  const c = code("src/hooks/useActiveLogo.ts");
  assert.match(c, /export function useActiveLogo\(companyId: string \| null, memoriser = false\)/,
    "le cache du logo n'est plus optionnel : Admin et Groupe en heriteraient");
  assert.match(c, /useState<ActiveLogoInfo>\(\(\) => \(memoriser \? logoConnu\(companyId\) : SANS_LOGO\)\)/, "le logo du menu Talvex ne part plus du cache");
  assert.match(c, /if \(cancelled \|\| mienne !== derniere\) return;/, "une lecture plus ancienne arrivee en dernier ecrirait (et memoriserait) un logo perime");
  assert.match(c, /if \(!memoriser\) \{\s*setInfo\(\{ url: logoRes\.data\?\.url \?\? null, scale: pageRes\.data\?\.logo_scale \?\? 1 \}\);\s*return;\s*\}/,
    "les autres consommateurs n'ont plus le comportement d'avant le 19/11");
  assert.match(c, /url: logoRes\.error \? prev\.url : \(logoRes\.data\?\.url \?\? null\)/, "un echec de la lecture du logo l'effacerait");
  assert.match(c, /scale: pageRes\.error \? prev\.scale : \(pageRes\.data\?\.logo_scale \?\? 1\)/, "un echec de la lecture de l'echelle jetterait le logo frais");
  assert.match(c, /if \(logoRes\.error \|\| pageRes\.error\) return;\s*const frais = /, "une reponse partielle serait memorisee");
  assert.equal(c.split("if (logoRes.error || pageRes.error) return;").length - 1, 1,
    "un echec d'une seule lecture abandonne de nouveau toute la mise a jour (le logo frais serait jete)");
  assert.match(c, /localStorage\.setItem\(cleLogo\(companyId!\), JSON\.stringify\(frais\)\)/, "la reponse reussie n'est plus memorisee");
  assert.match(c, /\}, \[companyId, memoriser\]\);/);

  const menu = code("src/pages/superadmin/SuperAdminSidebar.tsx");
  assert.match(menu, /useActiveLogo\(companyId, true\)/, "le menu Talvex ne demande plus le logo memorise");
  assert.match(menu, /onError=\{\(\) => setLogoCasse\(activeLogo\)\}/, "un logo memorise dont le fichier a disparu s'afficherait en image cassee");
  assert.match(menu, /useEffect\(\(\) => \{ setLogoCasse\(null\); \}, \[lecturesLogo\]\);/, "un echec passager de l'image garderait le bouclier jusqu'au rechargement");
  assert.match(c, /lectures: \(prev\.lectures \?\? 0\) \+ \(logoRes\.error \? 0 : 1\),/, "le hook ne compte plus les lectures reussies du logo");
  for (const f of ["src/pages/admin/AdminDashboard.tsx", "src/pages/admin/views/AdminApplicationPage.tsx", "src/pages/company-super-admin/CSAApplicationPage.tsx"]) {
    assert.match(code(f), /useActiveLogo\(companyId\)/, `${f} : le logo n'est plus lu sans cache (hors perimetre du 19/11)`);
  }
});

test("la memoire des groupes : sessionStorage seul, jamais localStorage, videe a la deconnexion", () => {
  const m = code("src/lib/memoireGroupes.ts");
  assert.match(m, /sessionStorage\.setItem\(CLE, JSON\.stringify\(v\)\)/);
  assert.ok(!/localStorage/.test(m), "la liste des groupes ne doit JAMAIS aller en localStorage (decision du 19/11/2026)");

  const deco = code("src/lib/deconnexion.ts");
  assert.match(deco, /finally \{\s*oublierGroupesConnus\(\);\s*await effacerJetonsSession\(\);/,
    "la deconnexion ne vide plus la liste des groupes, ou la vide APRES un effacement de jeton qui peut lever");

  const app = code("src/App.tsx");
  assert.match(app, /if \(!session\) \{ oublierGroupesConnus\(\);/, "une session finie hors bouton (expiration, autre onglet) garderait la liste");
});

test("la Liste des groupes : liste connue au montage, relecture FORCEE apres ecriture, pas de spinner central", () => {
  const hook = code("src/pages/superadmin/views/super-admins/useSuperAdminsData.ts");
  assert.match(hook, /useState<CompanySuperAdmin\[\]>\(\(\) => lireGroupesConnus\(\)\?\.list \?\? \[\]\)/, "la liste repart vide a chaque ouverture");
  assert.match(hook, /const refresh = useCallback\(\(\) => charger\('forcee'\), \[charger\]\);/,
    "refresh n'est plus une relecture forcee : apres une suppression, une lecture plus ancienne pourrait gagner");
  assert.match(hook, /if \(g !== generationCourante\(\)\) \{ await charger\('suite'\); return; \}/, "une reponse perimee pourrait ecrire l'ecran");
  assert.match(hook, /g === generationCourante\(\)\) \{\s*const avant = lireGroupesConnus\(\);/, "une reponse perimee pourrait ecrire la memoire");
  assert.match(hook, /generationEcrite = g;/, "la memoire ne retient plus quelle generation l'a ecrite : une reponse perimee relancerait une requete");
  assert.match(hook, /if \(mode === 'suite'\) \{\s*if \(!enVol\) \{[\s\S]*?setLoading\(false\);\s*return;\s*\}/,
    "apres une reponse perimee, une requete partirait en double");
  assert.match(hook, /mode === 'montage' && enVol && \(enVol\.depart === null \|\| performance\.now\(\) - enVol\.depart < PARTAGE_MAX_MS\)/,
    "un montage rejoindrait une lecture partie AVANT une ecriture faite hors du hook (Visu)");
  /* La suite ne LANCE jamais de lecture : ni requete en double, ni requete apres une deconnexion. */
  const debutSuite = hook.indexOf("if (mode === 'suite') {");
  const suite = hook.slice(debutSuite, hook.indexOf("} else {", debutSuite));
  assert.ok(debutSuite >= 0 && suite.length > 0 && !/lancerLecture|nouvelleGeneration/.test(suite), "la reprise apres une reponse perimee lance une lecture");
  assert.match(hook, /if \(!monte\.current\) return;\s*if \(g !== generationCourante\(\)\)/, "une vue demontee ecrirait son etat");
  /* Statut : l'ecran suit tout de suite, l'echec est dit et annule, la relecture n'est PAS attendue. */
  assert.match(hook, /const \{ error: echec \} = await supabase\s*\.from\('sa_group_statuts'\)\s*\.upsert\(/, "le resultat de l'enregistrement du statut est ignore");
  assert.match(hook, /if \(echec\) \{[\s\S]*?setError\(`Statut non enregistré : \$\{echec\.message\}`\);\s*return;\s*\}\s*memoriserStatutConnu\(companyId, nom\);\s*void charger\('forcee'\);/,
    "un statut refuse serait memorise, ou la relecture serait attendue (menu des statuts ouvert pendant l'aller-retour)");
  assert.ok(!/await charger\('forcee'\)/.test(hook), "une relecture forcee est attendue quelque part : le menu des statuts resterait ouvert");

  assert.match(hook, /if \(!session\) return \{ ok: false, erreur: 'Non authentifie' \};\s*auDepart\(\);/,
    "l'age d'une lecture se compterait avant le verrou : une seconde Edge Function partirait au deverrouillage");
  assert.match(hook, /if \(!json \|\| !Array\.isArray\(json\.company_super_admins\)\) return \{ ok: false/,
    "une reponse 200 illisible deviendrait une liste VIDE memorisee (« aucun groupe »)");
  assert.ok(!/\.catch\(\(\) => \(\{\}\)\)/.test(hook), "le corps illisible est de nouveau lu comme un objet vide");
  assert.match(hook, /if \(r\.statuts\) setStatuts\(\{ \.\.\.r\.statuts, \.\.\.enAttente\.current \}\);/,
    "une relecture arrivee pendant un enregistrement de statut effacerait le choix a l'ecran");
  assert.match(hook, /setStatuts\(\{ \.\.\.v\.statuts, \.\.\.enAttente\.current \}\)/, "la reprise depuis la memoire effacerait un statut en cours d'enregistrement");
  assert.match(hook, /if \(dernierChoix\) setStatuts\(prev =>/, "l'echec d'un ancien choix ecraserait un choix plus recent");

  const vue = code("src/pages/superadmin/views/super-admins/SASuperAdmins.tsx");
  assert.match(vue, /onSelectStatut=\{nom => \{ const id = statutFor; closeStatut\(\); if \(id\) void setGroupStatut\(id, nom\); \}\}/,
    "le menu des statuts attend de nouveau l'ecriture (et peut fermer le menu d'une autre ligne)");
  assert.ok(!/RefreshCw/.test(vue), "le spinner central est revenu dans la Liste des groupes");
  assert.ok(!/list\.length > 0 && \(\s*<ListFilters/.test(vue), "les filtres ne s'affichent de nouveau qu'avec une liste non vide");
  assert.match(vue, /loading && !connue \? \(\s*<SASuperAdminsSquelette tokens=\{t\} \/>/,
    "le premier chargement n'affiche plus la structure, ou une liste connue VIDE repasse par le squelette");
  assert.match(vue, /!connue && list\.length === 0 && error \? null/, "une erreur sans liste s'afficherait comme « aucun groupe ne correspond », ou une liste connue vide disparaitrait");
  assert.match(vue, /loading && !connue\s*\? 'Chargement des groupes…'\s*: !connue && n === 0 && error\s*\? 'Liste des groupes indisponible pour le moment\.'/,
    "le sous-titre Talixy affirmerait « aucun groupe » pendant le chargement ou apres un echec");
});

test("COMPORTEMENT de la memoire des groupes (sessionStorage simule)", async () => {
  const magasin = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => magasin.get(k) ?? null,
    setItem: (k: string, v: string) => { magasin.set(k, String(v)); },
    removeItem: (k: string) => { magasin.delete(k); },
    clear: () => magasin.clear(), key: () => null, length: 0,
  } as Storage;
  const m = await import("../../src/lib/memoireGroupes.ts");
  const g = { id: "1", email: "g@exemple.invalid", first_name: "A", last_name: "B", phone: "", company: "G1", company_id: "c1",
    role: "company_super_admin", created_at: "", last_sign_in_at: null, access_enabled: true };

  assert.equal(m.lireGroupesConnus(), null, "rien n'est connu au depart");
  m.ecrireGroupesConnus({ userId: "u1", list: [g] as never, statuts: {} });
  assert.ok(magasin.has("talvex:sa-groupes:v1"), "l'ecriture doit aller dans sessionStorage (survie au F5)");
  m.memoriserStatutConnu("c1", "Actif");
  assert.equal(m.lireGroupesConnus()?.statuts.c1, "Actif", "le statut change doit etre memorise");

  const g0 = m.generationCourante();
  assert.equal(m.nouvelleGeneration(), g0 + 1, "une relecture forcee ouvre une generation nouvelle");

  m.oublierGroupesConnus();
  assert.equal(m.lireGroupesConnus(), null, "apres l'oubli, plus rien de la session precedente");
  assert.ok(!magasin.has("talvex:sa-groupes:v1"), "l'oubli doit vider sessionStorage");
  assert.ok(m.generationCourante() > g0 + 1, "l'oubli doit perimer toute reponse encore en vol");

  magasin.set("talvex:sa-groupes:v1", "{pas du json");
  assert.equal(m.lireGroupesConnus(), null, "un stockage illisible ne doit pas casser la vue");
});
