import { test, expect, type Page } from '@playwright/test';
import { connectAdmin, loginWith } from './helpers/auth';
import { session, rest, type Session } from './helpers/boutique3d';

/**
 * CRM IMMO — LE DROIT D'ACCES. « Masque » et « interdit » sont deux choses differentes.
 *
 * Ce que cette suite protege, et pourquoi chaque assertion existe :
 *
 *   1. une Societe SANS droit ne recoit pas l'entree dans la barre laterale. Ce n'est pas
 *      un masquage : l'entree n'est pas emise du tout, parce que le drapeau `hidden` ne
 *      doit JAMAIS porter le droit. Le bouton « Par defaut » de la reorganisation n'est
 *      garde par rien et reecrit tous les drapeaux `hidden` depuis la declaration du
 *      code : un droit porte par `hidden` serait rendu a la Societe en deux clics ;
 *
 *   2. une Societe SANS droit ne peut pas ouvrir la vue MEME en forcant, et elle obtient
 *      un REFUS NOMME. C'est la demande explicite de David : « le simple systeme hidden
 *      de la sidebar ne suffit PAS ». Le forcage passe par sessionStorage, chemin reel du
 *      depot (useAdminDashboardEffects consomme crm_connect_return_context au montage et
 *      appelle setActiveView sans passer par la barre laterale) ;
 *
 *   3. ce refus n'est ni le Dashboard ni une page vide. AdminViewRenderer a un `default:`
 *      qui retourne la Vue d'ensemble : un `case` oublie ouvre donc le Dashboard SANS
 *      aucune erreur de console ni de build — et `npm run build` vaut `vite build` seul,
 *      donc Vercel deploierait le defaut. Un test qui se contenterait de « la page ne
 *      plante pas » passerait au vert. D'ou l'assertion sur l'ABSENCE du Dashboard.
 *
 * LA PREMISSE EST MESUREE, PAS SUPPOSEE : la suite lit crm_immo_acces en base pour la
 * Societe du compte de test. Si cette Societe avait un jour le module, le test negatif
 * perdrait tout son sens en silence — il s'arrete alors plutot que de passer pour rien.
 */

test.describe.configure({ mode: 'serial' });

const CAPTURES = 'test-results/captures-crm-immo-acces';

/* Le compte autorise n'est pas dans le depot : le PIN de Ruth appartient a Ruth.
   Fournir E2E_IMMO_EMAIL et E2E_IMMO_PIN active le test positif ; sans eux il est
   saute, en le DISANT, plutot que de passer silencieusement. */
const IMMO_EMAIL = process.env.E2E_IMMO_EMAIL || '';
const IMMO_PIN = process.env.E2E_IMMO_PIN || '';

let s: Session | null = null;

/** Force l'ouverture de la vue sans passer par la barre laterale, par le chemin reel du depot. */
async function forcerOuverture(page: Page) {
  await page.evaluate(() => {
    sessionStorage.setItem('crm_connect_return_context', JSON.stringify({
      fromRole: 'admin', fromTab: 'crm-immo', scrollY: 0, timestamp: Date.now(),
    }));
  });
  await page.reload();
}

test('PREMISSE : la Societe du compte de test n a PAS le module', async ({ page }) => {
  await connectAdmin(page);
  s = await session(page);
  expect(s.companyId, 'aucun company_id dans le jeton').not.toBe('');

  const r = await rest(s, `crm_immo_acces?company_id=eq.${s.companyId}&select=company_id,active`);
  const lignes = (r.corps ?? []) as Array<{ active: boolean }>;
  expect(lignes.length,
    'cette Societe a une ligne crm_immo_acces : le test negatif ne prouverait plus rien').toBe(0);

  /* La RPC doit dire la meme chose que la table. Si les deux divergeaient, l'interface
     et la base ne seraient pas d'accord, et c'est exactement ce que la RPC evite. */
  const rpc = await fetch(`${s.url}/rest/v1/rpc/has_crm_immo_access`, {
    method: 'POST',
    headers: { apikey: s.anon, Authorization: `Bearer ${s.jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_company_id: s.companyId }),
  });
  expect(rpc.status, 'la RPC doit repondre a un utilisateur connecte').toBe(200);
  expect(await rpc.json(), 'la RPC doit refuser cette Societe').toBe(false);
});

test('SANS DROIT : aucune entree CRM Immo dans la barre laterale', async ({ page }) => {
  await connectAdmin(page);

  /* On ouvre la barre laterale si elle est poussee hors de l'ecran (sous 412 px elle
     n'est pas masquee mais deplacee a x negatif). */
  const repere = page.getByText('Dashboard', { exact: true }).first();
  const dehors = async () => {
    const b = await repere.boundingBox().catch(() => null);
    return !b || b.x < 0;
  };
  if (await dehors()) {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    await expect.poll(dehors, { timeout: 15_000 }).toBe(false);
  }

  /* L'entree n'est pas MASQUEE, elle n'est pas EMISE : zero occurrence dans le DOM. */
  await expect(page.locator('aside').getByText('CRM Immo', { exact: true })).toHaveCount(0);

  await page.screenshot({ path: `${CAPTURES}/1-sidebar-sans-droit.png`, fullPage: false });
});

test('SANS DROIT : l ouverture forcee donne un REFUS NOMME, jamais le Dashboard', async ({ page }) => {
  await connectAdmin(page);
  await forcerOuverture(page);

  /* Le refus est nomme et visible. Il n'est ni null, ni un repli sur la Vue d'ensemble. */
  const refus = page.getByTestId('crm-immo-refus');
  await expect(refus, "l ouverture forcee n a pas affiche le refus nomme").toBeVisible({ timeout: 30_000 });
  await expect(refus).toContainText('pas active');

  /* LE point du test : le module n'est pas monte, et le Dashboard ne s'est pas glisse
     a sa place. Le titre du module est unique dans tout le panel. */
  await expect(page.getByTestId('crm-immo-titre'),
    'le module a ete monte sans droit').toHaveCount(0);
  await expect(page.getByTestId('crm-immo'),
    'la vue du module a ete montee sans droit').toHaveCount(0);

  /* Le fil d'Ariane dit bien « CRM Immo » : la vue EST active, c'est la Porte qui refuse.
     Sans cette assertion, un test vert pourrait simplement signifier que setActiveView
     n'a jamais pris, et le refus n'aurait alors rien prouve. */
  await expect(page.locator('header').getByText('CRM Immo').first(),
    "la vue n a pas ete ouverte : le refus ne prouve rien").toBeVisible({ timeout: 15_000 });

  await page.screenshot({ path: `${CAPTURES}/2-refus-nomme.png`, fullPage: false });
});

test('AVEC DROIT : l entree existe et mene au module', async ({ page }) => {
  test.skip(!IMMO_EMAIL || !IMMO_PIN,
    'E2E_IMMO_EMAIL / E2E_IMMO_PIN absents : le compte autorise n est pas dans le depot');

  await loginWith(page, IMMO_EMAIL, IMMO_PIN);
  const sess = await session(page);

  /* Premisse symetrique de la premiere : ce compte DOIT avoir le module. */
  const r = await rest(sess, `crm_immo_acces?company_id=eq.${sess.companyId}&select=active`);
  const lignes = (r.corps ?? []) as Array<{ active: boolean }>;
  expect(lignes.length, 'ce compte n a pas de ligne crm_immo_acces').toBe(1);
  expect(lignes[0].active, 'le module est inactif pour ce compte').toBe(true);

  const entree = page.locator('aside').getByText('CRM Immo', { exact: true }).first();
  await expect(entree, "l entree CRM Immo manque alors que le droit est accorde").toBeVisible({ timeout: 30_000 });
  await entree.click();

  await expect(page.getByTestId('crm-immo-titre')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('crm-immo-refus')).toHaveCount(0);

  await page.screenshot({ path: `${CAPTURES}/3-module-avec-droit.png`, fullPage: false });
});
