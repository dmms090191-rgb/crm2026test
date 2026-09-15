import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { connectAdmin } from './helpers/auth';

/**
 * VERIFICATION FINALE — depuis le VRAI panel Societe, pas depuis le banc d'essai.
 *
 * Tout ce qui precede a ete mesure sur /boutique3d.html, une page de developpement qui imite
 * le tableau de bord. Ici on emprunte le chemin d'un vrai utilisateur : connexion, onglet
 * Boutique, bouton « Ouvrir la boutique », scene, reglages, retour a la liste.
 *
 * ┌─ CE FICHIER ECRIT DANS LA BASE DE PRODUCTION ─────────────────────────────────────────────┐
 * │ Il cree UNE boutique prefixee [TEST] et la supprime dans un afterAll — la cascade emporte │
 * │ ses reglages. Autorise explicitement par le client pour cette verification.               │
 * └───────────────────────────────────────────────────────────────────────────────────────────┘
 */

const PREFIXE = '[TEST] verif finale';
const MODELE = 'johanna-mode-luxe';
const LONG = 180_000;

type Session = { url: string; anon: string; jeton: string; companyId: string };

function configuration() {
  const brut = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env: Record<string, string> = {};
  for (const ligne of brut.split(/\r?\n/)) {
    const i = ligne.indexOf('=');
    if (i > 0) env[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  return { url: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_ANON_KEY };
}

async function session(page: Page): Promise<Session> {
  const { url, anon } = configuration();
  const jeton = await page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i++) {
      const c = sessionStorage.key(i)!;
      if (!c.includes('auth-token')) continue;
      try {
        const v = JSON.parse(sessionStorage.getItem(c) || '{}');
        if (v?.access_token) return v.access_token as string;
      } catch { /* cle sans rapport */ }
    }
    return '';
  });
  expect(jeton, 'aucun jeton de session').not.toBe('');
  const charge = JSON.parse(
    Buffer.from(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
  ) as { app_metadata?: { company_id?: string } };
  return { url, anon, jeton, companyId: charge.app_metadata?.company_id ?? '' };
}

async function rest(s: Session, chemin: string, options: RequestInit = {}) {
  const r = await fetch(`${s.url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: s.anon, Authorization: `Bearer ${s.jeton}`,
      'Content-Type': 'application/json', ...(options.headers || {}),
    },
  });
  const t = await r.text();
  let corps: unknown = null;
  try { corps = t ? JSON.parse(t) : null; } catch { corps = t; }
  return { statut: r.status, corps };
}

/**
 * Collecte les erreurs de console — a brancher APRES la connexion.
 *
 * La page de connexion de Talvex en produit 122 a elle seule : des avertissements React sur le
 * melange de proprietes de style dans TalvexLoginForm, plus un « Failed to fetch » du client
 * Supabase pendant l'authentification. Rien de cela ne vient de la boutique, et surveiller
 * depuis le premier chargement reviendrait a mesurer le bruit de l'hote.
 *
 * On ecarte en plus les « Warning: » de React : ce sont des avertissements de developpement,
 * que React fait passer par console.error. Une VRAIE erreur ne commence pas par ce mot.
 */
function surveiller(page: Page) {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/SwiftShader|software WebGL|DevTools|favicon|caniuse-lite/i.test(t)) return;
    if (t.startsWith('Warning:')) return;
    erreurs.push(t);
  });
  return erreurs;
}

/**
 * Va a la section Boutique, en ouvrant d'abord la barre laterale si elle est rangee.
 *
 * A 412 px la barre laterale de Talvex n'est pas masquee : elle est POUSSEE hors de l'ecran.
 * Mesure apres connexion : <aside> a x = -300 pour 300 px de large, et l entree « Boutique »
 * a x = -252. Elle reste donc dans le document, visible au sens de offsetParent, mais
 * inatteignable au clic. A 1280 px la meme entree est a x = 48.
 *
 * Elle s'ouvre par un bouton a icone « menu » pose en 12,12. Ce bouton n'a AUCUN nom
 * accessible — pas de texte, pas d'aria-label — on ne peut donc pas le viser par son role.
 * On le vise par son icone, comme le bouton Connexion dans helpers/auth.ts, et pour la meme
 * raison. Les deux manques sont signales au client ; ce fichier ne corrige pas son interface.
 */
const allerAuxBoutiques = async (page: Page) => {
  const entree = page.getByText('Boutique', { exact: true }).first();
  const dehors = async () => {
    const b = await entree.boundingBox().catch(() => null);
    return !b || b.x < 0;
  };
  if (await dehors()) {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    // on attend que la barre soit VRAIMENT rentree dans le cadre, pas juste qu elle existe
    await expect.poll(dehors, { timeout: 15_000, message: "la barre laterale ne s est pas ouverte" })
      .toBe(false);
  }
  await entree.click();
  await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible({ timeout: 30_000 });
};

/** Ouvre la boutique depuis la LISTE et attend que la scene soit construite. */
async function ouvrirDepuisLaListe(page: Page, id: string) {
  await page.locator(`[data-testid="ouvrir-boutique-${id}"]`).click();
  await page.waitForFunction(
    () => (window as any).__debug3d
      && Object.keys((window as any).__debug3d.vues || {}).length >= 9,
    null, { timeout: LONG });
}

const entrer = async (page: Page) => {
  await expect(page.locator('.entrer'), 'la facade et son bouton d entree').toBeVisible();
  await page.locator('.entrer').click();
  await page.waitForFunction(
    () => (window as any).__debug3d?.etape === 'boutique', null, { timeout: LONG });
  await page.waitForTimeout(2200);
};

let s: Session | null = null;
let idBoutique = '';

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  if (s && idBoutique) await rest(s, `boutiques?id=eq.${idBoutique}`, { method: 'DELETE' });
});

test('une vraie boutique s ouvre depuis la liste du panel Societe', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  // on ne surveille qu'a partir d'ici : le bruit de la page de connexion n'est pas le notre
  const erreurs = surveiller(page);
  s = await session(page);

  const creee = await rest(s, 'boutiques?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ company_id: s.companyId, name: `${PREFIXE}`, template_key: MODELE }),
  });
  expect(creee.statut, 'creation de la boutique de verification').toBe(201);
  idBoutique = (creee.corps as Array<{ id: string }>)[0].id;

  await allerAuxBoutiques(page);
  // La ligne est bien la, avec son modele et son bouton d'ouverture.
  await expect(page.getByText(PREFIXE, { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`[data-testid="ouvrir-boutique-${idBoutique}"]`),
    'le bouton Ouvrir n apparait pas sur une boutique johanna-mode-luxe').toBeVisible();

  await ouvrirDepuisLaListe(page, idBoutique);

  // --- la facade, puis l'interieur
  await entrer(page);
  expect(await page.evaluate(() => (window as any).__debug3d?.etape), 'dans la boutique')
    .toBe('boutique');
  const toile = await page.locator('canvas').boundingBox();
  expect(toile!.width, 'le canvas a une largeur reelle').toBeGreaterThan(300);
  expect(toile!.height, 'et une hauteur reelle').toBeGreaterThan(300);

  // --- la barre laterale et l'en-tete de Talvex sont intacts et cliquables
  await expect(page.getByText('Boutique', { exact: true }).first(),
    'la barre laterale de Talvex a disparu').toBeVisible();

  expect(erreurs, 'erreurs console a l ouverture').toEqual([]);
});

test('navigation guidee, deplacement manuel, et les quatre reglages', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  // on ne surveille qu'a partir d'ici : le bruit de la page de connexion n'est pas le notre
  const erreurs = surveiller(page);
  s = await session(page);
  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);

  // --- navigation guidee : la camera rejoint vraiment la vue demandee
  await page.locator('.menu button', { hasText: /^Sacs$/ }).click();
  await page.waitForFunction(() => {
    const v = (window as any).__debug3d?.vues?.sacs;
    const c = (window as any).__debug3d?.camera?.position;
    return v && c && Math.hypot(c.x - v.pos.x, c.y - v.pos.y, c.z - v.pos.z) < 0.05;
  }, null, { timeout: 30_000 });

  // --- deplacement manuel : il s'active, et la camera bouge vraiment
  await page.locator('[data-test="manuel"]').click();
  await page.waitForFunction(() => (window as any).__manuel?.actif === true, null, { timeout: 30_000 });
  const avant = await page.evaluate(() => {
    const c = (window as any).__debug3d.camera.position; return { x: c.x, z: c.z };
  });
  await page.locator('canvas').click({ position: { x: 300, y: 200 } });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const apres = await page.evaluate(() => {
    const c = (window as any).__debug3d.camera.position; return { x: c.x, z: c.z };
  });
  expect(Math.hypot(apres.x - avant.x, apres.z - avant.z),
    'W n a pas fait avancer la camera').toBeGreaterThan(0.05);
  await page.locator('[data-test="manuel"]').click();
  await page.waitForFunction(() => (window as any).__manuel?.actif === false, null, { timeout: 30_000 });

  // --- musique : le petit lecteur repond
  await page.locator('[data-test="lecteur-poignee"]').click();
  await expect(page.locator('[data-test="lecteur-panneau"]')).toBeVisible();
  await page.locator('[data-test="lecteur-jouer"]').click();
  await page.waitForFunction(() => (window as any).__musique?.joue === true, null, { timeout: 30_000 });
  await page.locator('[data-test="lecteur-jouer"]').click();
  await page.waitForFunction(() => (window as any).__musique?.joue === false, null, { timeout: 15_000 });
  await page.locator('[data-test="lecteur-poignee"]').click();

  // --- lumiere, televisions, qualite : les trois reglages s'ouvrent et agissent
  const ouvrirReglage = async (cle: string, corps: string) => {
    if (await page.locator('[data-test="modale-fermer"]').count()) {
      await page.locator('[data-test="modale-fermer"]').click();
      await page.waitForTimeout(400);
    }
    // le selecteur de section : on va sur Reglages
    for (let i = 0; i < 3; i++) {
      if ((await page.locator('.ui').getAttribute('data-onglet')) === 'reglages') break;
      await page.locator('[data-test="onglet-suivant"]').click();
      await page.waitForTimeout(600);
    }
    await page.locator(`[data-test="reglage-${cle}"]`).click();
    await expect(page.locator(corps)).toBeVisible({ timeout: 15_000 });
  };

  await ouvrirReglage('lumiere', '.lumiere');
  const expoAvant = await page.evaluate(() => (window as any).__lumiere?.intensite);
  await page.locator('.lumiere-ambiances button').nth(2).click();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => (window as any).__lumiere?.intensite),
    'changer d ambiance n a pas change la lumiere').not.toBe(expoAvant);

  await ouvrirReglage('televisions', '.televisions');
  const allumeesAvant = await page.evaluate(() =>
    Object.values((window as any).__televisions?.allumees || {}).filter(Boolean).length);
  await page.locator('[data-test^="tv-bascule-"]').first().click();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() =>
    Object.values((window as any).__televisions?.allumees || {}).filter(Boolean).length),
  'eteindre un ecran n a rien change').not.toBe(allumeesAvant);

  await ouvrirReglage('qualite', '[data-test="reglage-qualite-options"]');
  await page.locator('[data-test="reglage-qualite-options"] button[data-option="faible"]').click();
  await page.waitForFunction(() => (window as any).__qualite?.mode === 'faible',
    null, { timeout: 30_000 });

  if (await page.locator('[data-test="modale-fermer"]').count()) {
    await page.locator('[data-test="modale-fermer"]').click();
  }
  expect(erreurs, 'erreurs console pendant les reglages').toEqual([]);
});

test('fermeture, retour a la liste, reouverture : les reglages reviennent', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  // on ne surveille qu'a partir d'ici : le bruit de la page de connexion n'est pas le notre
  const erreurs = surveiller(page);
  s = await session(page);
  await allerAuxBoutiques(page);
  await ouvrirDepuisLaListe(page, idBoutique);
  await entrer(page);

  // --- on change un reglage identifiable, et on laisse partir l'ecriture groupee
  const boucleAvant = await page.evaluate(() => (window as any).__playlist?.boucle);
  await page.locator('[data-test="lecteur-poignee"]').click();
  await page.locator('[data-test="lecteur-boucle"]').click();
  await page.waitForFunction((v) => (window as any).__playlist?.boucle !== v,
    boucleAvant, { timeout: 15_000 });
  const boucleApres = await page.evaluate(() => (window as any).__playlist?.boucle);
  await page.waitForTimeout(3000);

  // --- FERMETURE : on revient a la liste, et la scene est liberee
  await page.getByRole('button', { name: 'Boutiques' }).first().click();
  await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('canvas').count(), 'la scene n a pas ete liberee').toBe(0);
  await expect(page.locator(`[data-testid="ouvrir-boutique-${idBoutique}"]`),
    'la liste des boutiques n est pas revenue').toBeVisible();

  // --- REOUVERTURE : le reglage revient
  await ouvrirDepuisLaListe(page, idBoutique);
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as any).__playlist?.boucle),
    'le reglage n est pas revenu apres fermeture puis reouverture').toBe(boucleApres);

  // --- et la base porte bien ce reglage, dans les quatre sections attendues
  const ligne = await rest(s, `boutique_reglages?boutique_id=eq.${idBoutique}&select=donnees`);
  const donnees = (ligne.corps as Array<{ donnees: Record<string, unknown> }>)[0]?.donnees;
  expect(donnees, 'aucune ligne de reglages en base').toBeTruthy();
  expect(Object.keys(donnees).sort()).toEqual(['lumiere', 'musique', 'playlist', 'televisions']);
  expect((donnees.playlist as { boucle?: boolean })?.boucle).toBe(boucleApres);

  expect(erreurs, 'erreurs console sur le cycle complet').toEqual([]);
});

test.describe('sur telephone', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

  test('la boutique s ouvre et repond au doigt', async ({ page }) => {
    test.setTimeout(LONG * 2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await connectAdmin(page);
    // On ne surveille qu A PARTIR D ICI, comme les trois tests precedents. La surveillance
    // commencait avant la connexion et rapportait une erreur qui n est pas la notre :
    // « TypeError: Failed to fetch » levee dans supabase-js, pile entierement dans
    // _updateUser / _useSession. Mesure faite a 412 px, avec horodatage : a 2,9 s apres la
    // fermeture de la fenetre de connexion, quatre requetes REST de Talvex — /leads et
    // /registrations, son propre tableau de bord — partent en net::ERR_ABORTED quand ses
    // composants se demontent. La boutique n est pas encore montee a cet instant. Surveiller
    // cette fenetre-la, c est reprocher a la boutique le menage de son hote.
    const erreurs = surveiller(page);
    s = await session(page);
    await allerAuxBoutiques(page);
    await ouvrirDepuisLaListe(page, idBoutique);
    await entrer(page);

    const cadre = await page.locator('.boutique3d-cadre').boundingBox();
    for (const sel of ['.ui', '[data-test="barre-section"]', '.lecteur-bloc']) {
      const b = await page.locator(sel).boundingBox();
      expect(b!.x, `${sel} sort du cadre a gauche`).toBeGreaterThanOrEqual(cadre!.x - 1);
      expect(b!.x + b!.width, `${sel} sort du cadre a droite`)
        .toBeLessThanOrEqual(cadre!.x + cadre!.width + 1);
    }

    // AU DOIGT : la fleche du selecteur change de section
    const fleche = await page.locator('[data-test="onglet-suivant"]').boundingBox();
    await page.touchscreen.tap(fleche!.x + fleche!.width / 2, fleche!.y + fleche!.height / 2);
    await page.waitForTimeout(1200);
    expect(await page.locator('.ui').getAttribute('data-onglet'),
      'la fleche n a pas change de section au doigt').toBe('reglages');

    expect(erreurs, 'erreurs console sur telephone').toEqual([]);
  });
});

test('la base est revenue propre', async () => {
  test.setTimeout(60_000);
  expect(s, 'pas de session').not.toBeNull();
  await rest(s!, `boutiques?id=eq.${idBoutique}`, { method: 'DELETE' });
  const reste = await rest(s!, `boutiques?name=like.${encodeURIComponent('%[TEST]%')}&select=id,name`);
  expect((reste.corps as unknown[]).length, 'des boutiques [TEST] subsistent').toBe(0);
  const reg = await rest(s!, `boutique_reglages?boutique_id=eq.${idBoutique}&select=boutique_id`);
  expect((reg.corps as unknown[]).length, 'les reglages n ont pas suivi en cascade').toBe(0);
});
