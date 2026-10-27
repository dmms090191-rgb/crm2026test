// Ce que l'APK affiche vraiment : la coquille telephone, sa navigation et ce qui l'alimente.
//   node --import tsx --test scripts/runtime/coquilleMobile.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VUES_TELEPHONE, type RoleTelephone } from "../../src/app/navigationMobile.ts";
import {
  mobileItems, filtrerRendables, repartirOnglets, corrigerOngletActif, CELLULES_BARRE,
} from "../../src/talixy/mobileNav.ts";
import {
  defaultEntries, visibleEntries, entryLabel,
  type LayoutDefaultSection, type LayoutEntry,
} from "../../src/lib/sidebarLayout.ts";
import { sectionsAvecCrmImmo } from "../../src/lib/crmImmoSidebar.ts";

/*
 * ============== CE QUE CE FICHIER SURVEILLE, ET POURQUOI ==============
 *
 * Le 26/10/2026, le porteur de l'APK Android a ouvert son application et a trouve une
 * interface inutilisable : avatar « ? », nom « — », societe « — », e-mail « — », des
 * onglets qui n'etaient pas les siens, et un en-tete dessine SOUS la barre d'etat.
 *
 * LA CAUSE PROFONDE, ET ELLE VAUT D'ETRE RETENUE : PwaMobileShell n'avait JAMAIS tourne.
 * Un `!estMobile()` le rendait inatteignable en natif ; en retirant cette faute, on a
 * active d'un coup une coquille que personne n'avait jamais vue fonctionner. Tous les
 * defauts ci-dessous dormaient dedans depuis le debut.
 *
 * LA LECON : ce ne sont pas des regressions, ce sont des manques jamais exerces. Un code
 * qu'aucun chemin n'atteint n'est pas du code qui marche — c'est du code dont on ignore
 * s'il marche. D'ou ces releves, qui exercent par la lecture ce que le produit n'exercait
 * pas par l'usage.
 *
 * Le 27/10/2026, la barre d'onglets a cesse d'etre une liste ecrite en dur : elle derive de
 * `layout.visible`, puis se filtre par l'ensemble des vues reellement rendables. Les
 * sections F a J surveillent cette derivation — et surtout l'accord entre l'ensemble declare
 * et le `switch`, parce que leur divergence est exactement ce qui faisait afficher le
 * Dashboard sous le titre d'un autre onglet.
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const APP = () => sansCommentaires(lire("src/App.tsx"));
const COQUILLE = () => sansCommentaires(lire("src/app/PwaMobileShell.tsx"));
const SOURCES = () => sansCommentaires(lire("src/app/navigationMobileSources.ts"));
const CROCHET = () => sansCommentaires(lire("src/talixy/useTalixyMobileNav.ts"));

const ROLES: RoleTelephone[] = ["super_admin", "admin", "vendor", "client"];

/**
 * Les `case` du `switch` de rendu, role par role.
 *
 * On decoupe sur les trois `if (role === ...)` et on prend la fin pour le client, dont la
 * branche est le `switch` de REPLI — c'est ce mecanisme qui avait donne le panel Client au
 * Groupe, et c'est pourquoi on ne peut pas se contenter de chercher un `if` pour lui.
 */
function casesParRole(): Record<RoleTelephone, string[]> {
  const code = COQUILLE();
  const bloc = code.slice(code.indexOf("const renderView"), code.indexOf("return (\n    <div className=\"flex flex-col h-[100dvh]\""));
  assert.ok(bloc.length > 500, "le bloc renderView n'a pas pu etre isole");
  const ids = (s: string) => [...s.matchAll(/case '([^']+)':/g)].map(m => m[1]);
  const iSA = bloc.indexOf("if (role === 'super_admin')");
  const iAdmin = bloc.indexOf("if (role === 'admin')");
  const iVendor = bloc.indexOf("if (role === 'vendor')");
  const iClient = bloc.lastIndexOf("switch (activeTab) {");
  for (const [nom, i] of [["super_admin", iSA], ["admin", iAdmin], ["vendor", iVendor], ["client", iClient]] as const) {
    assert.ok(i > 0, `la branche ${nom} du switch de rendu est introuvable`);
  }
  return {
    super_admin: ids(bloc.slice(iSA, iAdmin)),
    admin: ids(bloc.slice(iAdmin, iVendor)),
    vendor: ids(bloc.slice(iVendor, iClient)),
    client: ids(bloc.slice(iClient)),
  };
}

/** Les ids declares dans un bloc LAYOUT_SECTIONS / BASE_SECTIONS d'un fichier source. */
function idsDeclares(fichier: string, nomConst: string): { id: string; masque: boolean }[] {
  const s = lire(fichier);
  const i = s.indexOf(nomConst);
  assert.ok(i > 0, `${nomConst} introuvable dans ${fichier}`);
  /* ATTENTION : le premier '[' apres le nom est celui de `LayoutDefaultSection[]`, pas celui
     du tableau. On part donc du '=' de l'affectation — ce piege m'a fait mesurer 0 onglet. */
  const eq = s.indexOf("=", i);
  let prof = 0, debut = s.indexOf("[", eq), fin = -1;
  for (let k = debut; k < s.length; k++) {
    if (s[k] === "[") prof++;
    else if (s[k] === "]") { prof--; if (prof === 0) { fin = k; break; } }
  }
  const bloc = s.slice(debut, fin + 1);
  return [...bloc.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:[^}]*\}/g)]
    .map(m => ({ id: m[1], masque: /hidden:\s*true/.test(m[0]) }));
}

// ------------------------------------------- A. LA ZONE SURE DE L'ECRAN

test("A1 viewport-fit=cover : sans lui, toutes les safe-area valent ZERO", () => {
  /*
   * Les classes safe-area-top et safe-area-bottom etaient deja posees dans la coquille,
   * et ne produisaient AUCUN retrait : env(safe-area-inset-*) vaut zero tant que le
   * viewport n'est pas declare en « cover ». Android 15 dessinant bord a bord par
   * defaut, l'en-tete passait sous la barre d'etat et les onglets sous la barre de
   * gestes. Un seul mot dans une balise meta, invisible a la relecture du composant.
   */
  const html = lire("index.html");
  const meta = html.split("\n").find((l) => l.includes('name="viewport"'));
  assert.ok(meta, "la balise meta viewport a disparu d'index.html");
  assert.match(meta, /viewport-fit=cover/, "sans viewport-fit=cover, les env(safe-area-inset-*) valent 0");
});

test("A2 la coquille utilise bien les retraits de zone sure", () => {
  const code = COQUILLE();
  assert.match(code, /safe-area-top/, "le retrait du haut a disparu : l'en-tete passerait sous la barre d'etat");
  assert.match(code, /safe-area-bottom/, "le retrait du bas a disparu : les onglets passeraient sous la barre de gestes");
});

// ------------------------------------- B. LE CONTENEUR DES VUES

test("B1 le conteneur donne sa gouttiere : sans elle, rien ne respire", () => {
  /*
   * Les vues montees ici n'ont aucun padding a elles — c'est le conteneur qui le donne,
   * comme sur le bureau. Sans lui, chaque carte et chaque bordure touche les deux bords de
   * l'ecran. C'est le premier motif qui fait dire « l'interface n'est pas bonne ».
   */
  const code = COQUILLE();
  const main = code.split("\n").find((l) => l.includes("<main") && l.includes("flex-1 min-h-0"));
  assert.ok(main, "le <main> de la coquille a disparu");
  assert.match(main, /p-3/, "le conteneur ne donne plus de gouttiere aux vues");
});

test("B2 le conteneur est une COLONNE flex : sinon les messageries n'ont pas de hauteur", () => {
  /*
   * Les vues de messagerie se dimensionnent par rapport a un parent en colonne. Sans
   * `flex flex-col`, leur liste de conversations n'a pas de hauteur et la zone de saisie
   * sort de l'ecran. Le conteneur du bureau l'a toujours eu ; celui-ci ne l'avait pas.
   */
  const code = COQUILLE();
  const main = code.split("\n").find((l) => l.includes("<main") && l.includes("flex-1 min-h-0"));
  assert.ok(main, "le <main> de la coquille a disparu");
  assert.match(main, /flex flex-col/, "le conteneur n'est plus une colonne : les messageries seront ecrasees");
});

// --------------------------------- C. LES FOURNISSEURS QUE LES VUES EXIGENT

test("C1 SimulationProvider enveloppe la coquille : sans lui, QUATRE onglets font tout planter", () => {
  /*
   * useSimulation LEVE hors fournisseur (SimulationContext.tsx:51). Les vues de messagerie
   * l'appellent, et ListeVendeurs aussi — c'est l'une des vues ajoutees le 27/10/2026, donc
   * cette dependance n'est pas un vestige : elle augmente. Sur le bureau, AdminDashboard
   * enveloppe tout ; la coquille telephone monte ces memes vues sans passer par lui. Mesure
   * du 26/10/2026 : appuyer sur CRM ou Clients remplacait l'ecran ENTIER, barre d'onglets
   * comprise, par un ecran d'erreur.
   */
  const code = APP();
  assert.match(code, /import \{ SimulationProvider \}/, "SimulationProvider n'est plus importe");
  const bloc = code.match(/<SimulationProvider>[\s\S]{0,300}?<\/SimulationProvider>/);
  assert.ok(bloc, "SimulationProvider n'enveloppe plus rien");
  assert.match(bloc[0], /<PwaMobileShell/, "SimulationProvider n'enveloppe plus la coquille telephone");
});

test("C2 la coquille recoit le contexte de Societe", () => {
  // Sans lui, le nom de la Societe reste vide et la carte d'identite affiche « — ».
  const code = COQUILLE();
  /*
   * On verifie l'APPEL, pas la mention. Une passe de mutation l'a montre : remplacer
   * `const companyId = useCompanyId()` par une constante nulle laissait l'import en
   * place, et un releve qui cherchait seulement « useCompanyId » restait vert alors que
   * la Societe redevenait vide.
   */
  assert.match(
    code,
    /const companyId = useCompanyId\(\)/,
    "la coquille n'APPELLE plus useCompanyId : le nom de Societe resterait vide",
  );
});

// --------------------------- D. L'IDENTITE AFFICHEE, CHAMP PAR CHAMP

test("D1 la vue d'accueil admin recoit ses TROIS props d'identite", () => {
  /*
   * C'est le defaut exact de la capture du 26/10/2026. VueEnsemble declare des defauts
   * VIDES et SocieteIdentityCard affiche `valeur || '—'` : une chaine vide donne donc
   * « — » de facon PERMANENTE, pas transitoire. Attendre ne servait a rien, puisque
   * aucune requete ne partait.
   *
   * Les roles vendeur et client passaient deja les leurs ; seul l'admin montait sa vue nue.
   *
   * ON COMPTE, ON NE CONSTATE PAS — et le compte a CHANGE le 27/10/2026. La vue d'accueil
   * etait montee a DEUX endroits : le `case 'vue-ensemble'` et le `default` du meme switch.
   * Ce `default` a ete supprime : il rendait le tableau de bord pour TOUT id inconnu, donc
   * il mentait (voir F2). Il n'y a donc plus qu'UN montage, et c'est le bon nombre. Si un
   * second reapparaissait, ce serait le repli silencieux qui revient.
   */
  const code = COQUILLE();
  assert.match(code, /fullName: userName/, "le nom n'est plus passe a la vue d'accueil");
  assert.match(code, /email: userEmail/, "l'e-mail n'est plus passe a la vue d'accueil");
  assert.match(code, /companyName/, "le nom de Societe n'est plus passe a la vue d'accueil");

  const montages = code.match(/<AdminVueEnsemble \{\.\.\.identite\} \/>/g) ?? [];
  assert.equal(
    montages.length,
    1,
    `la vue d'accueil doit etre montee UNE fois, par son propre case et non par un repli, ${montages.length} trouve(s)`,
  );
  assert.doesNotMatch(code, /<AdminVueEnsemble \/>/, "un montage sans props subsiste : ses champs seront vides");
});

test("D2 le nom de Societe est REELLEMENT demande a la base", () => {
  // La donnee n'etait pas lente : aucune requete ne partait. La coquille importe la VUE
  // toute seule et sautait toute la couche qui l'alimente sur le bureau.
  const code = COQUILLE();
  assert.match(
    code,
    /from\('companies'\)\s*\.select\('name'\)/,
    "la requete du nom de Societe a disparu : le champ redeviendrait vide",
  );
});

test("D3 aucun faux nom n'est invente pour masquer un champ vide", () => {
  /*
   * Le bureau a un plancher ('Administrateur') qui cache l'absence de donnee. Le
   * recopier ici masquerait l'erreur au lieu de la corriger : on afficherait un nom
   * plausible pour quelqu'un dont on n'a rien lu.
   */
  const code = COQUILLE();
  assert.doesNotMatch(code, /userName \|\| 'Administrateur'/, "un faux nom masque l'absence de donnee");
});

// ------------------------------------ E. LE ROLE QUI N'A PAS SA PLACE

test("E1 le Groupe est tenu hors de la coquille tant qu'elle ne le connait pas", () => {
  /*
   * PwaMobileShell ne traite que quatre roles. Un company_super_admin traversait ses
   * trois `if` sans correspondre et tombait dans le switch du CLIENT : il recevait le
   * tableau de bord Client, sous le nom « Client », avec les onglets du client. Pas un
   * ecran vide : la MAUVAISE interface, en silence, et le typecheck le signalait deja.
   */
  const code = APP();
  const garde = code.split("\n").find(
    (l) => l.includes("IS_COQUILLE_TELEPHONE || IS_VIRTUAL_PHONE") && l.trimStart().startsWith("if ("),
  );
  assert.ok(garde, "la garde de la coquille a disparu");
  assert.match(garde, /role !== 'company_super_admin'/, "le Groupe recevrait de nouveau le panel Client");
});

test("E2 les quatre roles de la coquille ont chacun leur branche", () => {
  // Un role sans branche tombe dans le `default`, c'est-a-dire chez le client.
  const code = COQUILLE();
  for (const r of ["super_admin", "admin", "vendor"]) {
    assert.match(code, new RegExp(`role === '${r}'`), `le role ${r} n'a plus de branche : il tomberait chez le client`);
  }
});

// ===================== F. LA DERIVATION ET LE FILTRE =====================

test("F1 chaque onglet declare rendable A une vue, et chaque vue est declaree — DANS LES DEUX SENS", () => {
  /*
   * LE RELEVE CENTRAL DE CE CHANTIER.
   *
   * La barre derive de layout.visible, donc elle peut proposer n'importe quel onglet
   * configure. Ce qui empeche un onglet de mentir, c'est UNIQUEMENT l'accord entre
   * VUES_TELEPHONE et le `switch` de rendu. Leur divergence est exactement le defaut qu'on
   * ferme : l'arc Talixy proposait 24 onglets a Talvex Administrateur, le switch en
   * connaissait 11, et les 13 autres affichaient le Dashboard sous leur propre titre.
   *
   * On compte donc dans les deux sens. Un id declare sans `case` ferait reapparaitre un
   * ecran trompeur ; un `case` non declare serait du code mort, atteignable par personne.
   */
  const cases = casesParRole();
  for (const role of ROLES) {
    const declares = [...VUES_TELEPHONE[role]].sort();
    const rendus = [...cases[role]].sort();
    const sansVue = declares.filter(id => !rendus.includes(id));
    const sansDeclaration = rendus.filter(id => !declares.includes(id));
    assert.deepEqual(sansVue, [], `${role} : declare(s) dans VUES_TELEPHONE sans case de rendu -> afficherait un ecran trompeur`);
    assert.deepEqual(sansDeclaration, [], `${role} : case(s) de rendu non declare(s) -> code mort, aucun onglet n'y mene`);
    assert.ok(declares.length > 0, `${role} : aucune vue declaree`);
  }
});

test("F2 AUCUN repli silencieux : un id inconnu ne rend JAMAIS un tableau de bord", () => {
  /*
   * Chacun des quatre `switch` finissait par un `default` qui rendait le tableau de bord du
   * role. Ce repli etait un mensonge : l'en-tete affichait le libelle du vrai onglet, tire
   * de layout.visible, pendant que le corps montrait le Dashboard.
   *
   * Mesure du 27/10/2026 en base (role postgres, RLS ignoree) : aucun compte n'a le theme
   * `talixy`, donc l'arc ne s'affichait pour personne et le defaut n'avait jamais pu se
   * voir. Il etait dormant — et la derivation l'aurait reveille.
   */
  const code = COQUILLE();
  const defauts = [...code.matchAll(/default: return ([^;]+);/g)].map(m => m[1].trim());
  assert.ok(defauts.length >= 4, `chaque branche de role doit garder un default explicite, ${defauts.length} trouve(s)`);
  for (const d of defauts) {
    assert.match(d, /<EcranSansVue /, `un default rend autre chose qu'un ecran nomme : « ${d} »`);
  }
  for (const interdit of ["SADashboard", "AdminVueEnsemble", "VendorVueEnsemble", "ClientVueEnsemble"]) {
    assert.ok(
      !defauts.some(d => d.includes(interdit)),
      `le repli silencieux vers ${interdit} est revenu : un onglet inconnu afficherait un tableau de bord`,
    );
  }
  /* L'ecran de secours doit NOMMER l'onglet : un ecran muet redeviendrait indiscernable
     d'une page vide, et on ne saurait pas que l'ensemble declare a derive. */
  assert.match(code, /function EcranSansVue\(\{ id/, "l'ecran de secours ne recoit plus l'id de l'onglet");
});

test("F3 le filtre est applique DANS le crochet, pas apres : sinon les fleches sautent des onglets", () => {
  /*
   * activeIndex, compartiment, precedent et suivant sont calcules dans le crochet. Filtrer
   * apres coup les laisserait porter sur une AUTRE liste que celle affichee : les fleches
   * du mini arc traverseraient des onglets invisibles, et l'arc marquerait le mauvais actif.
   */
  const code = CROCHET();
  assert.match(code, /rendables \? filtrerRendables\(tous, rendables\) : tous/,
    "le crochet ne filtre plus lui-meme : index et fleches porteraient sur une autre liste");
  /* Le filtre doit venir APRES mobileItems : le compartiment d'un onglet est la section qui
     le precede dans la liste COMPLETE. Filtrer avant lui donnerait le compartiment d'un voisin. */
  const iItems = code.indexOf("mobileItems(layout.visible");
  const iFiltre = code.indexOf("filtrerRendables(tous");
  assert.ok(iItems > 0 && iFiltre > iItems, "le filtre passe avant mobileItems : les compartiments seraient faux");
});

test("F4 l'ordre vient de layout.visible et n'est JAMAIS retrie", () => {
  /*
   * L'ordre affiche est celui que l'utilisateur a choisi en reorganisant sa barre laterale.
   * Un classement « intelligent » ajoute ici reintroduirait une deuxieme verite a cote de
   * la sienne — c'est tout ce que ce chantier cherche a supprimer.
   */
  const items = [
    { id: "a", label: "A", compartiment: "P" },
    { id: "b", label: "B", compartiment: "P" },
    { id: "c", label: "C", compartiment: "P" },
    { id: "d", label: "D", compartiment: "P" },
  ];
  assert.deepEqual(
    filtrerRendables(items, ["d", "b", "a"]).map(i => i.id),
    ["a", "b", "d"],
    "filtrerRendables doit garder l'ordre de la LISTE, pas celui de l'ensemble declare",
  );
  for (const f of ["src/app/PwaMobileShell.tsx", "src/talixy/mobileNav.ts", "src/talixy/useTalixyMobileNav.ts"]) {
    assert.doesNotMatch(sansCommentaires(lire(f)), /\.sort\(/, `${f} retrie les onglets : l'ordre configure ne serait plus respecte`);
  }
});

test("F5 un onglet masque sur le bureau disparait du telephone, sans code special", () => {
  /* La chaine complete, exercee pour de vrai : defaults -> visibleEntries -> mobileItems
     -> filtrerRendables. C'est le masquage du bureau qui agit, pas une liste a part. */
  const sections: LayoutDefaultSection[] = [
    { title: "Principal", items: [
      { id: "vue-ensemble", label: "Dashboard" },
      { id: "crm", label: "CRM Leads" },
      { id: "statuts", label: "Statuts", hidden: true },
    ] },
  ];
  const entrees = defaultEntries(sections);
  const visibles = visibleEntries(entrees);
  const labels = { "vue-ensemble": "Dashboard", crm: "CRM Leads", statuts: "Statuts" };
  const onglets = filtrerRendables(
    mobileItems(visibles, (e: LayoutEntry) => entryLabel(e, labels)),
    ["vue-ensemble", "crm", "statuts"],
  );
  assert.deepEqual(onglets.map(o => o.id), ["vue-ensemble", "crm"], "l'onglet masque est reste sur le telephone");

  /* Contre-temoin : demasque, il revient. Sans quoi le releve passerait meme si la chaine
     retirait tout. */
  const sansMasque = sections.map(s => ({ ...s, items: s.items.map(i => ({ ...i, hidden: false })) }));
  const tous = filtrerRendables(
    mobileItems(visibleEntries(defaultEntries(sansMasque)), (e: LayoutEntry) => entryLabel(e, labels)),
    ["vue-ensemble", "crm", "statuts"],
  );
  assert.equal(tous.length, 3, "contre-temoin : demasque, l'onglet doit revenir");
});

test("F6 la repartition barre / « Plus » ne perd aucun onglet et garde l'ordre", () => {
  const faire = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}` }));
  for (let n = 0; n <= CELLULES_BARRE; n++) {
    const { barre, plus } = repartirOnglets(faire(n));
    assert.equal(barre.length, n, `${n} onglets : tous doivent tenir dans la barre`);
    assert.deepEqual(plus, [], `${n} onglets : il ne doit PAS y avoir de bouton « Plus » qui n'ouvre rien`);
  }
  for (const n of [CELLULES_BARRE + 1, 8, 15, 24]) {
    const onglets = faire(n);
    const { barre, plus } = repartirOnglets(onglets);
    assert.equal(barre.length, CELLULES_BARRE - 1, `${n} onglets : la derniere cellule est reservee a « Plus »`);
    assert.deepEqual(
      [...barre, ...plus].map(o => o.id),
      onglets.map(o => o.id),
      `${n} onglets : la repartition perd ou reordonne des onglets`,
    );
  }
});

test("F7 l'onglet actif corrige ne sort JAMAIS de la liste, et l'absence se dit", () => {
  const onglets = [{ id: "a" }, { id: "b" }];
  assert.equal(corrigerOngletActif("b", onglets), "b", "un onglet atteignable ne doit pas bouger");
  assert.equal(corrigerOngletActif("z", onglets), "a", "un onglet disparu doit mener au premier de SA liste");
  assert.equal(corrigerOngletActif("a", []), null, "liste vide : il faut rendre null, pas inventer un onglet");
  /* La coquille doit traiter ce null : rester muette afficherait un ecran blanc sans cause. */
  assert.match(COQUILLE(), /corrige !== null && corrige !== activeTab/, "la coquille ne distingue plus « rien a montrer » de « deja bon »");
});

test("F8 les listes d'onglets ecrites en dur ont disparu du depot", () => {
  /*
   * getTabsForRole / getMoreTabs etaient la deuxieme verite. Les supprimer est l'objet meme
   * du chantier : si l'un revient, la derivation est contournee quelque part.
   *
   * ON LIT LE CODE, PAS LES COMMENTAIRES — et ce n'est pas une precaution theorique : ce
   * releve a rougi a sa premiere execution parce que les deux noms figurent dans la prose
   * qui explique leur suppression. Un releve qui epingle un mot litteral attrape aussi le
   * mot quand on en PARLE.
   */
  const fichiers: [string, string][] = [
    ["src/app/pwaMobileShellConfig.tsx", "lazy("],
    ["src/app/PwaMobileShell.tsx", "renderView"],
    ["src/app/navigationMobileSources.ts", "SOURCES_NAV"],
  ];
  for (const [f, temoin] of fichiers) {
    const code = sansCommentaires(lire(f));
    /* Garde-fou du garde-fou, AVANT les assertions qu'il protege : si le retrait des
       commentaires avalait tout le fichier, elles passeraient sans rien verifier. */
    assert.ok(code.includes(temoin), `${f} : le code examine ne contient plus « ${temoin} », le releve ne prouve rien`);
    for (const mort of ["getTabsForRole", "getMoreTabs"]) {
      assert.ok(!code.includes(mort), `${f} : ${mort} est revenu — une liste parallele a la navigation`);
    }
  }
});

test("F9 chaque onglet rendable a une icone dans la source de SON role", () => {
  /*
   * ICONS est un Record<string, ReactNode>, pas un Record<ActiveView, ...> : une icone
   * oubliee ne leve AUCUNE erreur et rend un <span> vide. Sur une barre d'onglets, cela
   * donne une cellule sans pictogramme — et rien dans le build ne le signale.
   */
  const icones = (fichier: string) => {
    const s = lire(fichier);
    const i = s.indexOf("ICONS");
    assert.ok(i > 0, `ICONS introuvable dans ${fichier}`);
    return new Set([...s.slice(i, s.indexOf("};", i)).matchAll(/'?([a-z][a-z0-9-]*)'?:\s*</g)].map(m => m[1]));
  };
  const sources: Record<string, string> = {
    super_admin: "src/pages/superadmin/SuperAdminSidebar.tsx",
    admin: "src/pages/admin/navigationAdmin.tsx",
    vendor: "src/pages/vendor/navigationVendor.tsx",
  };
  for (const [role, fichier] of Object.entries(sources)) {
    const dispo = icones(fichier);
    const sans = VUES_TELEPHONE[role as RoleTelephone].filter(id => !dispo.has(id));
    assert.deepEqual(sans, [], `${role} : onglet(s) rendable(s) sans icone -> cellule vide dans la barre`);
  }
  /* Le client porte ses icones DANS ses items : on verifie que chacun en a une. */
  const clientSrc = lire("src/pages/client/navigationClient.tsx");
  for (const id of VUES_TELEPHONE.client) {
    assert.match(
      clientSrc,
      new RegExp(`id: '${id}'[^}]*icon:`),
      `client : l'onglet ${id} n'a pas d'icone dans ses items`,
    );
  }
});

// ===================== G. CRM IMMO RESTE CONDITIONNEL AU DROIT =====================

test("G1 l'entree CRM Immo n'est jamais declaree : elle est EMISE selon le droit", () => {
  /*
   * La raison est ecrite dans crmImmoSidebar.ts : un droit ne doit pas vivre dans un reglage
   * d'organisation visuelle, sinon deux clics — « Par defaut » puis « Valider » —
   * retireraient a une Societe son propre module, en base, sans qu'elle comprenne pourquoi.
   */
  const declares = idsDeclares("src/pages/admin/navigationAdmin.tsx", "LAYOUT_SECTIONS").map(e => e.id);
  assert.ok(!declares.includes("crm-immo"), "'crm-immo' est declare dans LAYOUT_SECTIONS : il serait emis sans droit");

  const sections: LayoutDefaultSection[] = [
    { title: "Principal", items: [{ id: "cabinet", label: "Cabinet" }, { id: "telecharger", label: "Télécharger" }] },
  ];
  const sans = sectionsAvecCrmImmo(sections, false);
  assert.ok(!sans[0].items.some(i => i.id === "crm-immo"), "sans droit, l'entree ne doit pas etre emise");
  assert.equal(sans, sections, "sans droit, l'identite du tableau doit etre PRESERVEE (sinon l'effet de chargement boucle)");

  const avec = sectionsAvecCrmImmo(sections, true);
  assert.deepEqual(avec[0].items.map(i => i.id), ["cabinet", "crm-immo", "telecharger"],
    "avec droit, l'entree doit s'inserer juste apres Cabinet");
});

test("G2 la coquille demande le droit, et son useMemo ne depend que du BOOLEEN", () => {
  /*
   * La dependance doit etre le booleen, jamais l'etat a quatre valeurs : l'identite du
   * tableau doit rester stable entre deux rendus, sinon `defaults` change a chaque fois et
   * l'effet de chargement de useSidebarLayout se relance en boucle — une panne invisible a
   * l'ecran, visible seulement au reseau.
   */
  const code = COQUILLE();
  assert.match(code, /useCrmImmoAccess\(role === 'admin' \? companyId : null\)/,
    "le droit n'est plus demande, ou il est demande pour des roles qui n'ont pas ce module");
  assert.match(code, /const crmImmoOuvert = peutOuvrirCrmImmo\(crmImmoAcces\)/, "le droit n'est plus reduit a un booleen");
  const memo = code.match(/sectionsAvecCrmImmo\(source\.sections, crmImmoOuvert\)[\s\S]{0,200}?\[[^\]]*\]/);
  assert.ok(memo, "l'injection conditionnelle a disparu de la coquille");
  const deps = memo[0].slice(memo[0].lastIndexOf("["));
  assert.match(deps, /^\[role, source\.sections, crmImmoOuvert\]$/,
    `la dependance du useMemo n'est plus le seul booleen : l'effet de chargement bouclerait (lu : ${deps})`);
  assert.ok(!deps.includes("crmImmoAcces"), "l'etat a quatre valeurs est revenu en dependance");
});

test("G3 tant que CRM Immo n'a pas de vue telephone, le filtre le retire — sans toucher au droit", () => {
  /* L'injection reste fidele au bureau ; c'est l'ensemble des vues qui decide de l'affichage.
     Le jour ou la vue arrive, il suffira de l'ajouter a VUES_TELEPHONE.admin. */
  assert.ok(!VUES_TELEPHONE.admin.includes("crm-immo"),
    "crm-immo est declare rendable : il faut alors un case dans renderView (voir F1)");
  const items = [{ id: "cabinet" }, { id: "crm-immo" }, { id: "crm" }];
  assert.deepEqual(
    filtrerRendables(items, VUES_TELEPHONE.admin).map(i => i.id),
    ["cabinet", "crm"],
    "le filtre doit retirer crm-immo tant qu'aucune vue ne lui correspond",
  );
});

// ===================== H. CHAQUE ROLE LIT SA PROPRE CONFIGURATION =====================

test("H1 chaque role lit SON panel : confondre les cles ferait lire a une Societe la barre de Talvex", () => {
  /* La cle de configuration est `v2:<panel>`. Un panel confondu ne provoque aucune erreur :
     il fait simplement lire la reorganisation de quelqu'un d'autre. */
  const code = SOURCES();
  for (const [role, panel] of [["super_admin", "super_admin"], ["admin", "admin"], ["vendor", "vendor"]] as const) {
    assert.match(
      code,
      new RegExp(`${role}: \\{ panel: '${panel}'`),
      `le role ${role} ne lit plus le panel ${panel}`,
    );
  }
  /* Les sections doivent voyager avec leur panel : les deux viennent du meme role. */
  assert.match(code, /admin: \{ panel: 'admin', sections: ADMIN_SECTIONS/, "le panel Societe ne lit plus ses propres sections");
  assert.match(code, /vendor: \{ panel: 'vendor', sections: VENDOR_SECTIONS/, "le panel Commercial ne lit plus ses propres sections");
  assert.match(code, /super_admin: \{ panel: 'super_admin', sections: SA_SECTIONS/, "le panel Talvex ne lit plus ses propres sections");
});

test("H2 le client ne lit JAMAIS un layout V2 : le crochet est rendu inerte pour lui", () => {
  /*
   * `LayoutPanel` ne contient pas 'client' : son panel n'existe pas. Sans ce drapeau, la
   * coquille d'un client lirait la cle `v2:admin` de son propre compte — une requete pour
   * rien, et une confusion de panel ecrite dans le code.
   */
  const code = COQUILLE();
  assert.match(code, /role !== 'client',\s*VUES_TELEPHONE\[role\]/,
    "le drapeau `actif` du crochet ne vaut plus `role !== 'client'`");
  const crochet = CROCHET();
  assert.match(crochet, /if \(!actif\) return;/, "le crochet lit encore la session quand il est inactif");
  assert.match(crochet, /entityUserId: actif \? userId : null/, "le crochet interroge encore la base quand il est inactif");

  /* Et son masquage passe par SON moteur, avec la MEME cle que sa barre laterale. */
  assert.match(code, /usePanelHiddenTabs\(role === 'client' \? 'client' : ''/,
    "le masquage du client n'est plus lu, ou il est lu pour les autres roles");
  const barreClient = lire("src/pages/client/ClientSidebar.tsx");
  assert.match(barreClient, /usePanelHiddenTabs\('client', null,/, "la barre laterale du client a change de cle : les deux cotes divergeraient");
});

test("H3 les onglets proteges de Talvex le restent, et les autres panels n'en inventent pas", () => {
  const code = SOURCES();
  assert.match(code, /protectedIds: PROTECTED_TAB_IDS/, "Talvex ne protege plus ses onglets");
  const protegees = lire("src/pages/superadmin/useSAHiddenTabs.ts");
  assert.match(protegees, /PROTECTED_TAB_IDS = \['dashboard', 'mon-compte', 'system'\]/, "la liste des onglets proteges a change");
  for (const id of ["dashboard", "mon-compte", "system"]) {
    assert.ok(VUES_TELEPHONE.super_admin.includes(id), `l'onglet protege ${id} n'a pas de vue telephone : il serait filtre alors qu'il est inmasquable`);
  }
});

test("H4 aucun onglet masque par defaut n'est declare rendable", () => {
  /* Un onglet `hidden: true` est absent de layout.visible : le declarer rendable serait du
     code mort, et surtout le signe qu'on a confondu « masque » et « pas encore porte ». */
  const paires: [RoleTelephone, string, string][] = [
    ["admin", "src/pages/admin/navigationAdmin.tsx", "LAYOUT_SECTIONS"],
    ["vendor", "src/pages/vendor/navigationVendor.tsx", "LAYOUT_SECTIONS"],
    ["super_admin", "src/pages/superadmin/SuperAdminSidebar.tsx", "LAYOUT_SECTIONS"],
  ];
  for (const [role, fichier, nom] of paires) {
    const masques = idsDeclares(fichier, nom).filter(e => e.masque).map(e => e.id);
    const faux = VUES_TELEPHONE[role].filter(id => masques.includes(id));
    assert.deepEqual(faux, [], `${role} : onglet(s) masque(s) par defaut declare(s) rendable(s)`);
  }
});

test("H5 tout onglet rendable est bien un onglet que son panel declare", () => {
  /* Un id rendable absent des sections de son panel n'apparaitrait jamais : le `case`
     existerait pour rien. C'est le miroir de F1, cote navigation plutot que cote rendu. */
  const paires: [RoleTelephone, string, string][] = [
    ["admin", "src/pages/admin/navigationAdmin.tsx", "LAYOUT_SECTIONS"],
    ["vendor", "src/pages/vendor/navigationVendor.tsx", "LAYOUT_SECTIONS"],
    ["super_admin", "src/pages/superadmin/SuperAdminSidebar.tsx", "LAYOUT_SECTIONS"],
    ["client", "src/pages/client/navigationClient.tsx", "BASE_SECTIONS"],
  ];
  for (const [role, fichier, nom] of paires) {
    const declares = idsDeclares(fichier, nom).map(e => e.id);
    const orphelins = VUES_TELEPHONE[role].filter(id => !declares.includes(id));
    assert.deepEqual(orphelins, [], `${role} : id(s) rendable(s) absent(s) des sections du panel -> case mort`);
  }
});

// ===================== I. LE WEB, LA PWA ET LE BUREAU NE CHANGENT PAS =====================

test("I1 le tableau de bord Talvex sur le web garde SON panel et ne filtre rien", () => {
  /*
   * Deuxieme appelant du crochet : sous 768 px, le tableau de bord Talvex du web affiche le
   * mini arc. Son routeur de vues (SAViewRouter) sait rendre les 24 onglets, donc il n'a
   * rien a cacher — et il ne doit SURTOUT pas heriter du filtre de la coquille telephone,
   * qui n'en declare que 11.
   */
  const code = sansCommentaires(lire("src/pages/superadmin/SuperAdminDashboard.tsx"));
  const appel = code.split("\n").find(l => l.includes("useTalixyMobileNav("));
  assert.ok(appel, "l'appel du crochet a disparu du tableau de bord Talvex");
  assert.match(appel, /useTalixyMobileNav\('super_admin', SA_SECTIONS, PROTECTED_TAB_IDS, activeView\)/,
    "le tableau de bord Talvex ne passe plus son panel, ou s'est mis a filtrer ses onglets");
  assert.ok(!appel.includes("VUES_TELEPHONE"), "le web herite du filtre telephone : 13 onglets disparaitraient du bureau");
});

test("I2 sans ensemble declare, le crochet ne filtre RIEN", () => {
  /* Contre-temoin du filtre : c'est ce qui garantit que I1 tient par construction. */
  const items = [{ id: "a" }, { id: "b" }];
  assert.equal(filtrerRendables(items, ["a", "b"]).length, 2, "un ensemble complet ne doit rien retirer");
  assert.match(CROCHET(), /rendables\?: readonly string\[\]/, "l'ensemble declare n'est plus optionnel : le web serait filtre");
});

test("I3 les routeurs de vues du bureau gardent TOUS leurs onglets", () => {
  /* Le filtre est propre a la coquille telephone. Si l'un de ces routeurs maigrissait, le
     bureau perdrait des pages — exactement l'inverse du but. */
  const sa = lire("src/pages/superadmin/SAViewRouter.tsx");
  const nbSA = [...sa.matchAll(/case '[^']+':/g)].length;
  assert.ok(nbSA >= 24, `SAViewRouter ne rend plus que ${nbSA} onglets : le bureau Talvex a maigri`);
  const admin = lire("src/pages/admin/dashboard/AdminViewRenderer.tsx");
  const nbAdmin = [...admin.matchAll(/case '[^']+':/g)].length;
  assert.ok(nbAdmin >= 24, `AdminViewRenderer ne rend plus que ${nbAdmin} onglets : le bureau Societe a maigri`);
  for (const f of ["src/pages/superadmin/SAViewRouter.tsx", "src/pages/admin/dashboard/AdminViewRenderer.tsx"]) {
    assert.ok(!lire(f).includes("VUES_TELEPHONE"), `${f} s'est mis a filtrer : le bureau perdrait des onglets`);
  }
});

test("I4 les barres laterales rendent toujours la navigation, depuis son nouveau foyer", () => {
  /* La definition a quitte les composants ; ils doivent l'importer, pas en garder une copie. */
  const paires: [string, string][] = [
    ["src/pages/admin/Sidebar.tsx", "./navigationAdmin"],
    ["src/pages/vendor/VendorSidebar.tsx", "./navigationVendor"],
    ["src/pages/client/ClientSidebar.tsx", "./navigationClient"],
  ];
  for (const [composant, module] of paires) {
    const code = lire(composant);
    assert.ok(code.includes(`from '${module}'`), `${composant} n'importe plus sa navigation depuis ${module}`);
    assert.ok(
      !/^(export )?const (LAYOUT_SECTIONS|BASE_SECTIONS)/m.test(sansCommentaires(code)),
      `${composant} a de nouveau sa propre copie des sections : deux verites`,
    );
  }
});

// ===================== J. L'INSTRUMENTATION DE DIAGNOSTIC =====================

test("J1 plus aucun journal de diagnostic ne part dans l'APK", () => {
  /*
   * L'instrumentation [SIDEBAR-V2-DEBUG] etait marquee « a retirer apres diagnostic » depuis
   * son ecriture. Elle n'etait plus seulement inutile : depuis que la coquille telephone tire
   * sa navigation de ce crochet, elle partait dans l'APK — trois a quatre lignes par montage,
   * avec la signature complete des onglets d'une Societe, dans la console d'un telephone de
   * production.
   */
  /* ON LIT LE CODE, PAS LES COMMENTAIRES : le nom de l'instrumentation figure encore dans la
     prose qui explique son retrait, et ce releve a rougi pour cette raison a sa premiere
     execution. Meme piege qu'en F8. */
  const code = sansCommentaires(lire("src/hooks/useSidebarLayout.ts"));
  assert.ok(!code.includes("SIDEBAR-V2-DEBUG"), "l'instrumentation de diagnostic est revenue");
  assert.ok(!/console\.log/.test(code), "useSidebarLayout journalise de nouveau");
  /* Garde-fou du garde-fou : si le fichier avait ete vide, les deux assertions passeraient. */
  assert.match(code, /export function useSidebarLayout/, "le crochet lui-meme a disparu du fichier examine");
  assert.match(code, /const visible = useMemo\(\(\) => visibleEntries\(entries\)/, "le calcul de layout.visible a disparu");
});
