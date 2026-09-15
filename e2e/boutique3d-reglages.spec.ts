import { test, expect, type Page } from '@playwright/test';
import { connectAdmin } from './helpers/auth';
import {
  allerAuxBoutiques, entrer, fermer, ouvrirDepuisLaListe, reglagesEnBase, rest, session,
  surveiller, type Session,
} from './helpers/boutique3d';

/**
 * LES REGLAGES D'UNE BOUTIQUE APPARTIENNENT A LA BOUTIQUE.
 *
 * Quatre defauts mesures sur l'application avant ce fichier, tous invisibles pour les suites
 * existantes parce qu'elles fermaient et rouvraient dans le MEME navigateur — ou le cache local
 * suffit a faire revenir un reglage, meme si la base n'est jamais lue :
 *
 *   1. la ligne `boutique_reglages` etait lue (HTTP 200, contenu correct) puis JETEE. Le moteur
 *      ecrivait ses valeurs par defaut dans le cache local avant le retour de la lecture, donc
 *      la garde « ce navigateur est-il vierge ? » etait toujours fausse, sur tous les appareils ;
 *   2. 900 ms apres le montage, l'ecriture groupee republiait ces valeurs par defaut PAR-DESSUS
 *      la ligne du proprietaire. Mesure : playlist.boucle publie a false, relu a true apres la
 *      simple visite d'un second appareil, sans qu'on ait touche a quoi que ce soit ;
 *   3. l'intensite emissive des materiaux derivait a chaque reouverture (mat_abat_jour :
 *      1,02 puis 0,867 puis 0,737 puis 0,626) ;
 *   4. une television eteinte avant une fermeture restait sur le materiau « eteint » pour
 *      toujours, pendant que le panneau la donnait pour allumee.
 *
 * Chaque test de ce fichier a ete lance contre le code d'AVANT le correctif et a echoue.
 *
 * ┌─ CE FICHIER ECRIT DANS LA BASE DE PRODUCTION ─────────────────────────────────────────────┐
 * │ Il cree UNE boutique prefixee [TEST] et la supprime dans un afterAll — la cascade emporte │
 * │ ses reglages. Autorise explicitement par le client pour cette verification.               │
 * └───────────────────────────────────────────────────────────────────────────────────────────┘
 */

const PREFIXE = '[TEST] reglages';
const MODELE = 'johanna-mode-luxe';
const LONG = 180_000;

let s: Session | null = null;
let idBoutique = '';

/** Ce que le proprietaire est cense avoir pose. Choisi pour DIFFERER des valeurs par defaut. */
const PUBLIE = {
  playlist: { v: 1, boucle: false, morceaux: [] },
  televisions: { allumees: { nouveautes: false } },
};

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  if (s && idBoutique) await rest(s, `boutiques?id=eq.${idBoutique}`, { method: 'DELETE' });
});

/** Cree la boutique et y pose des reglages DIRECTEMENT en base, sans passer par l'interface. */
async function poserLaBoutique(page: Page) {
  await connectAdmin(page);
  s = await session(page);
  const creee = await rest(s, 'boutiques?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ company_id: s.companyId, name: PREFIXE, template_key: MODELE }),
  });
  expect(creee.statut, 'creation de la boutique').toBe(201);
  idBoutique = (creee.corps as Array<{ id: string }>)[0].id;

  const pose = await rest(s, 'boutique_reglages', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ boutique_id: idBoutique, donnees: PUBLIE }),
  });
  expect(pose.statut, 'pose des reglages en base').toBeLessThan(300);
}

test('un appareil vierge recoit les reglages publies par la boutique', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await poserLaBoutique(page);
  const erreurs = surveiller(page);

  // Chaque test de Playwright part d'un contexte neuf : ce navigateur n'a JAMAIS vu cette
  // boutique, son cache local est vide. C'est exactement le cas qui ne fonctionnait pas.
  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);

  const vu = await page.evaluate(() => ({
    base: (window as any).__base,
    boucle: (window as any).__playlist?.boucle,
    nouveautes: (window as any).__televisions?.allumees?.nouveautes,
    volume: (window as any).__musique?.volume,
  }));

  expect(vu.base?.ligne, 'la ligne de reglages n a pas ete lue').toBe(true);
  expect(vu.base?.regle, 'dans Talvex, c est la boutique qui gagne').toBe('la boutique gagne');
  expect(vu.base?.adoptees, 'les sections publiees n ont pas ete adoptees')
    .toEqual(expect.arrayContaining(['playlist', 'televisions']));
  expect(vu.boucle, 'la playlist publiee n est pas appliquee a la scene').toBe(false);
  expect(vu.nouveautes, 'l etat des televisions publie n est pas applique').toBe(false);
  // Le volume est un reglage de l'APPAREIL : il ne vient jamais de la base.
  expect(typeof vu.volume, 'le volume doit rester un nombre local').toBe('number');

  expect(erreurs, 'erreurs console').toEqual([]);
});

test('ouvrir une boutique ne modifie pas ses reglages', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  s = await session(page);
  const erreurs = surveiller(page);

  const avant = await reglagesEnBase(s, idBoutique);
  expect(avant, 'pas de ligne avant l ouverture').toBeTruthy();

  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);
  // largement au-dela du delai de l'ecriture groupee : si une ecriture devait partir, elle est
  // partie. On ne touche a RIEN pendant ce temps.
  await page.waitForTimeout(5000);
  expect(await page.evaluate(() => (window as any).__base?.ecritures),
    'une ecriture est partie alors que personne n a rien change').toBe(0);
  await fermer(page);

  const apres = await reglagesEnBase(s, idBoutique);
  expect(apres!.donnees, 'le contenu des reglages a change tout seul').toEqual(avant!.donnees);
  expect(apres!.maj, 'la date de mise a jour a bouge tout seul').toBe(avant!.maj);

  expect(erreurs, 'erreurs console').toEqual([]);
});

test('modifier un reglage l enregistre en base', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  s = await session(page);
  const erreurs = surveiller(page);

  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);

  const avant = await page.evaluate(() => (window as any).__playlist?.boucle);
  expect(avant, 'l appareil n a pas recu la valeur publiee').toBe(false);

  await page.locator('[data-test="lecteur-poignee"]').click();
  await page.locator('[data-test="lecteur-boucle"]').click();
  await page.waitForFunction((v) => (window as any).__playlist?.boucle !== v, avant, { timeout: 15_000 });
  const apres = await page.evaluate(() => (window as any).__playlist?.boucle);
  await page.waitForTimeout(4000);

  const ligne = await reglagesEnBase(s, idBoutique);
  expect((ligne!.donnees.playlist as { boucle?: boolean })?.boucle,
    'la modification n est pas arrivee en base').toBe(apres);
  // et la base ne contient toujours QUE ce qui appartient a la boutique
  expect(Object.keys(ligne!.donnees).sort()).toEqual(['lumiere', 'musique', 'playlist', 'televisions']);
  expect((ligne!.donnees.musique as Record<string, unknown>)?.volume,
    'le volume ne doit jamais partir en base').toBeUndefined();

  expect(erreurs, 'erreurs console').toEqual([]);
});

test('un autre appareil recoit cette modification', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  s = await session(page);
  const erreurs = surveiller(page);

  const ligne = await reglagesEnBase(s, idBoutique);
  const attendu = (ligne!.donnees.playlist as { boucle?: boolean })?.boucle;
  expect(attendu, 'la base ne porte pas la modification du test precedent').toBe(true);

  // contexte neuf = autre appareil : aucun cache local pour cette boutique
  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);

  expect(await page.evaluate(() => (window as any).__playlist?.boucle),
    'un autre appareil ne voit pas la modification').toBe(attendu);

  expect(erreurs, 'erreurs console').toEqual([]);
});

/** Toutes les entrees du panneau restent atteignables, au besoin en faisant defiler. */
async function panneauAtteignable(page: Page) {
  // le panneau doit etre deplie
  const nom = page.locator('.barre-section .section-nom').first();
  if (await nom.count() && (await nom.getAttribute('aria-expanded')) !== 'true') {
    await nom.click();
    await page.waitForTimeout(900);
  }
  await expect(page.locator('.menu-contenu')).toBeVisible();

  // QUI DEFILE N'EST PAS LE MEME SELON LE GABARIT, et la question posee ne change pas pour
  // autant. Sur telephone c'est `.menu-contenu` qui defile dans un panneau qui le rogne ;
  // sur grand ecran c'est `.menu` lui-meme. On fait donc defiler les deux jusqu'au bout, et
  // on pose la SEULE question qui compte : la derniere entree est-elle dans le panneau ?
  const mesure = await page.evaluate(() => {
    const menu = document.querySelector('.menu') as HTMLElement | null;
    const contenu = document.querySelector('.menu-contenu') as HTMLElement | null;
    if (!menu || !contenu) return null;
    menu.scrollTop = menu.scrollHeight;
    contenu.scrollTop = contenu.scrollHeight;
    const entrees = [...contenu.children] as HTMLElement[];
    const derniere = entrees[entrees.length - 1];
    const bm = menu.getBoundingClientRect();
    const bd = derniere ? derniere.getBoundingClientRect() : null;
    return {
      entrees: entrees.length,
      debordeEnBas: bd ? Math.round(bd.bottom - bm.bottom) : null,
      debordeEnHaut: bd ? Math.round(bm.top - bd.top) : null,
      hauteurPanneau: Math.round(bm.height),
      qui: menu.scrollHeight > menu.clientHeight + 1 ? 'le panneau'
        : contenu.scrollHeight > contenu.clientHeight + 1 ? 'le contenu' : 'personne',
    };
  });

  expect(mesure, 'ni panneau ni contenu').not.toBeNull();
  expect(mesure!.entrees, 'le panneau est vide').toBeGreaterThan(3);
  expect(mesure!.debordeEnBas,
    'apres defilement, la derniere entree reste SOUS le panneau : elle est inatteignable')
    .toBeLessThanOrEqual(1);
  expect(mesure!.debordeEnHaut,
    'apres defilement, la derniere entree est passee AU-DESSUS du panneau').toBeLessThanOrEqual(1);
  return mesure!;
}

for (const [nom, viewport, mobile] of [
  ['petit telephone 360 x 640', { width: 360, height: 640 }, true],
  ['Galaxy S24 412 x 915', { width: 412, height: 915 }, true],
  ['grand ecran 1280 x 720', { width: 1280, height: 720 }, false],
] as const) {
  test.describe(nom, () => {
    test.use({ viewport, hasTouch: mobile, isMobile: mobile });

    test('toutes les entrees du panneau sont atteignables', async ({ page }) => {
      test.setTimeout(LONG * 2);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await connectAdmin(page);
      const erreurs = surveiller(page);
      await allerAuxBoutiques(page);
      await ouvrirDepuisLaListe(page, idBoutique);
      await entrer(page);
      const m = await panneauAtteignable(page);
      console.log(`  ${nom} : ${m.entrees} entrees, panneau ${m.hauteurPanneau} px, defilement assure par ${m.qui}`);
      expect(erreurs, 'erreurs console').toEqual([]);
    });
  });
}

test('la base est revenue propre', async () => {
  test.setTimeout(60_000);
  expect(s, 'pas de session').not.toBeNull();
  await rest(s!, `boutiques?id=eq.${idBoutique}`, { method: 'DELETE' });
  const reste = await rest(s!, `boutiques?name=like.${encodeURIComponent('%[TEST]%')}&select=id`);
  expect((reste.corps as unknown[]).length, 'des boutiques [TEST] subsistent').toBe(0);
  const reg = await rest(s!, `boutique_reglages?boutique_id=eq.${idBoutique}&select=boutique_id`);
  expect((reg.corps as unknown[]).length, 'les reglages n ont pas suivi en cascade').toBe(0);
});
