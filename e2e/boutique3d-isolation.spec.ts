import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { connectAdmin, connectSuperAdmin } from './helpers/auth';

/**
 * DEUX BOUTIQUES, UN SEUL MODELE, DES DONNEES INDEPENDANTES.
 *
 * C'est la promesse centrale du chantier Talvex : plusieurs Societes partent du meme modele
 * « Johanna — Mode Luxe », et leurs reglages ne se touchent jamais. Ce fichier la met a
 * l'epreuve pour de vrai, contre la base LIVE.
 *
 * ┌─ CE TEST ECRIT DANS LA BASE DE PRODUCTION ────────────────────────────────────────────────┐
 * │ Il cree DEUX boutiques prefixees [TEST], modifie un reglage de l'une, et SUPPRIME tout a  │
 * │ la fin — la cascade de `boutique_reglages.boutique_id` emporte leurs reglages avec elles. │
 * │ Le nettoyage est dans un `afterAll` : il tourne meme si un test echoue en cours de route. │
 * │ Autorise explicitement par le client pour cette verification.                             │
 * └───────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Il passe par l'API REST avec le JETON DE SESSION de l'utilisateur connecte, et non par une
 * cle de service. C'est deliberé : chaque requete traverse donc les vraies policies, et le test
 * verifie la securite en meme temps que l'isolation.
 */

const PREFIXE = '[TEST] boutique3d';
const MODELE = 'johanna-mode-luxe';
/** Le moteur groupe ses ecritures : REPORT_MS vaut 900 ms cote moteur, on laisse de la marge. */
const REPOS_ECRITURE = 3000;
const LONG = 180_000;

type Session = { url: string; anon: string; jeton: string; companyId: string; role: string };

/**
 * URL et cle publique viennent du .env, lu DANS NODE.
 *
 * Elles ne peuvent pas venir de la page : `import.meta.env` est remplace par Vite AU MOMENT
 * DE LA CONSTRUCTION, et le code passe a `page.evaluate` n'est pas traite par Vite — il
 * serait evalue tel quel dans le navigateur, ou `import.meta` n'existe pas dans ce contexte.
 * Seul le JETON de session vient de la page : lui n'existe qu'apres la connexion.
 */
function configuration() {
  const brut = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env: Record<string, string> = {};
  for (const ligne of brut.split(/\r?\n/)) {
    const i = ligne.indexOf('=');
    if (i > 0) env[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  return { url: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_ANON_KEY };
}

/** Lit l'URL, la cle publique et le JETON de session dans la page deja connectee. */
async function session(page: Page): Promise<Session> {
  const { url, anon } = configuration();
  expect(url, 'VITE_SUPABASE_URL absente du .env').toBeTruthy();
  const jeton = await page.evaluate(() => {
    // Le client Supabase de Talvex range sa session dans sessionStorage (src/lib/supabase.ts).
    let jeton = '';
    for (let i = 0; i < sessionStorage.length; i++) {
      const cle = sessionStorage.key(i)!;
      if (!cle.includes('auth-token')) continue;
      try {
        const v = JSON.parse(sessionStorage.getItem(cle) || '{}');
        if (v?.access_token) { jeton = v.access_token; break; }
      } catch { /* cle sans rapport */ }
    }
    return jeton;
  });
  expect(jeton, 'aucun jeton de session : la connexion a echoue').not.toBe('');

  // La SOCIETE de l'utilisateur vient de sa claim `app_metadata.company_id` — c'est exactement
  // ce que lisent les policies de `boutiques`. Sans elle dans l'INSERT, la clause WITH CHECK
  // « company_id = la claim » est fausse et la base repond 403. On decode donc la charge utile
  // du jeton : c'est une lecture de claim, pas une manipulation de secret.
  const charge = JSON.parse(
    Buffer.from(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
  ) as { app_metadata?: { company_id?: string; role?: string } };
  const companyId = charge.app_metadata?.company_id ?? '';
  const role = charge.app_metadata?.role ?? '';

  return { url, anon, jeton, companyId, role };
}

/** Un appel REST AVEC le jeton de l'utilisateur : il traverse donc les policies. */
async function rest(s: Session, chemin: string, options: RequestInit = {}) {
  const r = await fetch(`${s.url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: s.anon,
      Authorization: `Bearer ${s.jeton}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const texte = await r.text();
  let corps: unknown = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch { corps = texte; }
  return { statut: r.status, corps };
}

const creerBoutique = (s: Session, nom: string) =>
  rest(s, 'boutiques?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ company_id: s.companyId, name: nom, template_key: MODELE }),
  });

const reglagesDe = (s: Session, id: string) =>
  rest(s, `boutique_reglages?boutique_id=eq.${id}&select=donnees,maj`);

/** Ouvre la vue Boutiques du panel Societe. */
async function allerAuxBoutiques(page: Page) {
  await page.getByText('Boutique', { exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible({ timeout: 30_000 });
}

let sessionAdmin: Session | null = null;
const creees: string[] = [];

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  // NETTOYAGE, quoi qu'il arrive. La suppression d'une boutique emporte ses reglages par
  // cascade : il n'y a donc rien d'autre a effacer.
  if (!sessionAdmin || creees.length === 0) return;
  for (const id of creees) {
    await rest(sessionAdmin, `boutiques?id=eq.${id}`, { method: 'DELETE' });
  }
});

/**
 * GARDE — elle tourne AVANT tout le reste, et elle n'ecrit rien.
 *
 * Elle verifie les quatre choses dont depend la suite : la connexion Societe aboutit, le jeton
 * de session est lisible, la vue Boutiques s'ouvre, et les deux objets de la migration existent
 * bien en base. Si l'une manque, le fichier s'arrete ICI — en mode serial, les tests suivants
 * ne demarrent pas. On ne veut pas creer deux boutiques de test pour echouer juste apres et
 * laisser des lignes derriere soi.
 */
test('garde : acces, session et migrations en place, avant toute ecriture', async ({ page }) => {
  test.setTimeout(LONG);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  const s = await session(page);
  sessionAdmin = s;

  await allerAuxBoutiques(page);

  // La colonne : une erreur 400 « column ... does not exist » signifie migration 1 non appliquee.
  const colonne = await rest(s, 'boutiques?select=template_version&limit=1');
  expect(colonne.statut,
    `migration 1 non appliquee — template_version absente (${JSON.stringify(colonne.corps)})`)
    .toBe(200);

  // La table : un 404 signifie migration 2 non appliquee.
  const table = await rest(s, 'boutique_reglages?select=boutique_id&limit=1');
  expect(table.statut,
    `migration 2 non appliquee — boutique_reglages absente (${JSON.stringify(table.corps)})`)
    .toBe(200);
});

test('deux boutiques du meme modele gardent des reglages independants', async ({ page }) => {
  test.setTimeout(LONG * 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await connectAdmin(page);
  const s = await session(page);
  sessionAdmin = s;

  // --- les deux boutiques de test, creees par l'API donc a travers les policies
  const a = await creerBoutique(s, `${PREFIXE} A`);
  const b = await creerBoutique(s, `${PREFIXE} B`);
  expect(a.statut, 'creation de A refusee').toBe(201);
  expect(b.statut, 'creation de B refusee').toBe(201);
  const idA = (a.corps as Array<{ id: string }>)[0].id;
  const idB = (b.corps as Array<{ id: string }>)[0].id;
  creees.push(idA, idB);

  // La colonne de version doit exister et valoir 1 par defaut.
  expect((a.corps as Array<{ template_version?: number }>)[0].template_version,
    'template_version absente ou differente de 1').toBe(1);

  // --- on ouvre A et on change UN reglage : la boucle de lecture
  await allerAuxBoutiques(page);
  await page.locator(`[data-testid="ouvrir-boutique-${idA}"]`).click();
  await page.waitForFunction(
    () => (window as any).__debug3d
      && Object.keys((window as any).__debug3d.vues || {}).length >= 9,
    null, { timeout: LONG });
  await page.locator('.entrer').click();
  await page.waitForFunction(
    () => (window as any).__debug3d?.etape === 'boutique', null, { timeout: LONG });
  await page.waitForTimeout(2000);

  const boucleAvant = await page.evaluate(() => (window as any).__playlist?.boucle);
  await page.locator('[data-test="lecteur-poignee"]').click();
  await page.locator('[data-test="lecteur-boucle"]').click();
  await page.waitForFunction(
    (v) => (window as any).__playlist?.boucle !== v, boucleAvant, { timeout: 15_000 });
  const boucleApres = await page.evaluate(() => (window as any).__playlist?.boucle);
  expect(boucleApres, 'la boucle n a pas change').not.toBe(boucleAvant);
  await page.waitForTimeout(REPOS_ECRITURE);

  // --- A a une ligne, et elle porte le changement
  const ligneA = await reglagesDe(s, idA);
  expect(ligneA.statut, 'lecture des reglages de A').toBe(200);
  const donneesA = (ligneA.corps as Array<{ donnees: Record<string, any> }>)[0]?.donnees;
  expect(donneesA, 'A n a aucune ligne de reglages : l ecriture distante n est pas partie')
    .toBeTruthy();
  expect(donneesA.playlist?.boucle, 'A n a pas enregistre la boucle').toBe(boucleApres);

  // --- ce qui NE doit PAS y etre
  expect(Object.keys(donneesA).sort(), 'seules les quatre sections prevues partent en base')
    .toEqual(['lumiere', 'musique', 'playlist', 'televisions']);
  expect(donneesA.preferences, 'les preferences du visiteur ne doivent jamais partir')
    .toBeUndefined();
  expect(donneesA.musique?.volume, 'le volume ne doit jamais partir').toBeUndefined();

  // --- B n a pas bouge
  const ligneB = await reglagesDe(s, idB);
  expect(ligneB.statut).toBe(200);
  const donneesB = (ligneB.corps as Array<{ donnees: Record<string, any> }>)[0]?.donnees;
  if (donneesB) {
    expect(donneesB.playlist?.boucle,
      'B a suivi le changement de A : les deux boutiques ne sont pas independantes')
      .not.toBe(boucleApres);
  }
  // Pas de ligne du tout pour B est le resultat le plus propre : on n a jamais ouvert B.
  expect((ligneB.corps as unknown[]).length,
    'B ne devrait avoir aucune ligne : elle n a jamais ete ouverte').toBe(0);

  // --- rechargement de A : le reglage revient de la base
  await page.reload();
  await allerAuxBoutiques(page);
  await page.locator(`[data-testid="ouvrir-boutique-${idA}"]`).click();
  await page.waitForFunction(
    () => (window as any).__playlist !== undefined, null, { timeout: LONG });
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as any).__playlist?.boucle),
    'apres rechargement, A n a pas retrouve son reglage').toBe(boucleApres);
});

test('Talvex Admin voit les reglages des deux boutiques', async ({ page }) => {
  test.setTimeout(LONG);
  test.skip(creees.length < 2, 'les boutiques de test n ont pas ete creees');
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Les identifiants du compte Talvex Admin sont ceux du depot (contact@talvex.fr, PIN par
  // defaut) et peuvent ne plus valoir. Si la connexion n'aboutit pas, on SAUTE ce test en le
  // DISANT — plutot que de faire echouer la chaine et d'empecher la verification de proprete
  // qui la suit. Un test saute avec sa raison se voit dans le rapport ; une chaine cassee
  // masque tout ce qui venait apres.
  try {
    await connectSuperAdmin(page);
  } catch {
    test.skip(true, 'connexion Talvex Admin impossible : identifiants du depot invalides '
      + '(E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PIN). Role non verifie.');
  }
  const sSA = await session(page);
  expect(sSA.role, 'le compte utilise n est pas un super_admin').toBe('super_admin');

  // La policy delegue a `boutiques` : un super_admin y voit tout, il doit donc voir les
  // reglages de n'importe quelle boutique.
  const vues = await rest(sSA, `boutiques?id=in.(${creees.join(',')})&select=id,name`);
  expect(vues.statut).toBe(200);
  expect((vues.corps as unknown[]).length,
    'Talvex Admin ne voit pas les deux boutiques de test').toBe(2);

  const r = await reglagesDe(sSA, creees[0]);
  expect(r.statut, 'Talvex Admin ne peut pas lire les reglages').toBe(200);
  expect((r.corps as unknown[]).length,
    'Talvex Admin devrait voir la ligne de reglages de A').toBe(1);
});

test('la base est revenue propre', async () => {
  test.setTimeout(60_000);
  expect(sessionAdmin, 'pas de session pour verifier le nettoyage').not.toBeNull();
  for (const id of creees) {
    await rest(sessionAdmin!, `boutiques?id=eq.${id}`, { method: 'DELETE' });
  }
  const reste = await rest(sessionAdmin!,
    `boutiques?name=like.${encodeURIComponent(PREFIXE + '%')}&select=id,name`);
  expect(reste.statut).toBe(200);
  expect((reste.corps as unknown[]).length,
    'des boutiques [TEST] subsistent en base').toBe(0);

  for (const id of creees) {
    const r = await reglagesDe(sessionAdmin!, id);
    expect((r.corps as unknown[]).length,
      `les reglages de ${id} n ont pas ete emportes par la cascade`).toBe(0);
  }
});
