import { test, expect } from '@playwright/test';

test.describe('Health check', () => {
  test('la page d\'accueil se charge correctement', async ({ page }) => {
    await page.goto('/');

    // Vérifie que le titre principal est visible
    await expect(page.getByText('Novigo 3D').first()).toBeVisible();

    // Vérifie que le bouton Connexion existe
    await expect(page.getByRole('button', { name: 'Connexion' }).first()).toBeVisible();

    // Vérifie que le contenu principal est chargé
    await expect(page.getByText('Concevez votre maison')).toBeVisible();
  });
});
