import { type Page, expect, test } from '@playwright/test';
import { TEST_IDS } from './testIds';

const SUPER_ADMIN_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL || '';
const SUPER_ADMIN_PIN = process.env.E2E_SUPER_ADMIN_PIN || '';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PIN = process.env.E2E_ADMIN_PIN || '';

const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || '';
const CLIENT_PIN = process.env.E2E_CLIENT_PIN || '';

const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || '';
const VENDOR_PIN = process.env.E2E_VENDOR_PIN || '';

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
 * LES IDENTIFIANTS N'ONT PLUS DE REPLI DANS LE DEPOT, ET C'EST LE POINT DE CE FICHIER.
 *
 * Jusqu'au 25/10/2026, les quatre couples adresse + PIN etaient ecrits ici comme valeurs de
 * repli de process.env. Ce sont des comptes REELS — le Super Admin, un Admin, un Client, un
 * Vendeur — et une seule et meme valeur de PIN ouvrait les quatre roles. Le depot GitHub
 * etant PUBLIC, ces mots de passe etaient lisibles par tout le monde depuis le 19 mai 2026.
 *
 * Changer le code ne suffit pas a reparer cela : les anciennes valeurs restent lisibles dans
 * l'historique des commits. Ce fichier referme la porte pour l'avenir ; la REVOCATION (changer
 * le PIN des comptes) est la seule mesure qui ferme celle du passe.
 *
 * La regle appliquee ici existait deja dans ce depot, chez les tests plus recents :
 * e2e/crm-immo.spec.ts lit E2E_IMMO_EMAIL / E2E_IMMO_PIN sans repli et saute le test quand ils
 * manquent, avec ce commentaire — « Le PIN de l'administratrice de la Societe equipee lui
 * appartient. Il n'a rien a faire dans un depot public. » C'est le meme principe, etendu aux
 * quatre roles.
 *
 * Pour lancer ces tests, poser les variables dans l'environnement du shell, jamais dans un
 * fichier suivi par git.
 */
function exigeIdentifiants(email: string, pin: string, variables: string) {
  // On SAUTE, on n'echoue pas : sans les variables, l'absence d'identifiants n'est pas un
  // defaut du produit, et un echec ici ferait chercher un bogue qui n'existe pas.
  test.skip(
    !email || !pin,
    `${variables} absents de l'environnement : les identifiants ne sont pas dans le depot`,
  );
}

/**
 * Connecte le Super Admin au CRM depuis la page d'accueil.
 */
export async function connectSuperAdmin(page: Page) {
  exigeIdentifiants(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PIN, 'E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PIN');
  await loginWith(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PIN);
}

/**
 * Connecte un Admin au CRM depuis la page d'accueil.
 */
export async function connectAdmin(page: Page) {
  exigeIdentifiants(ADMIN_EMAIL, ADMIN_PIN, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PIN');
  await loginWith(page, ADMIN_EMAIL, ADMIN_PIN);
}

/**
 * Connecte un Client au CRM depuis la page d'accueil.
 */
export async function connectClient(page: Page) {
  exigeIdentifiants(CLIENT_EMAIL, CLIENT_PIN, 'E2E_CLIENT_EMAIL / E2E_CLIENT_PIN');
  await loginWith(page, CLIENT_EMAIL, CLIENT_PIN);
}

/**
 * Connecte un Vendeur au CRM depuis la page d'accueil.
 */
export async function connectVendor(page: Page) {
  exigeIdentifiants(VENDOR_EMAIL, VENDOR_PIN, 'E2E_VENDOR_EMAIL / E2E_VENDOR_PIN');
  await loginWith(page, VENDOR_EMAIL, VENDOR_PIN);
}
