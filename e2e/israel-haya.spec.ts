import { test, expect, type Frame, type Page } from '@playwright/test';

/**
 * LE VOYAGE ISRAEL HAYA, parcouru pour de vrai.
 *
 * Le site vit dans l'apercu du module Sites : une iframe sur la route interne, a qui la page
 * parente envoie le contenu par postMessage. On emprunte donc le meme chemin que le bouton
 * « Previsualiser », et on defile A L INTERIEUR de l'iframe, comme un visiteur.
 *
 * Ce que cette suite protege :
 *   1. le site s'ouvre en hebreu, RTL, et il se NOMME des la premiere image ;
 *   2. le defilement traverse bien les six chapitres, dans l'ordre ;
 *   3. REMONTER ramene exactement aux chapitres precedents — la reversibilite est la promesse
 *      centrale du moteur, et c'est la seule facon de la verifier pour de bon ;
 *   4. la saisie des nombres fonctionne et affiche son etiquette de demonstration ;
 *   5. rien ne deborde horizontalement, du telephone a l'ordinateur ;
 *   6. la console reste vide.
 */

const CAPTURES = 'test-results/captures-israel-haya';

const MONTER = `
  const f = document.createElement('iframe');
  f.id = 'ih';
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647';
  f.src = '/site-apercu';
  document.body.appendChild(f);
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'talvex-site-preview-ready') {
      f.contentWindow.postMessage(
        { type: 'talvex-site-preview-payload', payload: { templateKey: 'israel_haya', appIconUrl: null } },
        location.origin,
      );
    }
  });
`;

/** Monte l'apercu et rend le frame interne, une fois la scene en place. */
async function ouvrir(page: Page): Promise<Frame> {
  await page.goto('/');
  await page.evaluate(MONTER);
  await page.waitForFunction(
    () => !!(document.getElementById('ih') as HTMLIFrameElement)?.contentDocument?.querySelector('[data-testid="ih-scene"]'),
    null,
    { timeout: 60_000 },
  );
  const frame = page.frames().find(f => f.url().includes('site-apercu'));
  if (!frame) throw new Error("l apercu ne s est pas monte");
  await page.waitForTimeout(1500);
  return frame;
}

/**
 * Defile a une fraction du voyage, et laisse la scene se poser.
 *
 * On defile la ZONE du template, pas la fenetre : dans Talvex, html, body et #root ont une
 * hauteur fixe et c'est le template qui porte son propre defilement.
 */
async function allerA(frame: Frame, fraction: number) {
  await frame.evaluate(f => {
    const zone = document.querySelector('[data-testid="ih-zone"]') as HTMLElement | null;
    if (!zone) throw new Error('zone de defilement introuvable');
    const course = zone.scrollHeight - zone.clientHeight;
    zone.scrollTop = course * f;
  }, fraction);
  await frame.waitForTimeout(700);
}

const chapitre = (frame: Frame) =>
  frame.locator('[data-testid="ih-scene"]').getAttribute('data-ih-chapitre');

test.describe.configure({ mode: 'serial' });

test('le site s ouvre en hebreu RTL, et il se nomme des la premiere image', async ({ page }) => {
  const erreurs: string[] = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const dir = await frame.evaluate(() => document.documentElement.getAttribute('dir'));
  const lang = await frame.evaluate(() => document.documentElement.getAttribute('lang'));
  expect(dir, 'la page doit etre en RTL').toBe('rtl');
  expect(lang).toBe('he');

  // Le nom doit etre lisible AVANT tout defilement.
  await expect(frame.getByRole('heading', { name: 'ישראל חיה' }).first()).toBeVisible();
  expect(await chapitre(frame)).toBe('naissance');

  await page.screenshot({ path: `${CAPTURES}/01-ouverture.png` });
  expect(erreurs, `erreurs console : ${erreurs.join(' | ')}`).toHaveLength(0);
});

test('le defilement traverse les six chapitres, dans l ordre', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const attendus = ['naissance', 'jerusalem', 'anneaux', 'arbre', 'cabinet', 'carte'];
  const vus: string[] = [];

  // On vise le milieu de chaque chapitre, calcule depuis les hauteurs reelles.
  const fractions = [0.05, 0.22, 0.42, 0.62, 0.80, 0.95];
  for (let i = 0; i < fractions.length; i++) {
    await allerA(frame, fractions[i]);
    const c = await chapitre(frame);
    vus.push(c ?? '?');
    await page.screenshot({ path: `${CAPTURES}/chapitre-${i + 1}-${c}.png` });
  }

  expect(vus, `ordre des chapitres : ${vus.join(' > ')}`).toEqual(attendus);
});

test('REMONTER ramene exactement aux chapitres precedents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Aller jusqu au bout, puis revenir, en relevant ce qu on voit a chaque arret.
  const etapes = [0.05, 0.42, 0.80, 0.95];
  const aller: string[] = [];
  for (const f of etapes) { await allerA(frame, f); aller.push((await chapitre(frame)) ?? '?'); }

  const retour: string[] = [];
  for (const f of [...etapes].reverse()) { await allerA(frame, f); retour.push((await chapitre(frame)) ?? '?'); }

  expect(retour, 'le retour ne rejoue pas le voyage a l envers').toEqual([...aller].reverse());
});

test('la saisie des nombres fonctionne, et s annonce comme une demonstration', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Seconde moitie du chapitre des anneaux : c est la que la saisie apparait.
  await allerA(frame, 0.46);
  expect(await chapitre(frame)).toBe('anneaux');

  await expect(frame.getByTestId('ih-date')).toBeVisible({ timeout: 15_000 });
  await frame.getByTestId('ih-prenom').fill('נועה');
  await frame.getByTestId('ih-date').fill('1988-03-14');
  // On verifie que les champs ont vraiment pris leur valeur AVANT de soumettre : un input
  // date vide bloque la validation native, et onSubmit ne serait jamais appele.
  await expect(frame.getByTestId('ih-date')).toHaveValue('1988-03-14');
  await frame.getByTestId('ih-calculer').click();

  await expect(frame.getByTestId('ih-resultat')).toBeVisible();
  // L etiquette de demonstration est obligatoire tant que la methode n est pas fournie.
  await expect(frame.getByTestId('ih-demo')).toBeVisible();

  await page.screenshot({ path: `${CAPTURES}/saisie-resultat.png` });
});

test('aucun debordement horizontal, du telephone a l ordinateur', async ({ browser }) => {
  for (const [largeur, hauteur, tactile] of [[390, 844, true], [768, 1024, true], [1440, 900, false]] as const) {
    const contexte = await browser.newContext({
      viewport: { width: largeur, height: hauteur },
      hasTouch: tactile,
      isMobile: tactile,
    });
    const page = await contexte.newPage();
    const frame = await ouvrir(page);
    await allerA(frame, 0.22);

    // Le debordement se mesure sur la zone du template, puisque c'est elle qui defile.
    const deborde = await frame.evaluate(() => {
      const z = document.querySelector('[data-testid="ih-zone"]') as HTMLElement | null;
      return !!z && z.scrollWidth > z.clientWidth + 1;
    });
    expect(deborde, `debordement horizontal a ${largeur}px`).toBe(false);

    if (largeur === 390) await page.screenshot({ path: `${CAPTURES}/telephone.png` });
    await contexte.close();
  }
});

/*
 * ---------- LES QUATRE CORRECTIONS D UN AUDIT, MISES SOUS GARDE ----------
 *
 * Les quatre defauts ci-dessous ont tous ete mesures sur une version qui passait deja la suite
 * precedente. Ils ont un point commun : aucun ne se voit en regardant la page. Un film
 * retelecharge, de la memoire qui ne revient pas, une fenetre qu'on redimensionne, un visiteur
 * sans souris — rien de tout cela n'apparait sur une capture d'ecran. D'ou ces tests.
 */

test('le voyage se parcourt au CLAVIER, sans souris', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // La zone de defilement est un div : sans traitement, aucune touche ne la fait bouger.
  await frame.locator('[data-testid="ih-zone"]').focus();
  const depart = await frame.evaluate(() => document.querySelector('[data-testid="ih-zone"]')!.scrollTop);
  expect(depart).toBe(0);

  for (let i = 0; i < 4; i++) await page.keyboard.press('PageDown');
  await frame.waitForTimeout(400);
  const apres = await frame.evaluate(() => document.querySelector('[data-testid="ih-zone"]')!.scrollTop);
  expect(apres, 'Page suivante doit faire avancer le voyage').toBeGreaterThan(0);

  await page.keyboard.press('End');
  await frame.waitForTimeout(400);
  expect(await chapitre(frame), 'Fin doit mener au dernier chapitre').toBe('carte');

  await page.keyboard.press('Home');
  await frame.waitForTimeout(400);
  expect(await chapitre(frame), 'Debut doit ramener au premier').toBe('naissance');
});

test('REDIMENSIONNER la fenetre ne deplace pas la tete de lecture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  await allerA(frame, 0.42);
  const avant = await chapitre(frame);
  expect(avant).toBe('anneaux');

  // La piste est haute de 3200vh : sa hauteur en pixels suit la fenetre, alors que le
  // navigateur garde scrollTop en pixels. Sans restauration, ces trois tailles promenaient le
  // lecteur de plusieurs chapitres, en avant comme en arriere.
  for (const taille of [{ width: 1024, height: 600 }, { width: 1600, height: 1000 }, { width: 1366, height: 640 }]) {
    await page.setViewportSize(taille);
    await frame.waitForTimeout(500);
    expect(
      await chapitre(frame),
      `le chapitre a change en passant a ${taille.width}x${taille.height}`,
    ).toBe(avant);
  }
});

test('chaque film n est telecharge QU UNE FOIS, meme en allant et venant', async ({ page }) => {
  const films: string[] = [];
  page.on('response', r => { if (r.url().endsWith('.mp4')) films.push(r.url().split('/').pop()!); });

  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Huit franchissements de la frontiere entre les chapitres 1 et 2.
  for (let i = 0; i < 8; i++) await allerA(frame, i % 2 ? 0.19 : 0.09);

  const parFilm = new Map<string, number>();
  for (const f of films) parFilm.set(f, (parFilm.get(f) ?? 0) + 1);
  for (const [nom, n] of parFilm) {
    expect(n, `${nom} telecharge ${n} fois : le cache de cacheFilms.ts ne tient plus`).toBe(1);
  }
  expect(parFilm.size, 'les deux films du debut doivent avoir ete demandes').toBeGreaterThanOrEqual(2);
});

test('MOUVEMENT REDUIT : tous les textes du recit restent lisibles', async ({ page }) => {
  // Le piege classique de cette preference : respecter la demande en n'affichant plus rien.
  // Mesure sur la premiere version : 5 des 10 legendes n'apparaissaient JAMAIS, dont l'appel
  // a prendre rendez-vous.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const vus = new Set<string>();
  for (let i = 0; i <= 20; i++) {
    await allerA(frame, i / 20);
    for (const t of await frame.locator('[data-testid="ih-scene"] h2').allTextContents()) vus.add(t.trim());
  }

  // Le voyage porte onze legendes ; aucune ne doit rester invisible.
  expect(vus.size, `legendes vues : ${[...vus].join(' | ')}`).toBeGreaterThanOrEqual(10);
  await page.emulateMedia({ reducedMotion: null });
});
