import { test, expect } from '@playwright/test';
import { connectAdmin, connectSuperAdmin, loginWith } from '../helpers/auth';

const TEST_LEAD = {
  prenom: 'test',
  nom: 'leads',
  email: 'testleads@gmail.com',
  telephone: '0606060606',
  pin: '000000',
};

test.describe('Ajouter lead, connexion client, suppression', () => {
  test('parcours complet : ajout lead, login client, cleanup via SA', async ({ page }) => {
    // ── 1. Connexion Admin ──
    await connectAdmin(page);
    await expect(
      page.getByRole('heading', { name: /Vue d'ensemble CRM/i })
    ).toBeVisible({ timeout: 15_000 });

    // ── 2. Aller dans Ajouter leads ──
    await page.getByText('Ajouter leads').click();
    await expect(
      page.locator('main').getByText('Mot de passe (6 chiffres)')
    ).toBeVisible({ timeout: 10_000 });

    // ── 3. Remplir le formulaire ──
    await page.getByPlaceholder('Jean').fill(TEST_LEAD.prenom);
    await page.getByPlaceholder('Dupont').fill(TEST_LEAD.nom);
    await page.getByPlaceholder('jean.dupont@example.com').fill(TEST_LEAD.email);
    await page.getByPlaceholder('+33 6 00 00 00 00').fill(TEST_LEAD.telephone);

    // Demasquer le mot de passe avant de taper
    await page.getByTitle('Afficher').click();

    // Taper le PIN dans les 6 cases (elles sont maintenant type=text apres demasquage)
    const pinInputs = page.locator('.space-y-2\\.5 input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await pinInputs.nth(i).fill(TEST_LEAD.pin[i]);
    }

    // Soumettre
    await page.getByRole('button', { name: 'Enregistrer le lead' }).click();
    await expect(page.getByText('Lead ajouté au CRM avec succès')).toBeVisible({ timeout: 10_000 });

    // ── 4. Verifier dans le CRM ──
    await page.getByText('CRM').first().click();
    await expect(page.getByText('Gestion de la relation client')).toBeVisible({ timeout: 10_000 });

    // Chercher le lead par email dans le tableau
    await expect(page.getByText(TEST_LEAD.email).first()).toBeVisible({ timeout: 10_000 });

    // ── 5. Deconnexion Admin ──
    await page.getByText('Deconnexion').click();
    await expect(page.getByText('Novigo 3D').first()).toBeVisible({ timeout: 10_000 });

    // ── 6. Connexion Client avec le lead cree ──
    await loginWith(page, TEST_LEAD.email, TEST_LEAD.pin);
    await expect(page.getByText('Bienvenue dans votre espace personnel')).toBeVisible({ timeout: 15_000 });

    // ── 7. Deconnexion Client ──
    await page.getByText('Déconnexion').click();
    await expect(page.getByText('Novigo 3D').first()).toBeVisible({ timeout: 10_000 });

    // ── 8. Connexion Super Admin ──
    await connectSuperAdmin(page);
    await expect(page.getByText('Liste admins')).toBeVisible({ timeout: 15_000 });

    // ── 9. Aller dans Liste admins et connecter sur l'admin ──
    await page.getByText('Liste admins').click();
    await expect(page.getByText('admin').first()).toBeVisible({ timeout: 10_000 });

    // Trouver la ligne de l'admin dmms090191@gmail.com et cliquer Connecter
    const adminRow = page.locator('[data-testid="admin-row"]').filter({
      has: page.getByText('dmms090191@gmail.com'),
    });
    await adminRow.getByRole('button', { name: 'Connecter' }).click();

    // On est maintenant dans le panel Admin de cet admin
    await expect(page.getByText('Mode Super Admin')).toBeVisible({ timeout: 10_000 });

    // ── 10. Supprimer le lead de test dans le CRM ──
    await page.getByText('CRM').first().click();
    await expect(page.getByText('Gestion de la relation client')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(TEST_LEAD.email).first()).toBeVisible({ timeout: 10_000 });

    // Activer le mode selection
    await page.getByRole('button', { name: 'Selectionner' }).click();

    // Cocher le lead correspondant
    const leadRow = page.locator('tr[data-row-id]').filter({
      has: page.getByText(TEST_LEAD.email),
    });
    await leadRow.locator('input[type="checkbox"]').check();

    // Cliquer Supprimer
    await page.getByRole('button', { name: /Supprimer 1/ }).click();

    // ── 11. Verification finale ──
    await expect(page.getByText(TEST_LEAD.email)).not.toBeVisible({ timeout: 10_000 });
  });
});
