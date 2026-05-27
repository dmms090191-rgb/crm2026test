import { test, expect } from '@playwright/test';
import { connectSuperAdmin } from '../helpers/auth';
import { goToListeAdmins } from '../helpers/navigation';
import { createTestAdmin } from '../helpers/createTestAdmin';

test.describe('Creation admin', () => {
  test('Super Admin peut creer un nouvel admin et le voir dans la liste', async ({ page }) => {
    // 1. Se connecter en Super Admin
    await connectSuperAdmin(page);

    // 2. Aller dans l'onglet "Liste admins"
    await goToListeAdmins(page);

    // 3. Attendre que la liste soit visible
    await expect(page.getByTestId('admins-list')).toBeVisible({ timeout: 10_000 });

    // 4. Creer un admin de test
    const testData = await createTestAdmin(page);

    // 5. Verifier que le nouvel admin apparait dans la liste
    const adminsList = page.getByTestId('admins-list');
    await expect(adminsList.getByText(testData.firstName)).toBeVisible({ timeout: 10_000 });
    await expect(adminsList.getByText(testData.lastName)).toBeVisible();
    await expect(adminsList.getByText(testData.email)).toBeVisible();
    await expect(adminsList.getByText(testData.company)).toBeVisible();
  });
});
