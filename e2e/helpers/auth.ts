import { type Page, expect } from '@playwright/test';
import { TEST_IDS } from './testIds';

const SUPER_ADMIN_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL || 'contact@talvex.fr';
const SUPER_ADMIN_PIN = process.env.E2E_SUPER_ADMIN_PIN || '000000';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'dmms090191@gmail.com';
const ADMIN_PIN = process.env.E2E_ADMIN_PIN || '000000';

const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client@gmail.com';
const CLIENT_PIN = process.env.E2E_CLIENT_PIN || '000000';

const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'm.a@gmail.com';
const VENDOR_PIN = process.env.E2E_VENDOR_PIN || '000000';

export async function loginWith(page: Page, email: string, pin: string) {
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('Le PIN doit etre un code a 6 chiffres.');
  }

  await page.goto('/');
  // On attend le BOUTON de connexion, pas le nom commercial. L'assertion precedente cherchait
  // « Novigo 3D » : la page d'accueil dit « Talvex » depuis un changement de marque, et ce
  // helper — donc les quatre suites qui s'en servent — echouait avant meme d'avoir clique.
  // Un bouton qu'on s'apprete a cliquer est de toute facon la bonne chose a attendre : il ne
  // depend pas du texte de vitrine.
  //
  // On vise le bouton par son ICONE, et non par son nom accessible.
  //
  // Le libelle « Connexion » vit dans un <span class="hidden sm:inline"> : sous 640 px il passe
  // en display:none. Un texte en display:none ne compte pas dans le nom accessible, et le
  // bouton ne porte pas d aria-label de secours — a 412 px il n a donc AUCUN nom, et
  // getByRole({ name: 'Connexion' }) ne trouve rien. Mesure : 1 resultat a 1280 et a 768,
  // 0 a 412, alors que le bouton est bien visible aux trois gabarits.
  //
  // L icone, elle, est rendue partout. Le nom accessible reste le premier choix la ou il
  // existe : c est le repere le plus proche de ce qu un visiteur lit.
  const boutonConnexion = page
    .locator(`header button:has(svg.lucide-log-in), header button:text-is("${TEST_IDS.home.loginButton}")`)
    .first();
  await expect(boutonConnexion, 'la page d accueil n a pas presente son bouton Connexion').toBeVisible();

  await boutonConnexion.click();

  // La fenetre est ouverte des que son champ e-mail est la, et refermee quand il disparait.
  // C'est ce qu'on attend, et non plus la phrase « Accédez à votre espace personnel » : elle
  // n'est plus affichee, et les deux assertions qui la cherchaient faisaient echouer ce helper
  // — donc les quatre suites qui s'en servent. Un champ que l'on va remplir est un repere plus
  // sur qu'une ligne de texte, qui change au gre des retouches d'interface.
  const champEmail = page.getByPlaceholder(TEST_IDS.login.emailInput).first();
  await expect(champEmail, 'la fenetre de connexion ne s est pas ouverte').toBeVisible();

  await champEmail.fill(email);

  await page.getByRole('button', { name: 'Afficher' }).click();

  const pinInputs = page.locator(TEST_IDS.login.pinInputs);
  for (let i = 0; i < 6; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  await page.getByRole('button', { name: TEST_IDS.login.submitButton }).click();
  await expect(champEmail, 'la connexion n a pas abouti : la fenetre est restee ouverte')
    .not.toBeVisible({ timeout: 15_000 });
}

/**
 * Connecte le Super Admin au CRM depuis la page d'accueil.
 */
export async function connectSuperAdmin(page: Page) {
  await loginWith(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PIN);
}

/**
 * Connecte un Admin au CRM depuis la page d'accueil.
 */
export async function connectAdmin(page: Page) {
  await loginWith(page, ADMIN_EMAIL, ADMIN_PIN);
}

/**
 * Connecte un Client au CRM depuis la page d'accueil.
 */
export async function connectClient(page: Page) {
  await loginWith(page, CLIENT_EMAIL, CLIENT_PIN);
}

/**
 * Connecte un Vendeur au CRM depuis la page d'accueil.
 */
export async function connectVendor(page: Page) {
  await loginWith(page, VENDOR_EMAIL, VENDOR_PIN);
}
