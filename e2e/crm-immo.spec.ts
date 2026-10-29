import { test, expect, type Page } from '@playwright/test';
import { loginWith } from './helpers/auth';
import { session, rest, type Session } from './helpers/boutique3d';

/**
 * CRM IMMO — LE PARCOURS REEL, chez une Societe qui possede le module.
 *
 * Ce que cette suite protege, dans l'ordre ou une agence immobiliere le vit :
 *   1. l'onglet mene a SA page, et pas au Dashboard (le `default:` du switch de
 *      AdminViewRenderer ouvre la Vue d'ensemble sans aucune erreur : seul un test de
 *      CONTENU attrape cet oubli) ;
 *   2. « Ajouter un client » cree une ligne REELLE, verifiee en base ;
 *   3. la modification enregistre, et le declencheur refuse la date imposee par le client ;
 *   4. la suppression demande confirmation et supprime — verifie en base ;
 *   5. recherche, tri et filtres reduisent la liste sans la casser ;
 *   6. une colonne personnalisee se cree, se renomme, et sa valeur SURVIT au renommage ;
 *   7. la cloche du module compte, et la pastille GENERALE compte avec elle — les
 *      alertes CRM Immo sont la dixieme categorie du hub Notifications depuis le
 *      20 octobre 2026, pour les Societes qui possedent le module.
 *
 * ---------- POURQUOI LE COMPTE N'EST PAS DANS LE DEPOT ----------
 *
 * Le PIN de l'administratrice de la Societe equipee lui appartient. Il n'a rien a faire
 * dans un depot public, et il n'est pas a deviner. Fournir E2E_IMMO_EMAIL et E2E_IMMO_PIN
 * active la suite ; sans eux elle est SAUTEE en le disant, plutot que de passer pour
 * rien. C'est volontaire : un test vert qui n'a rien execute est pire qu'un test absent.
 *
 * ---------- UNE ECRITURE REFUSEE NE LEVE AUCUNE ERREUR ----------
 *
 * supabase-js rend { error: null } et zero ligne quand la RLS refuse un UPDATE. Chaque
 * assertion de cette suite verifie donc l'etat EN BASE, jamais le seul fait que
 * l'interface n'a pas affiche d'erreur.
 */

test.describe.configure({ mode: 'serial' });

const CAPTURES = 'test-results/captures-crm-immo';
const PREFIXE = '[TEST] immo';
const IMMO_EMAIL = process.env.E2E_IMMO_EMAIL || '';
const IMMO_PIN = process.env.E2E_IMMO_PIN || '';

let s: Session | null = null;

test.beforeEach(() => {
  test.skip(!IMMO_EMAIL || !IMMO_PIN,
    'E2E_IMMO_EMAIL / E2E_IMMO_PIN absents : le compte de la Societe equipee n est pas dans le depot');
});

/** Les dossiers [TEST] encore en base pour cette Societe. */
async function dossiersEnBase(sess: Session) {
  const r = await rest(sess, `crm_immo_dossiers?nom=like.${encodeURIComponent(PREFIXE + '%')}&select=id,nom,prenom,locataire,proprietaire,jour_encaissement,date_fin_contrat,valeurs,updated_at`);
  return (r.corps ?? []) as Array<Record<string, unknown>>;
}

async function colonnesEnBase(sess: Session) {
  const r = await rest(sess, `crm_immo_colonnes?nom=like.${encodeURIComponent(PREFIXE + '%')}&select=id,nom,type,position,masquee`);
  return (r.corps ?? []) as Array<{ id: string; nom: string; type: string }>;
}

/** Va a l'onglet CRM Immo. Il peut etre EN BAS de la barre laterale : reconcileLayout
 *  ajoute tout onglet neuf a la fin d'une configuration deja enregistree. */
async function allerAuCrmImmo(page: Page) {
  const entree = page.locator('aside').getByText('CRM Immo', { exact: true }).first();
  const dehors = async () => {
    const b = await entree.boundingBox().catch(() => null);
    return !b || b.x < 0;
  };
  if (await dehors()) {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    await expect.poll(dehors, { timeout: 15_000, message: "la barre laterale ne s est pas ouverte" }).toBe(false);
  }
  await entree.click();
  await expect(page.getByTestId('crm-immo-titre')).toBeVisible({ timeout: 30_000 });
}

test.afterAll(async () => {
  if (!s) return;
  await rest(s, `crm_immo_dossiers?nom=like.${encodeURIComponent(PREFIXE + '%')}`, { method: 'DELETE' });
  await rest(s, `crm_immo_colonnes?nom=like.${encodeURIComponent(PREFIXE + '%')}`, { method: 'DELETE' });
  expect((await dossiersEnBase(s)).length, 'des dossiers [TEST] subsistent en base').toBe(0);
  expect((await colonnesEnBase(s)).length, 'des colonnes [TEST] subsistent en base').toBe(0);
});

test('l onglet CRM Immo mene a SA page, pas au Dashboard', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  s = await session(page);
  await allerAuCrmImmo(page);

  /* Du contenu qu'aucune autre vue ne porte. */
  await expect(page.getByTestId('crm-immo-ajouter')).toBeVisible();
  await expect(page.getByTestId('crm-immo-recherche')).toBeVisible();
  await expect(page.getByTestId('crm-immo-cloche-bouton')).toBeVisible();
  /* Et surtout : le refus N'est PAS affiche, donc le droit a bien ete reconnu. */
  await expect(page.getByTestId('crm-immo-refus')).toHaveCount(0);

  await page.screenshot({ path: `${CAPTURES}/1-module-ouvert.png`, fullPage: false });
});

test('Ajouter un client cree une ligne REELLE, avec ses 10 champs', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  await page.getByTestId('crm-immo-ajouter').click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).toBeVisible();

  /* Le bouton est desactive tant que le nom manque : la base le refuserait de toute
     facon (NOT NULL + CHECK btrim), mais un refus cote base revient en message Postgres. */
  await expect(page.getByTestId('crm-immo-dossier-valider')).toBeDisabled();

  await page.getByTestId('crm-immo-champ-nom_complet_locataire').fill(`${PREFIXE} Dupont Jean`);
  await page.getByTestId('crm-immo-champ-email').fill('jean.dupont@exemple.fr');
  await page.getByTestId('crm-immo-champ-telephone').fill('0601020304');
  await page.getByTestId('crm-immo-champ-date_entree').fill('2025-01-01');
  await page.getByTestId('crm-immo-champ-date_fin_contrat').fill('2026-12-15');
  /* Le nom COMPLET du proprietaire, en un seul champ. Deux mots, pour que la ligne
     prouve au passage qu'aucune decoupe n'a lieu. */
  await page.getByTestId('crm-immo-champ-nom_complet_proprietaire').fill('Cohen Sarah');
  await page.getByTestId('crm-immo-champ-jour_encaissement').fill('5');
  await page.getByTestId('crm-immo-champ-commentaire').fill('bail 3 ans');

  await expect(page.getByTestId('crm-immo-dossier-valider')).toBeEnabled();
  await page.screenshot({ path: `${CAPTURES}/2-formulaire-rempli.png` });
  await page.getByTestId('crm-immo-dossier-valider').click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).not.toBeVisible({ timeout: 15_000 });

  /* EN BASE, et pas seulement a l'ecran. */
  const lignes = await dossiersEnBase(s!);
  expect(lignes.length, 'le dossier n a pas ete cree en base').toBe(1);
  expect(lignes[0].locataire).toBe('Jean Dupont');
  expect(lignes[0].proprietaire).toBe('Sarah Cohen');
  expect(lignes[0].jour_encaissement).toBe(5);
});

test('un jour d encaissement hors de 1-31 est refuse AVANT l aller-retour', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  await page.getByTestId('crm-immo-ajouter').click();
  await page.getByTestId('crm-immo-champ-nom_complet_locataire').fill(`${PREFIXE} Refus`);
  await page.getByTestId('crm-immo-champ-jour_encaissement').fill('32');
  await expect(page.getByTestId('crm-immo-dossier-probleme')).toBeVisible();
  await expect(page.getByTestId('crm-immo-dossier-valider')).toBeDisabled();

  /* Et la date de fin avant la date d'entree, l'autre CHECK de la base. */
  await page.getByTestId('crm-immo-champ-jour_encaissement').fill('5');
  await page.getByTestId('crm-immo-champ-date_entree').fill('2026-06-01');
  await page.getByTestId('crm-immo-champ-date_fin_contrat').fill('2026-01-01');
  await expect(page.getByTestId('crm-immo-dossier-probleme')).toBeVisible();
  await expect(page.getByTestId('crm-immo-dossier-valider')).toBeDisabled();

  await page.getByTestId('crm-immo-dossier-fermer').click();
  expect((await dossiersEnBase(s!)).length, 'aucune ligne ne doit avoir ete creee').toBe(1);
});

test('la modification enregistre, et le declencheur refuse la date imposee', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  const avant = await dossiersEnBase(s!);
  const id = avant[0].id as string;
  const majAvant = avant[0].updated_at as string;

  await page.getByTestId(`crm-immo-modifier-${id}`).click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).toBeVisible();
  await page.getByTestId('crm-immo-champ-nom_complet_proprietaire').fill('Cohen Marc');
  await page.getByTestId('crm-immo-dossier-valider').click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).not.toBeVisible({ timeout: 15_000 });

  const apres = await dossiersEnBase(s!);
  expect(apres[0].nom_complet_proprietaire, 'la modification n a pas atteint la base').toBe('Cohen Marc');
  /*
   * ET LA REGLE DE DAVID, VERIFIEE CONTRE LA VRAIE BASE : les quatre colonnes
   * historiques sont STRICTEMENT inchangees par un UPDATE. Seule la canonique bouge.
   * C'est ce que `delete (ligne as ...)` garantit dans useCrmImmoDossiers.modifier, et
   * c'est le seul endroit du parc ou on peut le prouver contre PostgREST lui-meme.
   */
  for (const col of ['nom', 'prenom', 'locataire', 'proprietaire'] as const) {
    expect(apres[0][col], `la colonne historique ${col} a ete reecrite par l UPDATE`)
      .toBe(avant[0][col]);
  }
  /* Le declencheur trg_crm_immo_dossiers_updated_at a ecrase la valeur : updated_at a
     AVANCE, sans que le client ait eu a la fournir. */
  expect(String(apres[0].updated_at) > String(majAvant), 'updated_at n a pas avance').toBe(true);
});

test('recherche, tri et filtres reduisent la liste sans la casser', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  /* Un second dossier, pour avoir de quoi filtrer. */
  await page.getByTestId('crm-immo-ajouter').click();
  await page.getByTestId('crm-immo-champ-nom_complet_locataire').fill(`${PREFIXE} Perrin Alice`);
  await page.getByTestId('crm-immo-dossier-valider').click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).not.toBeVisible({ timeout: 15_000 });

  const lignesVisibles = () => page.locator('[data-testid^="crm-immo-ligne-"]').count();
  const total = await lignesVisibles();
  expect(total, 'les deux dossiers [TEST] doivent etre visibles').toBeGreaterThanOrEqual(2);

  /* Recherche insensible aux accents et a la casse. */
  await page.getByTestId('crm-immo-recherche').fill('perrin');
  await expect.poll(lignesVisibles, { timeout: 10_000 }).toBeLessThan(total);
  await page.getByTestId('crm-immo-recherche-effacer').click();
  await expect.poll(lignesVisibles, { timeout: 10_000 }).toBe(total);

  /*
   * LES FILTRES PAR CATEGORIE.
   *
   * Ce test cliquait « Avec loyer », filtre supprime le 22 octobre 2026 : il echouait
   * donc depuis, sans rapport avec ce qu'il verifiait.
   *
   * La barre porte desormais « Tous » plus les sept categories du tableau de bord.
   * On prend « Baux a venir » : les deux dossiers [TEST] ont un bail qui a commence,
   * donc aucun ne doit y figurer — c'est un filtre dont on connait le resultat sans
   * dependre des dates du jeu d'essai. Puis « Tous » doit tout ramener.
   *
   * Le retour a « Tous » est le vrai enjeu : un filtre qui ne se relache pas enferme
   * l'utilisateur dans une liste vide.
   */
  await page.getByTestId('crm-immo-filtre-baux-a-venir').click();
  await expect.poll(lignesVisibles, { timeout: 10_000 }).toBe(0);
  await page.getByTestId('crm-immo-filtre-tous').click();
  await expect.poll(lignesVisibles, { timeout: 10_000 }).toBe(total);

  /* Le tri : trois clics ramenent a l'ordre naturel, sans boucler. */
  await page.getByTestId('crm-immo-trier-nom').click();
  await page.getByTestId('crm-immo-trier-nom').click();
  await page.getByTestId('crm-immo-trier-nom').click();
  expect(await lignesVisibles(), 'le tri ne doit perdre aucune ligne').toBe(total);

  await page.screenshot({ path: `${CAPTURES}/3-recherche-tri-filtres.png`, fullPage: false });
});

test('une colonne personnalisee se cree, se renomme, et sa valeur SURVIT au renommage', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  await page.getByTestId('crm-immo-ouvrir-colonnes').click();
  await expect(page.getByTestId('crm-immo-colonnes-modal')).toBeVisible();

  await page.getByTestId('crm-immo-colonne-nouveau-nom').fill(`${PREFIXE} Loyer`);
  await page.getByTestId('crm-immo-colonne-nouveau-type').selectOption('nombre');
  await page.getByTestId('crm-immo-colonne-ajouter').click();

  await expect.poll(async () => (await colonnesEnBase(s!)).length, { timeout: 15_000 }).toBe(1);
  const colonne = (await colonnesEnBase(s!))[0];
  expect(colonne.type).toBe('nombre');

  /* Un nom deja pris est refuse AVANT l'aller-retour, sans 23505 incomprehensible. */
  await page.getByTestId('crm-immo-colonne-nouveau-nom').fill(`${PREFIXE} loyer`);
  await expect(page.getByTestId('crm-immo-colonne-probleme')).toBeVisible();
  await expect(page.getByTestId('crm-immo-colonne-ajouter')).toBeDisabled();
  await page.getByTestId('crm-immo-colonne-nouveau-nom').fill('');

  /* Les colonnes SYSTEME n'ont AUCUN bouton Supprimer : pas desactive, inexistant. */
  await expect(page.getByTestId('crm-immo-colonne-supprimer-nom')).toHaveCount(0);
  await expect(page.getByTestId('crm-immo-colonne-supprimer-locataire')).toHaveCount(0);
  /* Et `nom` n'a pas de bouton Masquer : il est NOT NULL en base. */
  await expect(page.getByTestId('crm-immo-colonne-masquer-nom')).toHaveCount(0);
  await expect(page.getByTestId('crm-immo-colonne-masquer-email')).toBeVisible();

  await page.screenshot({ path: `${CAPTURES}/4-colonnes.png` });
  await page.getByTestId('crm-immo-colonnes-fermer').click();

  /* On ecrit une valeur dans la colonne, puis on la renomme : la valeur doit survivre,
     parce que la cle du jsonb est l'ID de la colonne et non son nom. */
  const dossier = (await dossiersEnBase(s!)).find(d => String(d.nom).includes('Dupont'))!;
  await page.getByTestId(`crm-immo-modifier-${dossier.id}`).click();
  await page.getByTestId(`crm-immo-champ-perso-${colonne.id}`).fill('850');
  await page.getByTestId('crm-immo-dossier-valider').click();
  await expect(page.getByTestId('crm-immo-dossier-modal')).not.toBeVisible({ timeout: 15_000 });

  const avecValeur = (await dossiersEnBase(s!)).find(d => d.id === dossier.id)!;
  expect((avecValeur.valeurs as Record<string, unknown>)[colonne.id], 'la valeur n est pas en base').toBe('850');

  await page.getByTestId('crm-immo-ouvrir-colonnes').click();
  await page.getByTestId(`crm-immo-colonne-editer-${colonne.id}`).click();
  await page.getByTestId(`crm-immo-colonne-nom-${colonne.id}`).fill(`${PREFIXE} Loyer mensuel`);
  await page.getByTestId(`crm-immo-colonne-renommer-ok-${colonne.id}`).click();
  await page.getByTestId('crm-immo-colonnes-fermer').click();

  const apresRenommage = (await dossiersEnBase(s!)).find(d => d.id === dossier.id)!;
  expect((apresRenommage.valeurs as Record<string, unknown>)[colonne.id],
    'renommer la colonne a reecrit le dossier : la cle du jsonb doit etre l ID').toBe('850');
});

test('la cloche du module compte, et la cloche GENERALE compte avec elle', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  /* Le dossier [TEST] a une fin de contrat au 15/12/2026 et un loyer le 5 : il produit
     donc au moins une alerte. Si la date est depassee au moment du test, l'alerte reste
     active — c'est le comportement voulu, le calendrier ne l'efface pas. */
  const badge = page.getByTestId('crm-immo-cloche-badge');
  await expect(badge, 'la cloche du module ne compte rien alors qu une echeance existe').toBeVisible({ timeout: 15_000 });
  const chiffreModule = Number((await badge.textContent())?.trim() ?? '0');
  expect(chiffreModule).toBeGreaterThan(0);

  await page.getByTestId('crm-immo-cloche-bouton').click();
  await expect(page.getByTestId('crm-immo-cloche-panneau')).toBeVisible();
  /* Le libelle porte TOUJOURS locataire, proprietaire et date — exigence explicite. */
  const panneau = page.getByTestId('crm-immo-cloche-panneau');
  await expect(panneau).toContainText('Jean Dupont');
  await expect(panneau).toContainText('Cohen');
  await page.screenshot({ path: `${CAPTURES}/5-cloche.png` });

  /*
   * DECISION REVISEE LE 20 OCTOBRE 2026.
   *
   * Ce bloc affirmait l'inverse : que la cloche GENERALE ne devait pas bouger. Les
   * alertes CRM Immo sont desormais la dixieme categorie du hub Notifications general,
   * pour les Societes qui possedent le module — et Bellisimmo, le compte de ce test,
   * le possede.
   *
   * L'assertion tient sans ajouter de data-testid a la barre du haut : la pastille
   * generale est une SOMME de dix compteurs tous positifs ou nuls. Si le compteur du
   * module en fait partie, la pastille lui est superieure ou egale. Si on le retirait
   * — l'ancienne regle restauree — une Societe sans autre notification afficherait une
   * pastille absente, ou plus petite que le chiffre du module.
   *
   * Le detail — carte presente seulement avec le droit, compteur identique, pas de
   * doublon, clic vers le bon dossier — est prouve par
   * scripts/crm-immo/alertesDansNotifications.test.ts, qui lit la source.
   */
  const clocheGenerale = page.locator('header [class*="rounded-full"]').filter({ hasText: /^\d+$/ });
  const chiffresGeneraux = (await clocheGenerale.allTextContents()).map(c => Number(c.trim()));
  expect(chiffresGeneraux.length,
    'la cloche generale n affiche aucun chiffre alors que le module en compte ' + chiffreModule)
    .toBeGreaterThan(0);
  expect(Math.max(...chiffresGeneraux),
    'la pastille generale est plus petite que le compteur du module : les alertes CRM Immo n y entrent pas')
    .toBeGreaterThanOrEqual(chiffreModule);

  /* « Traiter » retire l'alerte des actives ET du badge, mais la CONSERVE. */
  const dossier = (await dossiersEnBase(s!)).find(d => String(d.nom).includes('Dupont'))!;
  await page.getByTestId(`crm-immo-alerte-traitee-${dossier.id}`).first().click();
  await page.getByTestId('crm-immo-cloche-filtre-traitees').click();
  await expect(panneau.locator('[data-testid^="crm-immo-alerte-"]').first()).toBeVisible({ timeout: 10_000 });

  const etats = await rest(s!, `crm_immo_etats?dossier_id=eq.${dossier.id}&select=genre,periode,lue_le,traitee_le`);
  const lignes = (etats.corps ?? []) as Array<{ traitee_le: string | null }>;
  expect(lignes.length, 'l etat traite n a pas ete enregistre').toBeGreaterThan(0);
  expect(lignes.some(l => l.traitee_le !== null), 'aucune ligne ne porte traitee_le').toBe(true);
});

test('la suppression demande confirmation et supprime REELLEMENT', async ({ page }) => {
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  const avant = await dossiersEnBase(s!);
  const cible = avant.find(d => String(d.nom).includes('Perrin'))!;

  await page.getByTestId(`crm-immo-supprimer-${cible.id}`).click();
  await expect(page.getByTestId('crm-immo-delete-modal')).toBeVisible();
  /* La modale NOMME ce qui part : un « Etes-vous sur ? » sans sujet fait cliquer sans lire. */
  await expect(page.getByTestId('crm-immo-delete-modal')).toContainText('Perrin');

  /* Annuler ne supprime rien. */
  await page.getByTestId('crm-immo-delete-annuler').click();
  await expect(page.getByTestId('crm-immo-delete-modal')).not.toBeVisible();
  expect((await dossiersEnBase(s!)).length, 'Annuler a supprime').toBe(avant.length);

  await page.getByTestId(`crm-immo-supprimer-${cible.id}`).click();
  await page.getByTestId('crm-immo-delete-confirmer').click();
  await expect(page.getByTestId('crm-immo-delete-modal')).not.toBeVisible({ timeout: 15_000 });

  const apres = await dossiersEnBase(s!);
  expect(apres.length, 'la suppression n a pas atteint la base').toBe(avant.length - 1);
  expect(apres.some(d => d.id === cible.id), 'le dossier est toujours en base').toBe(false);
});

test('MOBILE a 375 px : des fiches, aucun tableau, aucun defilement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  await allerAuCrmImmo(page);

  /* Les fiches existent, le tableau n'est PAS visible. C'est la demande explicite de
     David : « ne compresse pas simplement le tableau ». */
  await expect(page.getByTestId('crm-immo-cards')).toBeVisible();
  await expect(page.getByTestId('crm-immo-table')).toBeHidden();
  await expect(page.locator('table')).toHaveCount(0);

  /* Aucun debordement horizontal, mesure sur le document ET sur la liste. */
  const mesure = await page.evaluate(() => {
    const doc = document.documentElement;
    const liste = document.querySelector('[data-testid="crm-immo-cards"]') as HTMLElement | null;
    return {
      docScroll: doc.scrollWidth, docClient: doc.clientWidth,
      listeScroll: liste?.scrollWidth ?? 0, listeClient: liste?.clientWidth ?? 0,
    };
  });
  expect(mesure.docScroll, `le document deborde : ${mesure.docScroll} > ${mesure.docClient}`)
    .toBeLessThanOrEqual(mesure.docClient);
  expect(mesure.listeScroll, 'la liste de fiches deborde horizontalement')
    .toBeLessThanOrEqual(mesure.listeClient);

  await page.screenshot({ path: `${CAPTURES}/6-mobile-375.png`, fullPage: true });
});
