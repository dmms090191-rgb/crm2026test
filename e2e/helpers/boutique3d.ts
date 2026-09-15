import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Ce dont toutes les suites de la boutique 3D ont besoin : une session, un acces REST, et le
 * chemin qui mene de la page d'accueil jusqu'a l'interieur d'une boutique.
 *
 * Ces fonctions existent aussi, a l'identique, dans boutique3d-verification-finale.spec.ts.
 * Elles n'y ont pas ete remplacees : cette suite-la est verte et sert de reference avant un
 * commit. On la laissera converger vers ce fichier quand elle n'aura plus ce role.
 */

export type Session = { url: string; anon: string; jeton: string; companyId: string };

/**
 * URL et cle publique viennent du .env, lu DANS NODE.
 *
 * Elles ne peuvent pas venir de la page : `import.meta.env` est remplace par Vite AU MOMENT DE
 * LA CONSTRUCTION, et le code passe a `page.evaluate` n'est pas traite par Vite. Seul le JETON
 * vient de la page : lui n'existe qu'apres la connexion.
 */
export function configuration() {
  const brut = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
  const env: Record<string, string> = {};
  for (const ligne of brut.split(/\r?\n/)) {
    const i = ligne.indexOf('=');
    if (i > 0) env[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  return { url: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_ANON_KEY };
}

export async function session(page: Page): Promise<Session> {
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

export async function rest(s: Session, chemin: string, options: RequestInit = {}) {
  const r = await fetch(`${s.url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: s.anon, Authorization: `Bearer ${s.jeton}`,
      'Content-Type': 'application/json', ...(options.headers || {}),
    },
  });
  const texte = await r.text();
  return { statut: r.status, corps: texte ? JSON.parse(texte) : null };
}

/** Les reglages d'une boutique tels que la base les porte, ou null s'il n'y a pas de ligne. */
export async function reglagesEnBase(s: Session, id: string) {
  const r = await rest(s, `boutique_reglages?boutique_id=eq.${id}&select=donnees,maj`);
  const lignes = r.corps as Array<{ donnees: Record<string, unknown>; maj: string }> | null;
  return lignes && lignes.length ? lignes[0] : null;
}

/**
 * Va a la section Boutique, en ouvrant d'abord la barre laterale si elle est rangee.
 *
 * A 412 px et en dessous, la barre laterale de Talvex n'est pas masquee : elle est POUSSEE hors
 * de l'ecran (mesure : <aside> a x = -300). Elle s'ouvre par un bouton a icone « menu » qui n'a
 * aucun nom accessible — on le vise donc par son icone.
 */
export async function allerAuxBoutiques(page: Page) {
  const entree = page.getByText('Boutique', { exact: true }).first();
  const dehors = async () => {
    const b = await entree.boundingBox().catch(() => null);
    return !b || b.x < 0;
  };
  if (await dehors()) {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    await expect.poll(dehors, { timeout: 15_000, message: "la barre laterale ne s est pas ouverte" })
      .toBe(false);
  }
  await entree.click();
  await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible({ timeout: 30_000 });
}

/** Ouvre la boutique depuis la LISTE et attend que la scene soit construite. */
export async function ouvrirDepuisLaListe(page: Page, id: string) {
  await page.locator(`[data-testid="ouvrir-boutique-${id}"]`).click();
  await page.waitForFunction(
    () => {
      const d = (window as any).__debug3d;
      return d && Object.keys(d.vues || {}).length >= 9;
    },
    null, { timeout: 180_000 },
  );
}

/** Franchit la facade et attend d'etre dans la boutique. */
export async function entrer(page: Page) {
  await page.locator('.entrer').click();
  await page.waitForFunction(() => (window as any).__debug3d?.etape === 'boutique',
    null, { timeout: 120_000 });
  await page.waitForTimeout(2500);
}

/** Referme la boutique et attend le retour a la liste. */
export async function fermer(page: Page) {
  await page.getByRole('button', { name: 'Boutiques' }).first().click();
  await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible({ timeout: 30_000 });
}

/**
 * Collecte les erreurs de console.
 *
 * La liste de bruit est volontairement etroite. « status of 404 » en a ete RETIRE : l unique 404
 * mesure vient de /favicon.ico, que le terme « favicon » couvre deja, et le garder revenait a
 * avaler aussi le 404 d un GLB ou d une texture absente.
 */
export function surveiller(page: Page) {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Le message d'une ressource qui manque ne porte PAS son URL : « Failed to load resource:
    // the server responded with a status of 404 ». L'URL est rangee a part, dans location().
    // Filtrer sur le seul texte laissait donc passer le 404 du favicon — et y ajouter
    // « status of 404 » aurait aussi avale celui d'un GLB ou d'une texture absente.
    const ou = m.location()?.url || '';
    if (/SwiftShader|software WebGL|DevTools|favicon|caniuse-lite/i.test(t + ' ' + ou)) return;
    if (t.startsWith('Warning:')) return;
    erreurs.push(t + (ou ? ' <- ' + ou : ''));
  });
  return erreurs;
}
