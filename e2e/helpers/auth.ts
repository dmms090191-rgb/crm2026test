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
  await expect(page.getByText('Novigo 3D').first()).toBeVisible();

  await page.getByRole('button', { name: TEST_IDS.home.loginButton }).first().click();
  await expect(page.getByText('Accédez à votre espace personnel')).toBeVisible();

  await page.getByPlaceholder(TEST_IDS.login.emailInput).first().fill(email);

  await page.getByRole('button', { name: 'Afficher' }).click();

  const pinInputs = page.locator(TEST_IDS.login.pinInputs);
  for (let i = 0; i < 6; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  await page.getByRole('button', { name: TEST_IDS.login.submitButton }).click();
  await expect(page.getByText('Accédez à votre espace personnel')).not.toBeVisible({ timeout: 15_000 });
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
