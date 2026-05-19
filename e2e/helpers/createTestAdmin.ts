import { type Page, expect } from '@playwright/test';

export interface TestAdminData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  pin: string;
  phone: string;
}

/**
 * Creates a test admin via the Super Admin "Creer un admin" modal.
 * Must be called when already on the "Liste admins" tab.
 * Returns the test data used for verification.
 */
export async function createTestAdmin(page: Page): Promise<TestAdminData> {
  const timestamp = Date.now();
  const data: TestAdminData = {
    firstName: '[TEST] Jean',
    lastName: 'Dupont',
    company: '[TEST] Societe Auto',
    email: `test.admin.auto+${timestamp}@gmail.com`,
    pin: '123456',
    phone: '0606060606',
  };

  // 1. Click "Creer un admin"
  await page.getByTestId('create-admin-button').click();

  // 2. Verify modal opens
  await expect(page.getByTestId('create-admin-modal')).toBeVisible();

  // 3. Fill first name
  await page.getByTestId('create-admin-first-name-input').fill(data.firstName);

  // 4. Fill last name
  await page.getByTestId('create-admin-last-name-input').fill(data.lastName);

  // 5. Fill company
  await page.getByTestId('create-admin-company-input').fill(data.company);

  // 6. Fill email
  await page.getByTestId('create-admin-email-input').fill(data.email);

  // 7. Fill PIN (6 digits, one per input)
  for (let i = 0; i < 6; i++) {
    await page.getByTestId(`create-admin-pin-input-${i}`).fill(data.pin[i]);
  }

  // 8. Fill phone
  await page.getByTestId('create-admin-phone-input').fill(data.phone);

  // 9. Click "Creer"
  await page.getByTestId('create-admin-submit-button').click();

  // 10. Wait for modal to close (creation success)
  await expect(page.getByTestId('create-admin-modal')).not.toBeVisible({ timeout: 15_000 });

  return data;
}
