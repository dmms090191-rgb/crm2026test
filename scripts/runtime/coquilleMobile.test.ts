// Ce que l'APK affiche vraiment : la coquille telephone et ce qui l'alimente.
//   node --test scripts/runtime/coquilleMobile.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
 */

const lire = (f: string) => readFileSync(f, "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const APP = () => sansCommentaires(lire("src/App.tsx"));
const COQUILLE = () => sansCommentaires(lire("src/app/PwaMobileShell.tsx"));

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
   * Les neuf vues montees ici n'ont aucun padding a elles — c'est le conteneur qui le
   * donne, comme sur le bureau. Sans lui, chaque carte et chaque bordure touche les deux
   * bords de l'ecran. C'est le premier motif qui fait dire « l'interface n'est pas bonne ».
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
   * useSimulation LEVE hors fournisseur (SimulationContext.tsx). Les vues de messagerie
   * l'appellent. Sur le bureau, AdminDashboard enveloppe tout ; la coquille telephone
   * monte ces memes vues sans passer par lui. Mesure du 26/10/2026 : appuyer sur CRM ou
   * Clients remplacait l'ecran ENTIER, barre d'onglets comprise, par un ecran d'erreur.
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
   */
  const code = COQUILLE();
  assert.match(code, /fullName: userName/, "le nom n'est plus passe a la vue d'accueil");
  assert.match(code, /email: userEmail/, "l'e-mail n'est plus passe a la vue d'accueil");
  assert.match(code, /companyName/, "le nom de Societe n'est plus passe a la vue d'accueil");

  /*
   * ON COMPTE, ON NE CONSTATE PAS. La vue d'accueil est montee a DEUX endroits : le
   * `case 'vue-ensemble'` et le `default` du meme switch. Une passe de mutation l'a
   * revele : en retirant les props d'une seule des deux, un releve qui se contentait de
   * trouver le motif restait vert — et le `default`, qui est le chemin le plus
   * emprunte au premier lancement, aurait de nouveau affiche des champs vides.
   */
  const montages = code.match(/<AdminVueEnsemble \{\.\.\.identite\} \/>/g) ?? [];
  assert.equal(
    montages.length,
    2,
    `les DEUX montages de la vue d'accueil doivent porter les props (case et default), ${montages.length} trouve(s)`,
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
