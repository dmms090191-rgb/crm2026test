import { test, expect, type Page } from '@playwright/test';
import { surveiller } from './helpers/boutique3d';

/**
 * FERMER ET ROUVRIR, ENCORE ET ENCORE.
 *
 * Johanna 2 montait la boutique UNE FOIS par chargement de page. Un tableau de bord l'ouvre et
 * la ferme sans jamais recharger — et `useGLTF` garde le GLB en cache PAR URL, donc d'un
 * montage a l'autre ce sont les memes objets Material. Tout ce que le rendu ecrit dedans et ne
 * defait pas se retrouve au montage suivant, pris pour l'etat d'origine.
 *
 * Deux degats mesures avant le correctif, sur ce meme banc :
 *   - l'intensite emissive derivait : mat_abat_jour a 1,02 puis 0,867 puis 0,737 puis 0,626,
 *     soit un facteur 0,85 par cycle, sans retour possible ;
 *   - une television eteinte avant la fermeture gardait le materiau « eteint » apres la
 *     reouverture ET apres qu'on l'ait rallumee (screen_nouveautes restait sur mat_dalle_eteinte
 *     alors que __ecransEteints annoncait [] et que le panneau la donnait pour allumee).
 *
 * Le banc suffit : il n'y a ni base ni connexion ici, seulement le cycle de montage.
 */

const LONG = 240_000;

/** Somme des intensites emissives de la scene, et le detail d'un materiau temoin. */
const releverLumiere = () => {
  const s = (window as any).__debug3d?.scene;
  if (!s) return null;
  const vus = new Set<string>();
  let somme = 0;
  let temoin: number | null = null;
  s.traverse((o: any) => {
    const m = o.material;
    if (!m || !m.name || vus.has(m.name)) return;
    vus.add(m.name);
    if (typeof m.emissiveIntensity === 'number') {
      somme += m.emissiveIntensity;
      if (m.name === 'mat_abat_jour') temoin = +m.emissiveIntensity.toFixed(5);
    }
  });
  return { materiaux: vus.size, somme: +somme.toFixed(4), temoin };
};

/** Les dalles de television, suivies par leur MAILLAGE — un ecran eteint change de materiau. */
const releverEcrans = () => {
  const s = (window as any).__debug3d?.scene;
  if (!s) return null;
  const out: Record<string, { materiau: string; uuid: string }> = {};
  s.traverse((o: any) => {
    if (!o.isMesh || !/^screen_/.test(o.name || '')) return;
    out[o.name] = { materiau: o.material?.name || '(sans nom)', uuid: o.material?.uuid || '' };
  });
  return out;
};

async function entrer(page: Page) {
  await page.waitForFunction(() => {
    const d = (window as any).__debug3d;
    return d && Object.keys(d.vues || {}).length >= 9;
  }, null, { timeout: 180_000 });
  await page.locator('.entrer').click();
  await page.waitForFunction(() => (window as any).__debug3d?.etape === 'boutique',
    null, { timeout: 120_000 });
  await page.waitForTimeout(2000);
}

async function cycle(page: Page) {
  await page.getByRole('button', { name: 'Boutiques' }).first().click();
  await page.locator('[data-testid="rouvrir"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.locator('[data-testid="rouvrir"]').click();
  await entrer(page);
}

async function allerAuxReglages(page: Page) {
  for (let i = 0; i < 3; i++) {
    if ((await page.locator('.ui').getAttribute('data-onglet')) === 'reglages') return;
    await page.locator('[data-test="onglet-suivant"]').click();
    await page.waitForTimeout(600);
  }
}

async function fermerModale(page: Page) {
  if (await page.locator('[data-test="modale-fermer"]').count()) {
    await page.locator('[data-test="modale-fermer"]').click();
    await page.waitForTimeout(500);
  }
}

test('cinq fermetures et reouvertures ne changent pas la lumiere', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const erreurs = surveiller(page);
  await page.goto('/boutique3d.html');
  await entrer(page);

  // A reglage 1, `base * 1` vaut `base` et rien ne peut deriver : on pose donc une ambiance,
  // comme le ferait un proprietaire, sans quoi ce test passerait meme sur le code defectueux.
  await allerAuxReglages(page);
  await page.locator('[data-test="reglage-lumiere"]').click();
  await expect(page.locator('.lumiere')).toBeVisible({ timeout: 15_000 });
  await page.locator('.lumiere-ambiances button').nth(2).click();
  await page.waitForTimeout(900);
  await fermerModale(page);
  const reglage = await page.evaluate(() => (window as any).__lumiere?.intensite);
  expect(reglage, 'aucune ambiance posee : le test ne prouverait rien').not.toBe(1);

  const depart = await page.evaluate(releverLumiere);
  expect(depart, 'pas de scene').not.toBeNull();

  const suite = [depart!];
  for (let i = 1; i <= 5; i++) {
    await cycle(page);
    const m = await page.evaluate(releverLumiere);
    suite.push(m!);
    expect(await page.evaluate(() => (window as any).__lumiere?.intensite),
      `le reglage de lumiere a bouge au cycle ${i}`).toBe(reglage);
  }
  console.log('  intensites : ' + suite.map((m) => m.somme).join(' -> '));
  console.log('  mat_abat_jour : ' + suite.map((m) => m.temoin).join(' -> '));

  for (let i = 1; i < suite.length; i++) {
    expect(suite[i].materiaux, `le nombre de materiaux a change au cycle ${i}`).toBe(depart!.materiaux);
    expect(suite[i].somme, `la lumiere a derive au cycle ${i}`).toBeCloseTo(depart!.somme, 3);
    expect(suite[i].temoin, `mat_abat_jour a derive au cycle ${i}`).toBe(depart!.temoin);
  }

  expect(erreurs, 'erreurs console').toEqual([]);
});

test('une television eteinte se rallume apres une fermeture', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const erreurs = surveiller(page);
  await page.goto('/boutique3d.html');
  await entrer(page);

  const origine = await page.evaluate(releverEcrans);
  const noms = Object.keys(origine!);
  expect(noms.length, 'aucune dalle de television dans la scene').toBeGreaterThan(3);

  // on eteint la premiere television du panneau
  await allerAuxReglages(page);
  await page.locator('[data-test="reglage-televisions"]').click();
  await expect(page.locator('.televisions')).toBeVisible({ timeout: 15_000 });
  const bascule = page.locator('[data-test^="tv-bascule-"]').first();
  const cle = (await bascule.getAttribute('data-test'))!.replace('tv-bascule-', '');
  await bascule.click();
  await page.waitForTimeout(900);
  await fermerModale(page);

  const maillage = `screen_${cle}`;
  expect(origine![maillage], `pas de dalle nommee ${maillage}`).toBeTruthy();
  const eteinte = await page.evaluate(releverEcrans);
  expect(eteinte![maillage].uuid, 'eteindre n a pas change le materiau de la dalle')
    .not.toBe(origine![maillage].uuid);

  await cycle(page);

  // apres la reouverture, on la rallume
  await allerAuxReglages(page);
  await page.locator('[data-test="reglage-televisions"]').click();
  await expect(page.locator('.televisions')).toBeVisible({ timeout: 15_000 });
  await page.locator(`[data-test="tv-bascule-${cle}"]`).click();
  await page.waitForTimeout(900);
  await fermerModale(page);

  const rallumee = await page.evaluate(releverEcrans);
  expect(rallumee![maillage].uuid,
    'la dalle n a pas retrouve son materiau d origine : elle reste noire').toBe(origine![maillage].uuid);
  expect(rallumee![maillage].materiau, 'le nom du materiau n est pas celui d origine')
    .toBe(origine![maillage].materiau);
  expect(await page.evaluate(() => (window as any).__ecransEteints),
    'le panneau croit encore des ecrans eteints').toEqual([]);

  // et toutes les autres dalles sont restees exactement ce qu'elles etaient
  for (const n of noms) {
    expect(rallumee![n].uuid, `${n} a change de materiau sans qu on y touche`).toBe(origine![n].uuid);
  }

  expect(erreurs, 'erreurs console').toEqual([]);
});
