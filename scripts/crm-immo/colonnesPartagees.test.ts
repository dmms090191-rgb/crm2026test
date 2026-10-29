// Les colonnes suivent la Societe, pas l'ordinateur. Et aucune configuration n'est detruite.
//   node --import tsx --test scripts/crm-immo/colonnesPartagees.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  cleReglage, cleReglagePartage, reglageValide, reglageNonVide,
  ordonnerSysteme, toutesLesColonnes, REGLAGE_VIDE,
} from "../../src/lib/crmImmoColonnes.ts";
import { COLONNES_SYSTEME } from "../../src/pages/admin/views/crm-immo/crmImmoTypes.ts";
import type { DossierImmo } from "../../src/pages/admin/views/crm-immo/crmImmoTypes.ts";
import { valeurAffichee } from "../../src/lib/crmImmoRecherche.ts";
import { nomCanonique } from "../../src/lib/crmImmoIdentite.ts";

/*
 * ============== CE QUE CE FICHIER TIENT ==============
 *
 * David, le 27/10/2026 : « Pour une meme societe, l'ordre et/ou la visibilite des colonnes
 * ne s'affichent pas pareil suivant l'ordinateur. »
 *
 * LA CAUSE, MESUREE : l'ordre et le masquage des colonnes SYSTEME ne vivaient QUE dans le
 * localStorage. La cle nommait bien la Societe, mais le support etait le NAVIGATEUR : elle
 * separait deux Societes dans un meme navigateur, et ne rapprochait JAMAIS deux navigateurs
 * d'une meme Societe. Et la divergence etait TOTALE, pas partielle — mesure en base, role
 * postgres : `select count(*) from crm_immo_colonnes` rend 0, donc 100 % des colonnes
 * affichees sont systeme, donc 100 % de la configuration vivait dans les navigateurs.
 *
 * ---------- LE RISQUE QUI COMMANDE LA MOITIE DE CES RELEVES ----------
 *
 * La correction evidente — « au chargement, si la base est vide, y pousser le reglage
 * local » — DETRUIT DE LA CONFIGURATION, sans rattrapage. Le premier poste a ouvrir gagne ;
 * le second relit le distant, reecrit son propre cache avec, et son ordre d'origine
 * n'existe plus nulle part. Une course decide.
 *
 * Et ce n'est pas theorique : le jeu de cles systeme a ete REMPLACE le 23/10/2026. Quatre
 * cles ont disparu (nom, prenom, locataire, proprietaire), trois sont arrivees
 * (np_locataire, np_proprietaire, mode_paiement). Sur un poste range avant cette date, les
 * cles mortes sont silencieusement jetees par ordonnerSysteme, et np_locataire — LA COLONNE
 * QUI IDENTIFIE LA LIGNE, non masquable — se retrouve en DERNIERE position. Promouvoir un
 * tel reglage l'aurait propage a toute la Societe.
 *
 * D'ou la regle tranchee par David le 28/10, que les releves B verrouillent : la base ne se
 * remplit qu'au PREMIER GESTE EXPLICITE dans la modale Colonnes.
 */

const lire = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const HOOK = "src/pages/admin/views/crm-immo/useCrmImmoColonnes.ts";
const DISTANT = "src/hooks/crmImmoReglageDistant.ts";
const CARTES = "src/pages/admin/views/crm-immo/CrmImmoCards.tsx";

// ===================== A. LA SOURCE PARTAGEE =====================

test("A1 la cle partagee nomme la Societe, et n'est pas celle du cache local", () => {
  /*
   * Le companyId DOIT figurer dans la cle : useCompanyId rend la Societe VISUALISEE, donc
   * un Talvex Administrateur qui regarde la Societe A puis la B ecraserait l'une avec
   * l'autre si la cle ne les distinguait pas.
   */
  assert.equal(cleReglagePartage("abc"), "crm_immo_colonnes:abc");
  assert.notEqual(cleReglagePartage("abc"), cleReglage("abc"));
  assert.match(cleReglage("abc"), /^talvex_/, "le cache local a garde sa propre cle");
});

test("A2 aucune migration : la preference entre dans une structure qui existe deja", () => {
  /*
   * `user_preferences.sidebar_orders` est un dictionnaire jsonb a cles libres, deja porteur
   * de neuf cles venues de trois moteurs. Si un fichier de migration apparaissait pour ce
   * chantier, c'est qu'on aurait choisi une autre voie — et David a demande l'inverse.
   */
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url))
    .filter(f => f.endsWith(".sql"));
  const coupables = migrations.filter(f => lire("supabase/migrations/" + f).includes("crm_immo_colonnes:"));
  assert.deepEqual(coupables, [], "une migration a ete creee pour une preference qui n'en demande pas");

  /*
   * ON COMPTE, ON NE CONSTATE PAS. Une passe de mutation l'a montre : en deplacant la
   * SEULE table de la fonction de lecture, un releve qui cherchait la presence du nom
   * restait vert — la fonction d'ECRITURE, elle, le contenait encore. Les deux acces
   * doivent viser la meme table, sinon on lit a un endroit et on ecrit a un autre.
   */
  const code = sansCommentaires(lire(DISTANT));
  /* TROIS acces, et il faut les compter tous : la lecture, la relecture qui precede
     l'ecriture, et l'upsert lui-meme. J'avais ecrit deux, en oubliant l'upsert — le releve
     rougissait sur un fichier correct. Compter exige de savoir ce qu'on compte. */
  const tables = (code.match(/from\('user_preferences'\)/g) ?? []).length;
  assert.equal(tables, 3, `les TROIS acces doivent viser user_preferences, ${tables} trouve(s)`);
  assert.match(code, /select\('sidebar_orders'\)/, "la preference n'est plus rangee dans sidebar_orders");
  assert.ok(!/from\('(?!user_preferences)[^']+'\)/.test(code),
    "une autre table est interrogee : la preference a change de foyer");
});

test("A3 la lecture d'un stockage abime ne vide pas le tableau", () => {
  /* Ce qui sort d'un jsonb n'est verifie par personne. Le meme garde-fou protege le cache
     local et la base : deux stockages, une seule regle de lecture. */
  assert.deepEqual(
    reglageValide({ ordreSysteme: ["email", 42, "telephone"], masqueesSysteme: ["commentaire"] }),
    { ordreSysteme: ["email", "telephone"], masqueesSysteme: ["commentaire"] },
    "une entree parasite doit etre FILTREE, pas faire perdre tout le rangement",
  );
  for (const absurde of [null, undefined, 42, "texte", [], { autre: 1 }]) {
    assert.equal(reglageValide(absurde), null, `${JSON.stringify(absurde)} devrait rendre null`);
  }
  /* Le point le plus important de cette fonction : « rien d'enregistre » et « enregistre
     vide » sont DEUX ETATS, et seul le premier veut dire « ne touche a rien ». */
  assert.deepEqual(reglageValide({ ordreSysteme: [], masqueesSysteme: [] }), REGLAGE_VIDE);
  assert.notEqual(reglageValide({ ordreSysteme: [], masqueesSysteme: [] }), null);

  /*
   * UN REGLAGE PARTIEL RESTE EXPLOITABLE — et c'est une passe de mutation qui a montre que
   * ce cas manquait. Remplacer le `&&` du garde par un `||` ne changeait RIEN sur les cas
   * ci-dessus : il ne mord que sur un objet dont UNE SEULE des deux listes est presente.
   * Or c'est exactement ce qu'on trouve dans un stockage ancien ou ecrit a la main, et le
   * jeter entier ferait perdre a quelqu'un son rangement complet.
   */
  assert.deepEqual(
    reglageValide({ ordreSysteme: ["email", "telephone"] }),
    { ordreSysteme: ["email", "telephone"], masqueesSysteme: [] },
    "un reglage sans masquages doit garder son ordre",
  );
  assert.deepEqual(
    reglageValide({ masqueesSysteme: ["commentaire"] }),
    { ordreSysteme: [], masqueesSysteme: ["commentaire"] },
    "un reglage sans ordre doit garder ses masquages",
  );
});

// ===================== B. AUCUNE CONFIGURATION N'EST DETRUITE =====================

test("B1 la base ne fait autorite QUE si elle a quelque chose", () => {
  /*
   * LE RELEVE CENTRAL DE CE CHANTIER. Appliquer un reglage distant NUL ecraserait la
   * configuration locale par du vide — et comme le cache est reecrit juste apres, l'ordre
   * d'origine n'existerait plus NULLE PART. C'est le patron de useSidebarOrder (garde sur
   * le distant) et surtout PAS celui de useSidebarLayout, qui applique le distant meme nul.
   */
  const code = sansCommentaires(lire(HOOK));
  assert.match(code, /if \(!vivant \|\| !distant\) return;/,
    "le garde sur un reglage distant absent a disparu : une base vide ecraserait le local");
  /* On decoupe sur l'APPEL, pas sur le nom : `code.indexOf("lireReglageDistant")` tombe sur
     la ligne d'IMPORT, qui importe aussi `ecrireReglageDistant` — le releve se mordait la
     queue et rougissait sur un fichier correct. Meme famille de piege que partout ailleurs
     dans ce depot : un releve qui epingle un mot attrape aussi le mot quand on le DECLARE. */
  const debutEffet = code.indexOf("void lireReglageDistant(");
  assert.ok(debutEffet > 0, "l'effet de lecture distante est introuvable");
  const effet = code.slice(debutEffet, code.indexOf("const enregistrerReglage"));
  assert.ok(effet.length > 50, "l'effet de lecture distante est vide");
  assert.ok(!effet.includes("ecrireReglageDistant"),
    "AMORCAGE AUTOMATIQUE : l'effet de chargement ecrit en base. Le premier poste a ouvrir gagnerait.");
});

test("B2 un seul point d'ecriture, et c'est un GESTE de l'utilisateur", () => {
  /* La base ne doit se remplir qu'au premier changement explicite dans la modale Colonnes. */
  const code = sansCommentaires(lire(HOOK));
  const ecritures = (code.match(/ecrireReglageDistant\(/g) ?? []).length;
  assert.equal(ecritures, 1, `une seule ecriture distante attendue, ${ecritures} trouvee(s)`);
  const bloc = code.slice(code.indexOf("const enregistrerReglage"));
  assert.match(bloc, /ecrireReglageDistant\(/, "l'ecriture n'est plus dans enregistrerReglage");
  /* Et enregistrerReglage n'est appele que depuis la modale : CrmImmo le passe en onReglage. */
  assert.match(sansCommentaires(lire("src/pages/admin/views/CrmImmo.tsx")),
    /onReglage=\{col\.enregistrerReglage\}/, "la modale n'est plus cablee au point d'ecriture");
});

test("B3 jamais de cle parasite quand l'identite n'est pas encore resolue", () => {
  /* companyId et l'auth id se resolvent de facon asynchrone. Ecrire trop tot creerait une
     cle `crm_immo_colonnes:none` qui polluerait la ligne de preferences pour toujours. */
  const code = sansCommentaires(lire(HOOK));
  assert.match(code, /if \(proprietaireReglage && companyId\) \{/,
    "l'ecriture distante n'est plus gardee par la presence des deux identifiants");
  assert.match(code, /if \(!proprietaireReglage \|\| !companyId\) return;/,
    "la lecture distante n'est plus gardee");
});

test("B4 l'ecriture PRESERVE les neuf autres cles de sidebar_orders", () => {
  /*
   * `sidebar_orders` porte les reglages de TOUS les moteurs : barre laterale V2,
   * preferences d'actions, cartes de notification. Un upsert sans relire-fusionner
   * effacerait la barre laterale de l'utilisateur. Les trois patrons du depot relisent
   * tous avant d'ecrire.
   */
  const code = sansCommentaires(lire(DISTANT));
  const ecriture = code.slice(code.indexOf("export async function ecrireReglageDistant"));
  assert.match(ecriture, /\.\.\.courant,/, "la fusion a disparu : les autres cles seraient effacees");
  const iLecture = ecriture.indexOf("select('sidebar_orders')");
  const iUpsert = ecriture.indexOf(".upsert(");
  assert.ok(iLecture > 0 && iLecture < iUpsert, "l'upsert precede la relecture : la fusion ne protege rien");
  assert.match(ecriture, /onConflict: 'user_id'/, "la cle de conflit n'est plus la cle primaire");
});

test("B5 une LECTURE qui echoue n'autorise pas une ecriture", () => {
  /*
   * Une lecture en echec n'est pas une ligne absente. Ecrire quand meme partirait avec un
   * `courant` vide et effacerait les neuf autres cles — exactement ce que B4 empeche. Une
   * ligne absente, elle, rend data: null SANS erreur, et c'est le cas normal du premier
   * enregistrement.
   */
  const code = sansCommentaires(lire(DISTANT));
  const ecriture = code.slice(code.indexOf("export async function ecrireReglageDistant"));
  assert.match(ecriture, /if \(erreurLecture\) return erreurLecture\.message;/,
    "une lecture en echec laisse desormais passer l'ecriture : les autres cles seraient perdues");
  assert.ok(ecriture.indexOf("if (erreurLecture)") < ecriture.indexOf(".upsert("),
    "le garde arrive apres l'ecriture : il ne protege rien");
});

// ===================== C. L'IDENTITE QUI PORTE LA PREFERENCE =====================

test("C1 l'identite DESCEND, elle n'est pas relue par un aller-retour serveur", () => {
  /*
   * useAuthUserId appelle supabase.auth.getUser(), un aller-retour serveur de 72 ms de
   * mediane. Le commit ee04a89 — « CRM Immo : quatre allers-retours auth retires de
   * l'ouverture » — l'a justement chasse de ce chemin. AdminDashboard tient deja cet id,
   * lu par getSession, donc sans reseau.
   */
  const code = sansCommentaires(lire(HOOK));
  assert.match(code, /export function useCrmImmoColonnes\(proprietaireReglage: string \| null\)/,
    "le crochet ne recoit plus l'identite en parametre");
  assert.ok(!code.includes("useAuthUserId"), "useAuthUserId est revenu : un cinquieme aller-retour auth");
  assert.ok(!code.includes("auth.getUser"), "getUser est revenu dans le chemin d'ouverture du module");
});

test("C2 la chaine est complete, du panel jusqu'au crochet", () => {
  /* Un seul maillon manquant et la preference redevient locale, en silence : le parametre
     vaudrait null et le crochet se contenterait du cache. */
  assert.match(sansCommentaires(lire("src/pages/admin/dashboard/AdminViewRenderer.tsx")),
    /proprietaireReglage=\{effectiveAdminId\}/, "le panel ne descend plus l'identite a la Porte");
  assert.match(sansCommentaires(lire("src/pages/admin/dashboard/CrmImmoGate.tsx")),
    /<CrmImmo proprietaireReglage=\{proprietaireReglage\} \/>/, "la Porte ne descend plus l'identite au module");
  assert.match(sansCommentaires(lire("src/pages/admin/views/CrmImmo.tsx")),
    /useCrmImmoColonnes\(proprietaireReglage\)/, "le module ne passe plus l'identite au crochet");
});

test("C3 c'est l'entite VISUALISEE, pas l'observateur", () => {
  /*
   * Regle que le depot s'est donnee (AppShell : « une preference suit l'entite VISUALISEE,
   * pas l'observateur »), confirmee par David le 28/10. effectiveAdminId vaut
   * `impersonatedAdmin?.id ?? adminAuthId` : en Visu, c'est bien la Societe regardee.
   */
  const dashboard = sansCommentaires(lire("src/pages/admin/AdminDashboard.tsx"));
  assert.match(dashboard, /effectiveAdminId = impersonatedAdmin\?\.id \?\? adminAuthId/,
    "effectiveAdminId ne designe plus l'entite visualisee");
});

// ===================== D. LA FICHE MOBILE QUI SE REPETAIT =====================

test("D1 aucune cle morte dans l'entete des fiches mobiles", () => {
  /*
   * LE DEFAUT, mesure le 27/10 : le Set contenait 'nom' et 'prenom', disparus de
   * COLONNES_SYSTEME le 23/10 au profit de la colonne composee 'np_locataire'. L'exclusion
   * ne correspondait plus a rien et echouait EN SILENCE — aucun type ne verifie un Set de
   * chaines face a des cles qui ont change. Sur telephone, le nom du locataire s'affichait
   * DEUX FOIS par fiche : une fois en titre, une fois dans la grille.
   *
   * Ce releve est GENERIQUE : il ne verifie pas trois litteraux choisis, il exige que
   * CHAQUE cle du Set existe reellement. Il aurait attrape le defaut du 23/10, et il
   * attrapera le prochain renommage.
   */
  const code = lire(CARTES);
  const bloc = code.match(/DANS_L_ENTETE = new Set\(\[([^\]]*)\]\)/);
  assert.ok(bloc, "le Set de l'entete est introuvable");
  const cles = [...bloc[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(cles.length > 0, "le Set est vide : tout serait repete dans la grille");

  const connues = new Set(COLONNES_SYSTEME.map(d => d.cle as string));
  const mortes = cles.filter(c => !connues.has(c));
  assert.deepEqual(mortes, [], "cle(s) morte(s) dans DANS_L_ENTETE : l'exclusion echouera en silence");
});

test("D2 le nom du locataire ne peut plus s'afficher deux fois", () => {
  /*
   * L'entete rend `[prenom, nom]`. La colonne qui porte ces deux champs est la composee
   * np_locataire : si elle n'est pas exclue, la grille la repete sous l'entete.
   */
  const code = lire(CARTES);
  const cles = [...(code.match(/DANS_L_ENTETE = new Set\(\[([^\]]*)\]\)/) ?? [])[1]
    .matchAll(/'([^']+)'/g)].map(m => m[1]);

  const titre = COLONNES_SYSTEME.find(d => d.composeDe?.[0] === "nom" && d.composeDe?.[1] === "prenom");
  assert.ok(titre, "la colonne qui reunit nom et prenom a disparu de COLONNES_SYSTEME");
  assert.ok(cles.includes(titre.cle as string),
    `${titre.cle} n'est pas exclue de la grille : le nom du locataire s'afficherait deux fois`);

  /*
   * REECRIT LE 28/10/2026 : ASSERTION DE COMPORTEMENT, PLUS DE SOURCE.
   *
   * Ce test epinglait la composition ecrite a la main dans le code de la carte. C etait
   * fragile pour une raison de fond : il figeait un ORDRE que le module contredisait
   * ailleurs. Le tableau joignait nom puis prenom, la carte prenom puis nom, et ce
   * releve CERTIFIAIT le desaccord au lieu de l attraper.
   *
   * L invariant reel est ailleurs : l entete de la carte et la colonne du tableau
   * doivent dire EXACTEMENT la meme chose. C est ce qu on verifie maintenant, et cela
   * mord quel que soit l ordre choisi — ce qui est precisement l interet.
   */
  assert.match(sansCommentaires(code), /nomCanonique\(d\.nom_complet_locataire, d\.nom, d\.prenom\)/,
    "l entete de la carte ne passe plus par la primitive d identite partagee");

  const dossierTemoin = {
    nom: 'Dupont', prenom: 'Jean', locataire: 'Cohen', proprietaire: 'Sarah',
    nom_complet_locataire: null, nom_complet_proprietaire: null,
  } as unknown as DossierImmo;
  const colonneNP = toutesLesColonnes({
    systeme: COLONNES_SYSTEME, perso: [], reglage: { ordreSysteme: [], masquees: [] },
  }).find(c => c.famille === 'systeme' && c.cle === titre.cle);
  assert.ok(colonneNP, 'la colonne N/P du locataire a disparu du tableau');
  assert.equal(
    nomCanonique(dossierTemoin.nom_complet_locataire, dossierTemoin.nom, dossierTemoin.prenom),
    valeurAffichee(dossierTemoin, colonneNP),
    'la carte et le tableau ne nomment plus le locataire de la meme facon');
});

// ===================== E. CE QUI NE DOIT PAS AVOIR BOUGE =====================

test("E1 une colonne inconnue du reglage reste VISIBLE, et a la fin", () => {
  /* Comportement d'origine, a ne pas perdre en changeant de support : un reglage perime ne
     doit jamais faire DISPARAITRE une colonne arrivee depuis. */
  const perime = { ordreSysteme: ["email", "np_locataire"], masqueesSysteme: [] };
  const ordre = ordonnerSysteme(COLONNES_SYSTEME, perime).map(d => d.cle as string);
  assert.equal(ordre.length, COLONNES_SYSTEME.length, "une colonne a ete perdue");
  assert.deepEqual(ordre.slice(0, 2), ["email", "np_locataire"], "l'ordre memorise n'est plus respecte");
  const visibles = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: perime })
    .filter(c => !c.masquee);
  assert.equal(visibles.length, COLONNES_SYSTEME.length, "une colonne inconnue du reglage arrive masquee");
});

test("E2 la colonne qui identifie la ligne reste non masquable", () => {
  /* Un reglage bricole — ou promu depuis un poste perime — ne doit pas pouvoir vider le
     tableau de ce qui identifie ses lignes. */
  const triche = { ordreSysteme: [], masqueesSysteme: ["np_locataire"] };
  const col = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: triche })
    .find(c => c.famille === "systeme" && c.cle === "np_locataire");
  assert.ok(col, "np_locataire a disparu");
  assert.equal(col.masquee, false, "np_locataire est devenue masquable : le tableau peut perdre son identifiant");
});

test("E3 `reglageNonVide` distingue un rangement d'une absence de rangement", () => {
  assert.equal(reglageNonVide(null), false);
  assert.equal(reglageNonVide(REGLAGE_VIDE), false);
  assert.equal(reglageNonVide({ ordreSysteme: ["email"], masqueesSysteme: [] }), true);
  assert.equal(reglageNonVide({ ordreSysteme: [], masqueesSysteme: ["email"] }), true);
});
