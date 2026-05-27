import { test, expect } from '@playwright/test';

test.describe('Inscription publique', () => {
  test('parcours complet inscription client', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test.inscription.auto+${timestamp}@gmail.com`;

    // 1. Ouvrir la page d'accueil
    await page.goto('/');

    // 2. Vérifier que la landing page est chargée
    await expect(page.getByText('Novigo 3D').first()).toBeVisible();
    await expect(page.getByText('Concevez votre maison')).toBeVisible();

    // 3. Cliquer sur le bouton "Connexion" du header
    await page.getByRole('button', { name: 'Connexion' }).first().click();

    // 4. Vérifier que la modale Connexion s'ouvre
    await expect(page.getByText('Accédez à votre espace personnel')).toBeVisible();

    // 5. Cliquer sur "S'inscrire"
    await page.getByText("S'inscrire").click();

    // 6. Vérifier que la modale Inscription s'ouvre
    await expect(page.getByText('Inscription').first()).toBeVisible();
    await expect(page.getByText('Créer un compte')).toBeVisible();

    // 7. Remplir le formulaire
    await page.getByPlaceholder('Prénom').fill('[TEST] Kamel');
    await page.getByPlaceholder('Nom de famille').fill('Argo');

    // RegisterModal est rendu avant LoginModal dans le DOM, donc .first() cible l'inscription
    await page.getByPlaceholder('votre@email.com').first().fill(testEmail);

    // Remplir le mot de passe PIN (6 chiffres, un par case)
    const pinDigits = ['1', '2', '3', '4', '5', '6'];
    const pinInputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await pinInputs.nth(i).fill(pinDigits[i]);
    }

    await page.getByPlaceholder('+33 1 23 45 67 89').fill('0606060606');

    // 8. Cliquer sur "S'INSCRIRE"
    await page.getByRole('button', { name: "S'INSCRIRE", exact: true }).click();

    // 9. Vérifier le message de succès
    await expect(page.getByText('Inscription confirmée')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText('Votre inscription a bien été prise en compte.')
    ).toBeVisible();
    await expect(
      page.getByText('Vous serez recontacté ultérieurement.')
    ).toBeVisible();

    // 10. Cliquer sur "Fermer"
    await page.getByRole('button', { name: 'Fermer' }).click();

    // 11. Vérifier le retour à la page d'accueil
    await expect(page.getByText('Novigo 3D').first()).toBeVisible();
    await expect(page.getByText('Concevez votre maison')).toBeVisible();
  });
});
