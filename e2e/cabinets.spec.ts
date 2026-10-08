import { test, expect, type Page } from '@playwright/test';
import { connectAdmin } from './helpers/auth';
import { session, rest, type Session } from './helpers/boutique3d';

/**
 * MODULE CABINET — onglet du panel Societe, copie fonctionnelle du module Boutique.
 *
 * Ce que cette suite protege, dans l'ordre ou un utilisateur le vit :
 *   1. l'onglet « Cabinet » existe dans la barre laterale et mene a la page « Cabinets »
 *      (un `case` oublie dans AdminViewRenderer ne leve AUCUNE erreur : il affiche le
 *      Dashboard a la place. Seul un test de contenu attrape cet oubli) ;
 *   2. « Ajouter un cabinet » cree reellement une ligne, visible dans le tableau ;
 *   3. « Ouvrir le cabinet » remplace la liste par l'espace du cabinet, et le retour ramene ;
 *   4. la selection fait apparaitre « Supprimer », et la confirmation supprime — verifie EN BASE.
 *
 * Elle cree des cabinets prefixes [TEST] et les retire en afterAll, meme si un test echoue.
 */

test.describe.configure({ mode: 'serial' });

const PREFIXE = '[TEST] cabinet';
const NOM = `${PREFIXE} 1`;
let s: Session | null = null;

/**
 * Captures de controle, pour relire ce que la suite a reellement vu.
 * `test-results/` est ignore par git : aucune image n entre dans le depot, et le chemin
 * reste relatif — un chemin absolu de machine casserait la suite partout ailleurs.
 */
const CAPTURES = 'test-results/captures-cabinet';

/** Les cabinets [TEST] encore en base pour cette societe. */
async function enBase(sess: Session) {
  const r = await rest(sess, `cabinets?name=like.${encodeURIComponent(PREFIXE + '%')}&select=id,name`);
  return (r.corps ?? []) as Array<{ id: string; name: string }>;
}

/**
 * Va a l'onglet Cabinet. Il peut se trouver EN BAS de la barre laterale et non a cote de
 * Boutique : reconcileLayout ajoute tout onglet nouveau a la fin d'une configuration deja
 * enregistree. Playwright fait defiler jusqu'a lui, la position n'a donc pas d'importance ici.
 */
async function allerAuxCabinets(page: Page) {
  const entree = page.getByText('Cabinet', { exact: true }).first();
  const dehors = async () => {
    const b = await entree.boundingBox().catch(() => null);
    return !b || b.x < 0;
  };
  if (await dehors()) {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    await expect.poll(dehors, { timeout: 15_000, message: "la barre laterale ne s est pas ouverte" }).toBe(false);
  }
  await entree.click();
  await expect(page.getByRole('heading', { name: 'Cabinets' })).toBeVisible({ timeout: 30_000 });
}

test.afterAll(async () => {
  if (!s) return;
  await rest(s, `cabinets?name=like.${encodeURIComponent(PREFIXE + '%')}`, { method: 'DELETE' });
  expect((await enBase(s)).length, 'des cabinets [TEST] subsistent en base').toBe(0);
});

test('l onglet Cabinet existe et affiche SA page, pas le Dashboard', async ({ page }) => {
  await connectAdmin(page);
  s = await session(page);
  await allerAuxCabinets(page);

  // Le contenu propre a la page, qu'aucune autre vue ne porte.
  await expect(page.getByText('Gérez les cabinets de votre société.')).toBeVisible();
  await expect(page.getByTestId('cabinets-ajouter')).toBeVisible();
  // Sans selection, aucun bouton Supprimer : l'action n'est pas juste desactivee, elle n'existe pas.
  await expect(page.getByTestId('cabinets-supprimer')).toHaveCount(0);

  await page.screenshot({ path: `${CAPTURES}/1-liste-vide.png`, fullPage: false });
});

test('Ajouter un cabinet cree une ligne reelle', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxCabinets(page);

  await page.getByTestId('cabinets-ajouter').click();
  await expect(page.getByTestId('cabinet-create-modal')).toBeVisible();
  await page.screenshot({ path: `${CAPTURES}/2-modal-choix.png` });

  // Le parcours « de zero » : aucun modele de cabinet n'existe encore, l'autre carte est desactivee.
  await expect(page.getByTestId('cabinet-choix-template')).toBeDisabled();
  await page.getByTestId('cabinet-choix-blank').click();

  await page.getByTestId('cabinet-nom').fill(NOM);
  await page.screenshot({ path: `${CAPTURES}/3-modal-nom.png` });
  await page.getByTestId('cabinet-creer').click();

  await expect(page.getByTestId('cabinet-create-modal')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('cell', { name: NOM })).toBeVisible();
  await page.screenshot({ path: `${CAPTURES}/4-liste-avec-cabinet.png` });

  // Et en base, pas seulement a l'ecran.
  expect(s, 'session absente').not.toBeNull();
  const lignes = await enBase(s!);
  expect(lignes.some(l => l.name === NOM), 'le cabinet n est pas en base').toBe(true);
});

test('Ouvrir le cabinet remplace la liste, et le retour ramene', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxCabinets(page);

  const lignes = await enBase(s!);
  const cible = lignes.find(l => l.name === NOM);
  expect(cible, 'le cabinet de test a disparu').toBeTruthy();

  await page.getByTestId(`ouvrir-cabinet-${cible!.id}`).click();

  // L'espace du cabinet : son nom en titre, et le bloc de la scene 3D.
  await expect(page.getByRole('heading', { name: NOM })).toBeVisible();
  await expect(page.getByTestId('cabinet-scene-3d')).toBeVisible();
  // La liste a bien cede la place : le bouton d'ajout n'est plus la.
  await expect(page.getByTestId('cabinets-ajouter')).toHaveCount(0);
  await page.screenshot({ path: `${CAPTURES}/5-cabinet-ouvert.png` });

  await page.getByTestId('cabinet-retour').click();
  await expect(page.getByTestId('cabinets-ajouter')).toBeVisible();
});

test('la selection fait apparaitre Supprimer, et la confirmation supprime en base', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxCabinets(page);

  const lignes = await enBase(s!);
  const cible = lignes.find(l => l.name === NOM);
  expect(cible, 'le cabinet de test a disparu').toBeTruthy();

  await page.locator(`[data-testid="cabinet-case-${cible!.id}"] button`).click();
  const supprimer = page.getByTestId('cabinets-supprimer');
  await expect(supprimer).toBeVisible();
  await expect(supprimer).toContainText('(1)');

  await supprimer.click();
  await expect(page.getByTestId('cabinet-delete-modal')).toBeVisible();
  await page.screenshot({ path: `${CAPTURES}/6-confirmation-suppression.png` });
  await page.getByTestId('cabinet-delete-confirmer').click();

  await expect(page.getByTestId('cabinet-delete-modal')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('cell', { name: NOM })).toHaveCount(0);

  const apres = await enBase(s!);
  expect(apres.some(l => l.id === cible!.id), 'le cabinet est encore en base').toBe(false);
});
