import { test, expect } from '@playwright/test';

/**
 * L'APERCU DU TEMPLATE « NUMEROLOGIE CELESTE » REND-IL LES VRAIS COMPOSANTS ?
 *
 * Cette suite exerce le MECANISME REEL d'apercu du module Sites, celui de SitePreviewFrame :
 * une iframe sur la route interne /site-apercu, a qui la page parente envoie le contenu par
 * postMessage restreint a la meme origine. Elle ne simule rien — elle emprunte le chemin que
 * le bouton « Previsualiser » emprunte.
 *
 * Elle NE passe PAS par la connexion : la bibliotheque vit dans le panel Talvex
 * Administrateur, et le code PIN de test du depot ne l'ouvre plus. Ce qu'on prouve ici, c'est
 * donc l'apercu lui-meme — pas la carte qui le declenche, qui est couverte par les tests purs
 * de scripts/site/templateNumerologie.test.ts.
 *
 * Ce qu'elle protege :
 *   1. l'apercu monte un vrai contexte WebGL, pas une image ni une maquette ;
 *   2. la scene TOURNE (le compteur d'images avance) ;
 *   3. ses vrais composants sont la : le titre, le bouton, le marqueur de qualite ;
 *   4. elle s'adapte a la largeur, du telephone a l'ordinateur ;
 *   5. elle ne jette aucune erreur en console.
 */

const CLE = 'numerologie_celeste';
const CAPTURES = 'test-results/captures-template-numerologie';

/** Monte l'apercu exactement comme SitePreviewFrame le fait, et rend la poignee de l'iframe. */
const MONTER = `
  const f = document.createElement('iframe');
  f.id = 'apercu';
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647';
  f.src = '/site-apercu';
  document.body.appendChild(f);
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'talvex-site-preview-ready') {
      f.contentWindow.postMessage(
        { type: 'talvex-site-preview-payload', payload: { templateKey: '${CLE}', appIconUrl: null } },
        location.origin,
      );
    }
  });
`;

test.describe.configure({ mode: 'serial' });

test('l apercu monte un contexte WebGL vivant et la scene tourne', async ({ page }) => {
  const erreurs: string[] = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(MONTER);

  const cadre = page.locator('#apercu');
  await expect(cadre).toBeVisible();

  // Le canvas finit par arriver : c'est la preuve que les vrais composants sont montes.
  await page.waitForFunction(
    () => !!(document.getElementById('apercu') as HTMLIFrameElement)?.contentDocument?.querySelector('canvas'),
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(6_000);

  const etat = await cadre.evaluate((el: HTMLIFrameElement) => {
    const d = el.contentDocument!;
    const t = d.querySelector('canvas') as HTMLCanvasElement;
    const gl = t.getContext('webgl2') ?? t.getContext('webgl');
    return {
      perdu: gl ? (gl as WebGLRenderingContext).isContextLost() : null,
      largeur: t.width,
      hauteur: t.height,
      qualite: d.querySelector('[data-numerologie-qualite]')?.getAttribute('data-numerologie-qualite') ?? null,
      scene: !!d.querySelector('[data-testid="numerologie-scene"]'),
      repli: !!d.querySelector('[data-testid="numerologie-repli"]'),
    };
  });

  expect(etat.perdu, 'contexte WebGL perdu').toBe(false);
  expect(etat.largeur, 'canvas de largeur nulle').toBeGreaterThan(300);
  expect(etat.scene, 'la scene 3D n est pas montee').toBe(true);
  expect(etat.repli, 'c est le repli sans WebGL qui s affiche, pas la scene').toBe(false);
  expect(etat.qualite, 'aucun niveau de qualite resolu').not.toBeNull();

  /*
   * La boucle de rendu AVANCE : on compte les images sur une seconde.
   *
   * Le seuil est volontairement bas. Playwright tourne en headless, ou le compositeur bride
   * requestAnimationFrame a quelques images par seconde — mesure : 3 ici, contre 120 dans un
   * vrai navigateur sur la meme scene. Ce test ne peut donc pas prouver la FLUIDITE ; il
   * prouve seulement que la scene n'est pas figee. Pour la fluidite, mesurer hors headless.
   */
  const images = await cadre.evaluate(
    (el: HTMLIFrameElement) =>
      new Promise<number>(res => {
        const w = el.contentWindow!;
        let n = 0;
        const t0 = w.performance.now();
        const boucle = () => {
          n++;
          if (w.performance.now() - t0 < 1000) w.requestAnimationFrame(boucle);
          else res(n);
        };
        w.requestAnimationFrame(boucle);
      }),
  );
  expect(images, 'la boucle de rendu n avance pas : la scene est figee').toBeGreaterThan(2);

  await page.screenshot({ path: `${CAPTURES}/apercu-bureau.png` });
  expect(erreurs, `erreurs console : ${erreurs.join(' | ')}`).toHaveLength(0);
});

test('les vrais composants du template sont presents, pas une image', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(MONTER);

  const dedans = page.frameLocator('#apercu');
  // Du texte HTML selectionnable, rendu par NumerologieHero — une image n'en aurait pas.
  await expect(dedans.getByRole('heading', { name: 'Les Mystères de Votre Destin' }))
    .toBeVisible({ timeout: 60_000 });
  await expect(dedans.getByTestId('numerologie-decouvrir')).toBeVisible();
  await expect(dedans.getByText('Découvrez votre chemin de vie', { exact: false })).toBeVisible();
});

/*
 * Un VRAI telephone, pas seulement une fenetre etroite.
 *
 * `reglagesPour` exige les deux pour tomber en qualite basse : un ecran TACTILE *et* une
 * largeur inferieure a 820. C'est deliberé — une fenetre de navigateur reduite sur un
 * ordinateur puissant n'a aucune raison d'etre degradee. Un contexte sans `hasTouch` donne
 * donc « moyen », et c'est le comportement correct.
 */
test('l apercu s adapte au telephone, et la scene y tourne aussi', async ({ browser }) => {
  const contexte = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await contexte.newPage();
  await page.goto('/');
  await page.evaluate(MONTER);

  await page.waitForFunction(
    () => !!(document.getElementById('apercu') as HTMLIFrameElement)?.contentDocument?.querySelector('canvas'),
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(6_000);

  const etat = await page.locator('#apercu').evaluate((el: HTMLIFrameElement) => {
    const d = el.contentDocument!;
    const t = d.querySelector('canvas') as HTMLCanvasElement;
    return {
      qualite: d.querySelector('[data-numerologie-qualite]')?.getAttribute('data-numerologie-qualite'),
      largeur: t.width,
      // Aucun debordement horizontal : exigence du depot sur toute surface mobile.
      deborde: d.documentElement.scrollWidth > el.contentWindow!.innerWidth,
    };
  });

  expect(etat.qualite, 'le telephone doit tomber en qualite basse').toBe('bas');
  expect(etat.largeur).toBeGreaterThan(300);
  expect(etat.deborde, 'debordement horizontal sur telephone').toBe(false);

  await page.screenshot({ path: `${CAPTURES}/apercu-telephone.png` });
  await contexte.close();
});
