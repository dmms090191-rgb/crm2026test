import { test, expect } from '@playwright/test';
import { connectAdmin, loginWith } from '../helpers/auth';

const EMAIL = 'dmms090191@gmail.com';
const DEFAULT_PIN = '000000';
const TEMP_PIN = '111111';
const DEFAULT_FIRST_NAME = 'David';
const DEFAULT_LAST_NAME = 'Schemmama';
const TEMP_FIRST_NAME = 'Eric';
const TEMP_LAST_NAME = 'Dubois';

type TestPage = import('@playwright/test').Page;

async function navigateToInfoAdmin(page: TestPage) {
  await page.getByRole('button', { name: /^Info admin$/ }).click();
  await expect(page.getByText("Informations sur l'administrateur")).toBeVisible({ timeout: 10_000 });
}

async function clickAfficherPin(page: TestPage) {
  await page.getByTestId('info-admin-toggle-pin').click();
  await expect(page.getByTestId('info-admin-pin-0')).toHaveAttribute('type', 'text');
}

async function fillInfoAdminPin(page: TestPage, pin: string) {
  for (let i = 0; i < pin.length; i++) {
    const input = page.getByTestId(`info-admin-pin-${i}`);
    await input.fill('');
    await input.fill(pin[i]);
  }
  // Verification rapide du dernier digit
  await expect(page.getByTestId('info-admin-pin-5')).toHaveValue(pin[5]);
}

async function saveIdentity(page: TestPage, firstName: string, lastName: string) {
  const firstNameInput = page.getByTestId('info-admin-firstname');
  const lastNameInput = page.getByTestId('info-admin-lastname');

  await firstNameInput.clear();
  await firstNameInput.fill(firstName);
  await lastNameInput.clear();
  await lastNameInput.fill(lastName);

  await page.getByTestId('info-admin-save-identity-btn').click();
  await expect(page.getByText('Nom et prénom enregistrés.')).toBeVisible({ timeout: 10_000 });
}

async function saveCredentialsWithoutChangingEmail(page: TestPage, pin: string) {
  await expect(page.getByTestId('info-admin-email')).toHaveValue(EMAIL);
  await clickAfficherPin(page);
  await fillInfoAdminPin(page, pin);
  await page.getByTestId('info-admin-save-credentials-btn').click();
  await expect(page.getByText('Email et mot de passe enregistrés.')).toBeVisible({ timeout: 10_000 });
}

async function logout(page: TestPage) {
  await page.getByRole('button', { name: /Deconnexion/i }).click();
  await expect(page.getByText('Novigo 3D').first()).toBeVisible({ timeout: 10_000 });
}

async function verifyDashboard(page: TestPage) {
  await expect(page.getByText("Vue d'ensemble").first()).toBeVisible({ timeout: 15_000 });
}

async function verifyTopBarName(page: TestPage, firstName: string, lastName: string) {
  await expect(page.getByTestId('topbar-admin-name')).toHaveText(`${firstName} ${lastName}`, { timeout: 5_000 });
}

test.describe('Info Admin', () => {
  test('Admin peut modifier prenom/nom/PIN sans changer email, puis tout restaurer', async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Connexion
    await connectAdmin(page);

    // 2. Info admin
    await navigateToInfoAdmin(page);

    // 3. Verifier champs preremplis
    await expect(page.getByTestId('info-admin-firstname')).toHaveValue(DEFAULT_FIRST_NAME, { timeout: 10_000 });
    await expect(page.getByTestId('info-admin-lastname')).toHaveValue(DEFAULT_LAST_NAME, { timeout: 10_000 });
    await expect(page.getByTestId('info-admin-email')).toHaveValue(EMAIL, { timeout: 10_000 });
    await expect(page.getByTestId('info-admin-pin-0')).not.toHaveValue('', { timeout: 5_000 });

    // 4-5. Modifier prenom/nom
    await saveIdentity(page, TEMP_FIRST_NAME, TEMP_LAST_NAME);

    // 6. Verifier topbar
    await verifyTopBarName(page, TEMP_FIRST_NAME, TEMP_LAST_NAME);

    // 7-8. Modifier PIN a 111111
    await saveCredentialsWithoutChangingEmail(page, TEMP_PIN);

    // 9. Deconnexion
    await logout(page);

    // 10-11. Reconnexion avec PIN 111111
    await loginWith(page, EMAIL, TEMP_PIN);
    await verifyDashboard(page);

    // 12. Info admin
    await navigateToInfoAdmin(page);

    // 13-14. Restaurer prenom/nom
    await saveIdentity(page, DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME);

    // 15. Verifier topbar
    await verifyTopBarName(page, DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME);

    // 16-17. Restaurer PIN a 000000
    await saveCredentialsWithoutChangingEmail(page, DEFAULT_PIN);

    // 18. Deconnexion
    await logout(page);

    // 19-20. Reconnexion finale avec PIN 000000
    await loginWith(page, EMAIL, DEFAULT_PIN);
    await verifyDashboard(page);

    // 21. Verification finale
    await verifyTopBarName(page, DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME);
  });
});
