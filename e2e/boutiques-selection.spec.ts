import { test, expect } from '@playwright/test';
import { connectAdmin } from './helpers/auth';
import { session, rest, allerAuxBoutiques, type Session } from './helpers/boutique3d';

/**
 * SELECTION MULTIPLE ET SUPPRESSION DEFINITIVE DES BOUTIQUES.
 *
 * Suite CIBLEE : elle ne couvre que cette fonctionnalite. Elle ne monte aucune scene 3D.
 *
 * Elle cree TROIS boutiques prefixees [TEST] et les supprime en afterAll. Ce qu'elle protege :
 *   1. sans selection, aucun bouton « Supprimer » n'existe — l'action n'est pas juste desactivee ;
 *   2. la case d'en-tete bascule tout, et le compteur du bouton suit ;
 *   3. « Annuler » ne supprime RIEN — verifie en base, pas a l'ecran ;
 *   4. la confirmation supprime bien les lignes choisies, ET SEULEMENT CELLES-LA.
 */

test.describe.configure({ mode: 'serial' });

const PREFIXE = '[TEST] selection';
let s: Session | null = null;
const ids: string[] = [];

/** Les boutiques [TEST] encore en base pour cette societe. */
async function enBase(sess: Session) {
  const r = await rest(sess, `boutiques?name=like.${encodeURIComponent(PREFIXE + '%')}&select=id,name`);
  return (r.corps ?? []) as Array<{ id: string; name: string }>;
}

const caseDe = (id: string) => `[data-testid="boutique-case-${id}"] button`;
const BOUTON_SUPPRIMER = '[data-testid="boutiques-supprimer"]';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await connectAdmin(page);
  s = await session(page);
  for (const n of [1, 2, 3]) {
    const r = await rest(s, 'boutiques', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ company_id: s.companyId, name: `${PREFIXE} ${n}`, template_key: null }),
    });
    expect(r.statut, 'creation de la boutique de test').toBeLessThan(300);
    ids.push((r.corps as Array<{ id: string }>)[0].id);
  }
  await page.close();
});

test.afterAll(async () => {
  if (!s) return;
  await rest(s, `boutiques?name=like.${encodeURIComponent(PREFIXE + '%')}`, { method: 'DELETE' });
  expect((await enBase(s)).length, 'des boutiques [TEST] subsistent').toBe(0);
});

test('sans selection, aucun bouton Supprimer', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxBoutiques(page);
  await expect(page.locator(caseDe(ids[0]))).toBeVisible();
  await expect(page.locator(BOUTON_SUPPRIMER)).toHaveCount(0);
});

test('une case cochee fait apparaitre le bouton avec le compte', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxBoutiques(page);
  await page.locator(caseDe(ids[0])).click();
  await expect(page.locator(BOUTON_SUPPRIMER)).toContainText('Supprimer (1)');

  await page.locator(caseDe(ids[1])).click();
  await expect(page.locator(BOUTON_SUPPRIMER)).toContainText('Supprimer (2)');

  // Decocher ramene a l'etat initial : le bouton disparait, il ne reste pas grise.
  await page.locator(caseDe(ids[0])).click();
  await page.locator(caseDe(ids[1])).click();
  await expect(page.locator(BOUTON_SUPPRIMER)).toHaveCount(0);
});

test('la case d en-tete bascule tout, et Annuler ne supprime rien', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxBoutiques(page);

  await page.locator('[data-testid="boutiques-tout-selectionner"] button').click();
  await expect(page.locator(BOUTON_SUPPRIMER)).toContainText('Supprimer (3)');

  await page.locator(BOUTON_SUPPRIMER).click();
  const modale = page.locator('[data-testid="boutique-delete-modal"]');
  await expect(modale).toBeVisible();
  await expect(modale).toContainText('Supprimer 3 boutiques ?');

  await page.locator('[data-testid="boutique-delete-annuler"]').click();
  await expect(modale).toHaveCount(0);

  expect((await enBase(s!)).length, 'Annuler a supprime des lignes').toBe(3);
});

test('la confirmation supprime les boutiques choisies, et seulement celles-la', async ({ page }) => {
  await connectAdmin(page);
  await allerAuxBoutiques(page);

  await page.locator(caseDe(ids[0])).click();
  await page.locator(caseDe(ids[1])).click();
  await expect(page.locator(BOUTON_SUPPRIMER)).toContainText('Supprimer (2)');

  await page.locator(BOUTON_SUPPRIMER).click();
  await page.locator('[data-testid="boutique-delete-confirmer"]').click();

  // L'ecran se met a jour sans rechargement, et le bouton repart avec la selection vidée.
  await expect(page.locator('[data-testid="boutique-delete-modal"]')).toHaveCount(0);
  await expect(page.locator(`[data-row-id="${ids[0]}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-row-id="${ids[1]}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-row-id="${ids[2]}"]`)).toHaveCount(1);
  await expect(page.locator(BOUTON_SUPPRIMER)).toHaveCount(0);

  const restantes = await enBase(s!);
  expect(restantes.map(b => b.id), 'seule la troisieme doit subsister').toEqual([ids[2]]);
});
