import { type Page, expect } from '@playwright/test';
import { TEST_IDS } from './testIds';

/**
 * Navigates to the "Liste admins" tab in the Super Admin panel.
 * Must be called after connectSuperAdmin() has completed successfully.
 */
export async function goToListeAdmins(page: Page) {
  const tab = page.getByText(TEST_IDS.superAdmin.listeAdminsTab);
  await tab.click();
  await expect(tab).toBeVisible();
}
