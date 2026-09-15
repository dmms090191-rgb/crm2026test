import { test, expect, type Page } from '@playwright/test';

/**
 * LA BOUTIQUE 3D DANS TALVEX — ouvrir, fermer, rouvrir, sans rien casser autour.
 *
 * CES TESTS N'ECRIVENT RIEN. Ils ouvrent /boutique3d.html, un banc d'essai de developpement qui
 * reproduit la mise en page du tableau de bord — barre laterale, en-tete, colonne — et monte la
 * boutique avec une boutique FICTIVE. Aucune authentification, aucune requete vers la base,
 * aucun compte ni lead cree. C'est deliberé : les quatre autres fichiers de e2e/ se connectent
 * avec de vrais comptes et creent de vraies lignes en production.
 *
 * Ce qu'ils protegent, et qu'aucun autre test ne voit :
 *   1. la boutique reste dans sa colonne — elle ne couvre ni la barre laterale ni l'en-tete ;
 *   2. la couche video reste alignee sur le canvas — sinon la video joue a cote du televiseur ;
 *   3. le theme Glass ne deplace pas le panneau — c'est le seul theme qui pose
 *      `html[data-theme="glass"] nav { position: relative; z-index: 20 }`, et le panneau EST
 *      un <nav> ;
 *   4. fermer puis rouvrir libere et reconstruit la scene proprement ;
 *   5. le clavier de la boutique ne confisque pas les touches de l'hote.
 */

test.describe.configure({ mode: 'serial' });

/** Le chargement du GLB et des textures prend du temps, surtout en rendu logiciel. */
const LONG = 180_000;

const boite = (page: Page, sel: string) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), l: Math.round(r.width), h: Math.round(r.height) };
}, sel);

type Boite = { x: number; y: number; l: number; h: number };
const dansLeCadre = (i: Boite | null, c: Boite | null) => !!i && !!c
  && i.x >= c.x - 1 && i.y >= c.y - 1
  && i.x + i.l <= c.x + c.l + 1 && i.y + i.h <= c.y + c.h + 1;

/** Charge le banc et entre dans la boutique. Rend les erreurs de console collectees. */
async function entrer(page: Page) {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Bruit d outillage, pas des defauts du produit. La liste est volontairement etroite :
    // « status of 404 » en faisait partie et a ete RETIRE. Mesure : l unique 404 du banc vient
    // de http://localhost:5173/favicon.ico — le terme « favicon » le couvre deja. Garder
    // « status of 404 » revenait a avaler aussi le 404 d un GLB, d une texture ou d un morceau
    // de musique absent, c est-a-dire exactement la panne que ces tests doivent voir.
    if (/SwiftShader|software WebGL|DevTools|favicon/i.test(t)) return;
    erreurs.push(t);
  });

  // Le bouton d'entree respire en CSS : Playwright attend un element STABLE et ne le trouve
  // jamais. Sous prefers-reduced-motion l'animation est coupee — c'est aussi le bon
  // comportement produit, et c'est ce que fait deja la configuration de tests de Johanna 2.
  // La configuration de Talvex, elle, ne pose pas reducedMotion : on l'emule ici.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/boutique3d.html');
  await page.waitForFunction(
    () => (window as any).__debug3d
      && Object.keys((window as any).__debug3d.vues || {}).length >= 9,
    null, { timeout: LONG });
  await page.locator('.entrer').click();
  await page.waitForFunction(
    () => (window as any).__debug3d?.etape === 'boutique', null, { timeout: LONG });
  await page.waitForTimeout(2200);
  return erreurs;
}

test('la boutique s ouvre dans sa colonne, sans couvrir la barre laterale ni l en-tete', async ({ page }) => {
  test.setTimeout(LONG + 60_000);
  const erreurs = await entrer(page);

  const hote = await boite(page, '[data-testid="hote-boutique"]');
  const cadre = await boite(page, '.boutique3d-cadre');
  expect(cadre, 'le cadre de la boutique doit exister').not.toBeNull();
  expect(hote!.x, 'la colonne est decalee par la barre laterale').toBeGreaterThanOrEqual(279);
  expect(hote!.y, 'et par l en-tete').toBeGreaterThanOrEqual(63);
  expect(dansLeCadre(cadre, hote), 'le cadre sort de la colonne').toBe(true);

  for (const sel of ['.ui', '.menu', '.tele-scene', '[data-test="barre-section"]']) {
    expect(dansLeCadre(await boite(page, sel), cadre), `${sel} sort du cadre`).toBe(true);
  }

  // la barre laterale et l en-tete de l hote sont toujours la, et cliquables
  await expect(page.getByText('TALVEX')).toBeVisible();
  await expect(page.locator('[data-testid="theme-glass"]')).toBeVisible();
  expect(erreurs, 'erreurs console').toEqual([]);
});

test('la couche video reste alignee sur le canvas', async ({ page }) => {
  test.setTimeout(LONG + 60_000);
  await entrer(page);
  const toile = await boite(page, 'canvas');
  const rendu = await boite(page, '.tele-scene > div');
  expect(rendu, 'le rendu CSS3D doit exister').not.toBeNull();
  // Dimensionnee sur le canvas mais posee sur son parent : si les deux divergent, la video
  // joue a cote du televiseur et le trou perce dans le rendu montre du noir.
  expect(rendu!.x).toBeCloseTo(toile!.x, 0);
  expect(rendu!.y).toBeCloseTo(toile!.y, 0);
  expect(rendu!.l).toBeCloseTo(toile!.l, 0);
  expect(rendu!.h).toBeCloseTo(toile!.h, 0);
});

test('le theme Glass ne deplace pas le panneau de la boutique', async ({ page }) => {
  test.setTimeout(LONG + 60_000);
  await entrer(page);
  const avant = await boite(page, '.menu');

  await page.locator('[data-testid="theme-glass"]').click();
  await page.waitForTimeout(1200);
  const apres = await boite(page, '.menu');
  const style = await page.evaluate(() => {
    const e = document.querySelector('.menu')!;
    const c = getComputedStyle(e);
    return { position: c.position, zIndex: c.zIndex };
  });

  expect(apres!.x, 'le panneau a bouge horizontalement sous Glass').toBe(avant!.x);
  expect(apres!.y, 'le panneau a bouge verticalement sous Glass').toBe(avant!.y);
  expect(style.position, 'Glass a remis le panneau dans le flux').toBe('absolute');
  expect(style.zIndex, 'Glass a pousse le panneau devant tout le reste').not.toBe('20');
});

test('fermer puis rouvrir la boutique reconstruit la scene, sans erreur', async ({ page }) => {
  test.setTimeout(LONG * 2);
  const erreurs = await entrer(page);

  const compter = () => page.evaluate(() => ({
    canvas: document.querySelectorAll('canvas').length,
    couche: document.querySelectorAll('.tele-scene').length,
  }));

  expect(await compter(), 'a l ouverture').toEqual({ canvas: 1, couche: 1 });

  await page.locator('button:has-text("Boutiques")').first().click();
  await page.waitForTimeout(1500);
  expect(await compter(), 'a la fermeture, la scene doit etre liberee').toEqual({ canvas: 0, couche: 0 });

  await page.locator('[data-testid="rouvrir"]').click();
  await page.waitForFunction(
    () => document.querySelector('canvas') && document.querySelector('.entrer'),
    null, { timeout: LONG });
  await page.waitForTimeout(2200);
  expect(await compter(), 'a la reouverture').toEqual({ canvas: 1, couche: 1 });

  const toile = await boite(page, 'canvas');
  expect(toile!.l, 'le canvas a une largeur reelle').toBeGreaterThan(200);
  expect(toile!.h, 'et une hauteur reelle').toBeGreaterThan(200);
  expect(erreurs, 'erreurs console sur le cycle complet').toEqual([]);
});

test('le clavier de la boutique ne confisque pas les touches de l hote', async ({ page }) => {
  test.setTimeout(LONG + 60_000);
  await entrer(page);

  const enPhoto = () => page.evaluate(() =>
    document.querySelector('.ui')?.classList.contains('photo') ?? false);
  expect(await enPhoto(), 'on ne part pas en mode photo').toBe(false);

  // Un bouton de l'HOTE prend le focus, puis on appuie sur Espace. Sans garde, la boutique
  // basculerait en mode photo par-dessus l'action du bouton.
  await page.locator('[data-testid="theme-beige"]').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  expect(await enPhoto(), 'Espace sur un bouton de l hote a bascule le mode photo').toBe(false);

  // Et quand plus rien n'a le focus, le raccourci de la boutique repond comme avant.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  expect(await enPhoto(), 'le raccourci de la boutique doit rester vivant').toBe(true);
  await page.keyboard.press('Space');
});
