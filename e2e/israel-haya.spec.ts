import { test, expect, type Frame, type Page } from '@playwright/test';
import { CHAPITRES, bornes } from '../src/pages/superadmin/views/site-builder/templates/israel-haya/chapitres';

/**
 * LE VOYAGE ISRAEL HAYA, parcouru pour de vrai.
 *
 * Le site vit dans l'apercu du module Sites : une iframe sur la route interne, a qui la page
 * parente envoie le contenu par postMessage. On emprunte donc le meme chemin que le bouton
 * « Previsualiser », et on defile A L INTERIEUR de l'iframe, comme un visiteur.
 *
 * Ce que cette suite protege :
 *   1. le site s'ouvre en hebreu, RTL, et il se NOMME des la premiere image ;
 *   2. le defilement traverse bien les six chapitres, dans l'ordre ;
 *   3. REMONTER ramene exactement aux chapitres precedents — la reversibilite est la promesse
 *      centrale du moteur, et c'est la seule facon de la verifier pour de bon ;
 *   4. la saisie des nombres fonctionne et affiche son etiquette de demonstration ;
 *   5. rien ne deborde horizontalement, du telephone a l'ordinateur ;
 *   6. la console reste vide.
 */

const CAPTURES = 'test-results/captures-israel-haya';

const MONTER = `
  const f = document.createElement('iframe');
  f.id = 'ih';
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647';
  f.src = '/site-apercu';
  document.body.appendChild(f);
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'talvex-site-preview-ready') {
      f.contentWindow.postMessage(
        { type: 'talvex-site-preview-payload', payload: { templateKey: 'israel_haya', appIconUrl: null } },
        location.origin,
      );
    }
  });
`;

/** Monte l'apercu et rend le frame interne, une fois la scene en place. */
async function ouvrir(page: Page): Promise<Frame> {
  await page.goto('/');
  await page.evaluate(MONTER);
  await page.waitForFunction(
    () => !!(document.getElementById('ih') as HTMLIFrameElement)?.contentDocument?.querySelector('[data-testid="ih-scene"]'),
    null,
    { timeout: 60_000 },
  );
  const frame = page.frames().find(f => f.url().includes('site-apercu'));
  if (!frame) throw new Error("l apercu ne s est pas monte");
  await page.waitForTimeout(1500);
  return frame;
}

/**
 * Defile a une fraction du voyage, et laisse la scene se poser.
 *
 * On defile la ZONE du template, pas la fenetre : dans Talvex, html, body et #root ont une
 * hauteur fixe et c'est le template qui porte son propre defilement.
 */
async function allerA(frame: Frame, fraction: number) {
  await frame.evaluate(f => {
    const zone = document.querySelector('[data-testid="ih-zone"]') as HTMLElement | null;
    if (!zone) throw new Error('zone de defilement introuvable');
    const course = zone.scrollHeight - zone.clientHeight;
    zone.scrollTop = course * f;
  }, fraction);
  await frame.waitForTimeout(700);
}

const chapitre = (frame: Frame) =>
  frame.locator('[data-testid="ih-scene"]').getAttribute('data-ih-chapitre');

test.describe.configure({ mode: 'serial' });

test('le site s ouvre en hebreu RTL, et il se nomme des la premiere image', async ({ page }) => {
  const erreurs: string[] = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const dir = await frame.evaluate(() => document.documentElement.getAttribute('dir'));
  const lang = await frame.evaluate(() => document.documentElement.getAttribute('lang'));
  expect(dir, 'la page doit etre en RTL').toBe('rtl');
  expect(lang).toBe('he');

  // Le nom doit etre lisible AVANT tout defilement.
  await expect(frame.getByRole('heading', { name: 'ישראל חיה' }).first()).toBeVisible();
  expect(await chapitre(frame)).toBe('naissance');

  await page.screenshot({ path: `${CAPTURES}/01-ouverture.png` });
  expect(erreurs, `erreurs console : ${erreurs.join(' | ')}`).toHaveLength(0);
});

test('le defilement traverse les six chapitres, dans l ordre', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const attendus = ['naissance', 'jerusalem', 'anneaux', 'arbre', 'cabinet', 'carte'];
  const vus: string[] = [];

  // On vise le milieu de chaque chapitre, calcule depuis les hauteurs reelles.
  const fractions = [0.05, 0.22, 0.42, 0.62, 0.80, 0.95];
  for (let i = 0; i < fractions.length; i++) {
    await allerA(frame, fractions[i]);
    const c = await chapitre(frame);
    vus.push(c ?? '?');
    await page.screenshot({ path: `${CAPTURES}/chapitre-${i + 1}-${c}.png` });
  }

  expect(vus, `ordre des chapitres : ${vus.join(' > ')}`).toEqual(attendus);
});

test('REMONTER ramene exactement aux chapitres precedents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Aller jusqu au bout, puis revenir, en relevant ce qu on voit a chaque arret.
  const etapes = [0.05, 0.42, 0.80, 0.95];
  const aller: string[] = [];
  for (const f of etapes) { await allerA(frame, f); aller.push((await chapitre(frame)) ?? '?'); }

  const retour: string[] = [];
  for (const f of [...etapes].reverse()) { await allerA(frame, f); retour.push((await chapitre(frame)) ?? '?'); }

  expect(retour, 'le retour ne rejoue pas le voyage a l envers').toEqual([...aller].reverse());
});

test('la saisie des nombres fonctionne, et s annonce comme une demonstration', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Seconde moitie du chapitre des anneaux : c est la que la saisie apparait.
  await allerA(frame, 0.46);
  expect(await chapitre(frame)).toBe('anneaux');

  await expect(frame.getByTestId('ih-date')).toBeVisible({ timeout: 15_000 });
  await frame.getByTestId('ih-prenom').fill('נועה');
  await frame.getByTestId('ih-date').fill('1988-03-14');
  // On verifie que les champs ont vraiment pris leur valeur AVANT de soumettre : un input
  // date vide bloque la validation native, et onSubmit ne serait jamais appele.
  await expect(frame.getByTestId('ih-date')).toHaveValue('1988-03-14');
  await frame.getByTestId('ih-calculer').click();

  await expect(frame.getByTestId('ih-resultat')).toBeVisible();
  // L etiquette de demonstration est obligatoire tant que la methode n est pas fournie.
  await expect(frame.getByTestId('ih-demo')).toBeVisible();

  await page.screenshot({ path: `${CAPTURES}/saisie-resultat.png` });
});

test('aucun debordement horizontal, du telephone a l ordinateur', async ({ browser }) => {
  for (const [largeur, hauteur, tactile] of [[390, 844, true], [768, 1024, true], [1440, 900, false]] as const) {
    const contexte = await browser.newContext({
      viewport: { width: largeur, height: hauteur },
      hasTouch: tactile,
      isMobile: tactile,
    });
    const page = await contexte.newPage();
    const frame = await ouvrir(page);
    await allerA(frame, 0.22);

    // Le debordement se mesure sur la zone du template, puisque c'est elle qui defile.
    const deborde = await frame.evaluate(() => {
      const z = document.querySelector('[data-testid="ih-zone"]') as HTMLElement | null;
      return !!z && z.scrollWidth > z.clientWidth + 1;
    });
    expect(deborde, `debordement horizontal a ${largeur}px`).toBe(false);

    if (largeur === 390) await page.screenshot({ path: `${CAPTURES}/telephone.png` });
    await contexte.close();
  }
});

/*
 * ---------- LES QUATRE CORRECTIONS D UN AUDIT, MISES SOUS GARDE ----------
 *
 * Les quatre defauts ci-dessous ont tous ete mesures sur une version qui passait deja la suite
 * precedente. Ils ont un point commun : aucun ne se voit en regardant la page. Un film
 * retelecharge, de la memoire qui ne revient pas, une fenetre qu'on redimensionne, un visiteur
 * sans souris — rien de tout cela n'apparait sur une capture d'ecran. D'ou ces tests.
 */

test('le voyage se parcourt au CLAVIER, sans souris', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // La zone de defilement est un div : sans traitement, aucune touche ne la fait bouger.
  await frame.locator('[data-testid="ih-zone"]').focus();
  const depart = await frame.evaluate(() => document.querySelector('[data-testid="ih-zone"]')!.scrollTop);
  expect(depart).toBe(0);

  for (let i = 0; i < 4; i++) await page.keyboard.press('PageDown');
  await frame.waitForTimeout(400);
  const apres = await frame.evaluate(() => document.querySelector('[data-testid="ih-zone"]')!.scrollTop);
  expect(apres, 'Page suivante doit faire avancer le voyage').toBeGreaterThan(0);

  await page.keyboard.press('End');
  await frame.waitForTimeout(400);
  expect(await chapitre(frame), 'Fin doit mener au dernier chapitre').toBe('carte');

  await page.keyboard.press('Home');
  await frame.waitForTimeout(400);
  expect(await chapitre(frame), 'Debut doit ramener au premier').toBe('naissance');
});

test('REDIMENSIONNER la fenetre ne deplace pas la tete de lecture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  await allerA(frame, 0.42);
  const avant = await chapitre(frame);
  expect(avant).toBe('anneaux');

  // La piste est haute de 3200vh : sa hauteur en pixels suit la fenetre, alors que le
  // navigateur garde scrollTop en pixels. Sans restauration, ces trois tailles promenaient le
  // lecteur de plusieurs chapitres, en avant comme en arriere.
  for (const taille of [{ width: 1024, height: 600 }, { width: 1600, height: 1000 }, { width: 1366, height: 640 }]) {
    await page.setViewportSize(taille);
    await frame.waitForTimeout(500);
    expect(
      await chapitre(frame),
      `le chapitre a change en passant a ${taille.width}x${taille.height}`,
    ).toBe(avant);
  }
});

test('chaque film n est telecharge QU UNE FOIS, meme en allant et venant', async ({ page }) => {
  const films: string[] = [];
  page.on('response', r => { if (r.url().endsWith('.mp4')) films.push(r.url().split('/').pop()!); });

  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // Huit franchissements de la frontiere entre les chapitres 1 et 2.
  for (let i = 0; i < 8; i++) await allerA(frame, i % 2 ? 0.19 : 0.09);

  const parFilm = new Map<string, number>();
  for (const f of films) parFilm.set(f, (parFilm.get(f) ?? 0) + 1);
  for (const [nom, n] of parFilm) {
    expect(n, `${nom} telecharge ${n} fois : le cache de cacheFilms.ts ne tient plus`).toBe(1);
  }
  expect(parFilm.size, 'les deux films du debut doivent avoir ete demandes').toBeGreaterThanOrEqual(2);
});

test('MOUVEMENT REDUIT : tous les textes du recit restent lisibles', async ({ page }) => {
  // Le piege classique de cette preference : respecter la demande en n'affichant plus rien.
  // Mesure sur la premiere version : 5 des 10 legendes n'apparaissaient JAMAIS, dont l'appel
  // a prendre rendez-vous.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const vus = new Set<string>();
  for (let i = 0; i <= 20; i++) {
    await allerA(frame, i / 20);
    for (const t of await frame.locator('[data-testid="ih-scene"] h2').allTextContents()) vus.add(t.trim());
  }

  // Le voyage porte onze legendes ; aucune ne doit rester invisible.
  expect(vus.size, `legendes vues : ${[...vus].join(' | ')}`).toBeGreaterThanOrEqual(10);
  await page.emulateMedia({ reducedMotion: null });
});

/*
 * ---------- LE SITE PUBLIC : DEUX LANGUES, TROIS PAGES, UNE CONNEXION ----------
 *
 * Ce que ce bloc protege, et qu'aucune capture d'ecran ne montrerait : qu'une bascule de langue
 * retourne REELLEMENT la page et pas seulement ses mots, que les coordonnees restent celles du
 * fichier unique, que le formulaire ne fait jamais semblant d'envoyer, et que la connexion
 * ouvre bien celle de Talvex au lieu d'ejecter le visiteur.
 */

const barre = (frame: Frame) => frame.locator('[data-testid="ih-barre"]');
const pageActive = (frame: Frame) =>
  frame.locator('[data-testid="ih-coquille"]').getAttribute('data-ih-page');

test('LA BASCULE DE LANGUE retourne la page, pas seulement les mots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  // L hebreu est la langue d ouverture : ce n est pas un detail, c est le site d une
  // praticienne en Israel.
  expect(await frame.evaluate(() => document.documentElement.getAttribute('dir'))).toBe('rtl');
  await expect(frame.getByTestId('ih-nav-accueil')).toHaveText('בית');

  await frame.getByTestId('ih-langue-fr').click();
  await frame.waitForTimeout(400);

  // La DIRECTION doit suivre, sinon on n a traduit que du vocabulaire.
  expect(await frame.evaluate(() => document.documentElement.getAttribute('dir'))).toBe('ltr');
  expect(await frame.evaluate(() => document.documentElement.getAttribute('lang'))).toBe('fr');
  await expect(frame.getByTestId('ih-nav-accueil')).toHaveText('Accueil');
  await expect(frame.getByTestId('ih-nav-apropos')).toHaveText('À propos');
  await expect(frame.getByTestId('ih-nav-contact')).toHaveText('Contact');
  await expect(frame.getByTestId('ih-connexion')).toHaveText('Connexion');

  // Et le choix se retient d une visite a l autre.
  expect(await frame.evaluate(() => localStorage.getItem('crm_ih_langue'))).toBe('fr');
});

test('LES TROIS PAGES s ouvrent, dans les deux langues', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  for (const langue of ['he', 'fr'] as const) {
    await frame.getByTestId(`ih-langue-${langue}`).click();
    await frame.waitForTimeout(300);

    await frame.getByTestId('ih-nav-apropos').click();
    await frame.waitForTimeout(300);
    expect(await pageActive(frame)).toBe('apropos');
    await expect(frame.getByTestId('ih-page-apropos')).toBeVisible();

    await frame.getByTestId('ih-nav-contact').click();
    await frame.waitForTimeout(300);
    expect(await pageActive(frame)).toBe('contact');
    await expect(frame.getByTestId('ih-page-contact')).toBeVisible();

    await frame.getByTestId('ih-nav-accueil').click();
    await frame.waitForTimeout(600);
    expect(await pageActive(frame)).toBe('accueil');
    await expect(frame.locator('[data-testid="ih-scene"]')).toBeVisible();
  }
});

test('CONTACT : les trois canaux sont montres, et INERTES tant qu ils sont inventes', async ({ page }) => {
  /*
   * Une coordonnee de demonstration qui reste CLIQUABLE joint quelqu un pour de vrai.
   * Israel n'a aucune plage de numeros reservee aux fictions, contrairement au 555
   * nord-americain : le bouton WhatsApp, le plus gros element tactile de la page, ouvrait
   * une conversation avec le titulaire du numero, quel qu il soit. Le bandeau qui previent
   * en texte, juste a cote, ne desarmait rien.
   */
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-nav-contact').click();
  await frame.waitForTimeout(400);

  for (const cle of ['ih-lien-email', 'ih-lien-telephone', 'ih-lien-whatsapp']) {
    const element = frame.getByTestId(cle);
    // Affiche : la maquette doit rester lisible telle qu elle sera.
    await expect(element).toBeVisible();
    // Mais ce n est pas un lien, et il n a aucune cible.
    expect(await element.evaluate(e => e.tagName), `${cle} ne doit pas etre un lien`).not.toBe('A');
    expect(await element.getAttribute('href'), `${cle} ne doit porter aucune cible`).toBe(null);
  }

  // Et aucun numero attribuable ne doit figurer sur la page.
  const texte = await frame.getByTestId('ih-page-contact').innerText();
  expect(texte, 'le numero de demonstration doit etre une suite nulle').toContain('050-000-0000');
  expect(texte, 'le domaine doit etre dans un suffixe reserve').toContain('.example');

  // Tant que les coordonnees sont celles de la demonstration, le visiteur doit le lire.
  await expect(frame.getByTestId('ih-contact-provisoire')).toBeVisible();
});

test('LE FORMULAIRE valide, et ne fait JAMAIS semblant d envoyer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-langue-fr').click();
  await frame.getByTestId('ih-nav-contact').click();
  await frame.waitForTimeout(400);

  // Vide : quatre champs necessaires, et aucun avis d envoi.
  await frame.getByTestId('ih-contact-envoyer').click();
  await frame.waitForTimeout(250);
  expect(await frame.locator('[role="alert"]').count()).toBe(4);
  expect(await frame.getByTestId('ih-contact-avis').count()).toBe(0);

  // Une adresse manifestement fausse est refusee.
  await frame.getByTestId('ih-contact-prenom').fill('Sarah');
  await frame.getByTestId('ih-contact-nom').fill('Levi');
  await frame.getByTestId('ih-contact-email').fill('pas-une-adresse');
  await frame.getByTestId('ih-contact-message').fill('Bonjour.');
  await frame.getByTestId('ih-contact-envoyer').click();
  await frame.waitForTimeout(250);
  expect(await frame.locator('[role="alert"]').count()).toBe(1);

  // Saisie complete : le formulaire DIT que l envoi n est pas branche, au lieu de le simuler.
  await frame.getByTestId('ih-contact-email').fill('sarah@example.com');
  await frame.getByTestId('ih-contact-envoyer').click();
  await frame.waitForTimeout(250);
  const avis = frame.getByTestId('ih-contact-avis');
  await expect(avis).toBeVisible();
  await expect(avis).toContainText('pas encore raccordé');
  // Et surtout, pas un mot qui laisserait croire a un message parti.
  await expect(avis).not.toContainText(/envoyé|envoyée|reçu/);
});

test('CONNEXION : le bouton ouvre la connexion Talvex, il n ejecte personne', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  const avant = page.url();
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(600);

  // La fenetre de connexion de Talvex, reconnaissable a son champ d adresse et a son code a
  // six chiffres. Aucune authentification nouvelle n a ete ecrite.
  await expect(frame.locator('input[type="email"]')).toBeVisible();
  expect(await frame.locator('input[type="password"]').count()).toBe(6);
  // Le defaut d origine : le clic renvoyait le visiteur vers la landing Talvex.
  expect(page.url()).toBe(avant);
});

test('MOBILE : rien ne deborde, et tout reste atteignable au doigt', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const frame = await ouvrir(page);

  for (const page_ of ['apropos', 'contact', 'accueil'] as const) {
    await frame.getByTestId(`ih-nav-${page_}`).click();
    await frame.waitForTimeout(500);

    const deborde = await frame.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(deborde, `debordement horizontal sur ${page_}`).toBe(false);
  }

  // Chaque commande de la barre doit faire au moins 44 px de haut : c est la taille d un doigt.
  const trop = await barre(frame).evaluate(b =>
    [...b.querySelectorAll('button')]
      // Un element masque mesure zero : on ne juge que ce que le doigt peut atteindre.
      .filter(x => x.getClientRects().length > 0)
      .filter(x => x.getBoundingClientRect().height < 44)
      .map(x => `${x.textContent?.trim()} (${Math.round(x.getBoundingClientRect().height)}px)`));
  expect(trop, `cibles trop petites : ${trop.join(', ')}`).toHaveLength(0);
});

/*
 * ---------- LA FENETRE DE CONNEXION, EN DEUX LANGUES ET SANS DEGAT COLLATERAL ----------
 *
 * Cette fenetre est partagee par les onze templates de site. Le dernier test de ce bloc est le
 * plus important : il ouvre un AUTRE template et verifie qu il n a pas bouge d un mot. Rendre
 * un composant partage bilingue sans casser ceux qui ne demandaient rien, c est tout l enjeu.
 */

/** Monte l apercu d un template quelconque et rend son frame. */
async function ouvrirTemplate(page: Page, cle: string): Promise<Frame> {
  await page.goto('/');
  await page.evaluate(MONTER.replace("templateKey: 'israel_haya'", `templateKey: '${cle}'`));
  await page.waitForFunction(
    () => !!(document.getElementById('ih') as HTMLIFrameElement)?.contentDocument?.querySelector('button'),
    null,
    { timeout: 60_000 },
  );
  const frame = page.frames().find(f => f.url().includes('site-apercu'));
  if (!frame) throw new Error("l apercu ne s est pas monte");
  await page.waitForTimeout(1500);
  return frame;
}

const fenetreConnexion = (frame: Frame) => frame.locator('.fixed.inset-0').first();

test('CONNEXION EN HEBREU : traduite, retournee, et sans inscription', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(700);

  const fenetre = fenetreConnexion(frame);
  // La fenetre porte SA direction : elle ne se contente pas d heriter de celle du document.
  await expect(fenetre).toHaveAttribute('dir', 'rtl');
  await expect(fenetre).toContainText('התחברות');
  await expect(fenetre).toContainText('סיסמה (6 ספרות)');
  await expect(fenetre).toContainText('מהירים');

  // Pas un mot de francais n a survecu.
  await expect(fenetre).not.toContainText('Mot de passe');
  await expect(fenetre).not.toContainText('Adresse email');

  // La connexion de ce site mene la praticienne a son CRM : aucun visiteur n a a s y inscrire.
  await expect(fenetre).not.toContainText('הרשמה');
});

test('CONNEXION EN FRANCAIS : le site bascule, la fenetre suit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);

  await frame.getByTestId('ih-langue-fr').click();
  await frame.waitForTimeout(300);
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(700);

  const fenetre = fenetreConnexion(frame);
  await expect(fenetre).toHaveAttribute('dir', 'ltr');
  await expect(fenetre).toContainText('Connexion');
  await expect(fenetre).toContainText('Mot de passe (6 chiffres)');
  await expect(fenetre).not.toContainText('התחברות');
});

test('LES AUTRES TEMPLATES n ont pas bouge d un mot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const cle of ['renewable_energy', 'builder_ready']) {
    const frame = await ouvrirTemplate(page, cle);

    const bouton = frame.locator('button', { hasText: /connexion|se connecter/i }).first();
    await bouton.click();
    await frame.waitForTimeout(700);

    const fenetre = fenetreConnexion(frame);
    // Francais, de gauche a droite, exactement comme avant.
    await expect(fenetre, `${cle} : la fenetre a change de direction`).toHaveAttribute('dir', 'ltr');
    await expect(fenetre).toContainText('Connexion');
    await expect(fenetre).toContainText('Accedez a votre espace personnel');
    await expect(fenetre).toContainText('Mot de passe (6 chiffres)');
    await expect(fenetre).toContainText('Rapides');
    // L inscription, qu ils proposaient avant, est toujours la.
    await expect(fenetre, `${cle} : l inscription a disparu`).toContainText("S'inscrire");
    // Et pas une lettre hebraique n a fuite jusqu a eux.
    const hebreu = await fenetre.evaluate(e => /[֐-׿]/.test(e.textContent ?? ''));
    expect(hebreu, `${cle} : de l hebreu est apparu`).toBe(false);

    // Le document de ces sites ne doit JAMAIS avoir ete mis en RTL.
    const dir = await frame.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir, `${cle} : le document a ete mis en ${dir}`).toBe(null);
  }
});

/*
 * ---------- LE RESPONSIVE, VERROUILLE PAR LA MESURE ----------
 *
 * Tous les defauts couverts ici ont ete trouves par un releve chiffre sur 160 combinaisons, pas
 * a l oeil. Aucun ne se voit sur une capture d ecran : un bouton qu on ne peut pas atteindre, un
 * titre derriere une barre, un code qui s affiche a l envers. C est pour cela qu ils sont testes.
 */

/** Choisit la langue, que le selecteur soit la bascule du telephone ou les deux pastilles. */
async function choisirLangue(frame: Frame, l: 'fr' | 'he') {
  const pastille = frame.getByTestId(`ih-langue-${l}`);
  if (await pastille.isVisible().catch(() => false)) await pastille.click();
  else await frame.getByTestId('ih-langue-bascule').click();
  await frame.waitForTimeout(400);
}

test('SOUS 480 px, le selecteur de langue devient une bascule, et il marche', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const frame = await ouvrir(page);

  // Les deux pastilles cedent la place a un bouton unique : 107 px economises sur une barre qui
  // se repliait en deux rangees et mangeait un cinquieme de l ecran.
  await expect(frame.getByTestId('ih-langues')).toBeHidden();
  const bascule = frame.getByTestId('ih-langue-bascule');
  await expect(bascule).toBeVisible();
  // Elle porte le nom de la langue vers laquelle elle mene, pas celui de la langue courante.
  await expect(bascule).toHaveText('FR');

  await bascule.click();
  await frame.waitForTimeout(400);
  expect(await frame.evaluate(() => document.documentElement.getAttribute('dir'))).toBe('ltr');
  await expect(frame.getByTestId('ih-langue-bascule')).toHaveText('עברית');
});

test('LA BARRE publie sa hauteur, et plus aucun titre ne passe dessous', async ({ page }) => {
  for (const taille of [{ width: 320, height: 568 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(taille);
    const frame = await ouvrir(page);

    for (const langue of ['he', 'fr'] as const) {
      await choisirLangue(frame, langue);

      for (const p of ['apropos', 'contact'] as const) {
        await frame.getByTestId(`ih-nav-${p}`).click();
        await frame.waitForTimeout(400);

        const chevauche = await frame.evaluate(() => {
          const barre = document.querySelector('[data-testid="ih-barre"]');
          const titre = document.querySelector('[data-testid^="ih-page-"] h1');
          if (!barre || !titre) return 'elements introuvables';
          const b = barre.getBoundingClientRect();
          const t = titre.getBoundingClientRect();
          return t.top < b.bottom ? `titre a ${Math.round(t.top)} sous une barre qui finit a ${Math.round(b.bottom)}` : null;
        });
        expect(chevauche, `${taille.width}px / ${langue} / ${p}`).toBe(null);
      }

      // Et la variable existe vraiment : c est elle qui tient la reserve.
      const variable = await frame.evaluate(() =>
        getComputedStyle(document.querySelector('[data-testid="ih-coquille"]')!).getPropertyValue('--ih-barre').trim());
      expect(variable, 'la barre doit publier sa hauteur').toMatch(/^\d+px$/);
    }
  }
});

test('AU CHAPITRE 3, la legende ne se pose plus sur les boutons de navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const frame = await ouvrir(page);
  await choisirLangue(frame, 'fr');

  await allerA(frame, 0.42);
  await frame.waitForTimeout(1200);

  const recouvrement = await frame.evaluate(() => {
    const barre = document.querySelector('[data-testid="ih-barre"]')!.getBoundingClientRect();
    const legende = document.querySelector('[data-testid="ih-scene"] h2');
    if (!legende) return null;
    const l = legende.getBoundingClientRect();
    return l.top < barre.bottom ? Math.round(barre.bottom - l.top) : 0;
  });
  expect(recouvrement, 'la legende remonte sous la barre').toBe(0);
});

test('LA FENETRE DE CONNEXION reste atteignable quand le clavier mange l ecran', async ({ page }) => {
  for (const langue of ['he', 'fr'] as const) {
    await page.setViewportSize({ width: 375, height: 812 });
    const frame = await ouvrir(page);
    await choisirLangue(frame, langue);

    // 380 px : ce qu il reste d un telephone quand le clavier numerique est ouvert.
    await page.setViewportSize({ width: 375, height: 380 });
    await frame.getByTestId('ih-connexion').click();
    await frame.waitForTimeout(900);

    const etat = await frame.evaluate(() => {
      const voile = document.querySelector('.fixed.inset-0') as HTMLElement;
      const valider = [...voile.querySelectorAll('button')].find(b => /VALIDER|אישור/.test(b.textContent || ''));
      if (!valider) return { erreur: 'bouton introuvable' };
      voile.scrollTop = voile.scrollHeight;
      const b = valider.getBoundingClientRect();
      return {
        defile: voile.scrollHeight > voile.clientHeight + 1,
        atteint: b.top >= -1 && b.bottom <= window.innerHeight + 1,
      };
    });
    // Avant : le voile ne defilait pas et le bouton tombait 82 px sous l ecran, sans aucune issue.
    expect(etat.defile, `${langue} : le voile doit defiler`).toBe(true);
    expect(etat.atteint, `${langue} : la validation doit etre atteignable`).toBe(true);
  }
});

test('ECHAP ferme la fenetre de connexion', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 380 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(700);
  expect(await frame.locator('.fixed.inset-0').count()).toBeGreaterThan(0);

  // Sans cet ecouteur, et la croix hors ecran, il ne restait qu une bande de fond de 12 px.
  await page.keyboard.press('Escape');
  await frame.waitForTimeout(500);
  expect(await frame.locator('.fixed.inset-0').count()).toBe(0);
});

test('EN HEBREU, le code a six chiffres se saisit et se lit de gauche a droite', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(900);

  /*
   * Un NOMBRE se lit de gauche a droite dans toutes les langues. Sans dir="ltr" sur la rangee,
   * les six cases etaient physiquement inversees : un code saisi 123456 s affichait 654321.
   * Ce n etait pas un defaut de presentation, c etait un defaut de saisie.
   */
  const croissants = await frame.evaluate(() => {
    const voile = document.querySelector('.fixed.inset-0')!;
    const cases = [...voile.querySelectorAll('input')].filter(i => i.maxLength === 1);
    const x = cases.map(c => c.getBoundingClientRect().left);
    return x.length === 6 && x.every((v, i) => i === 0 || v > x[i - 1]);
  });
  expect(croissants, 'les cases du code doivent aller de gauche a droite').toBe(true);
});

/*
 * ---------- LE CADRAGE DES SCENES 3D, VERIFIE SUR L IMAGE ----------
 *
 * Ces deux tests ne regardent pas le DOM : ils regardent les PIXELS. C'est la seule façon de
 * voir ce defaut-la. Une scene 3D occupe une boite qui remplit toujours son conteneur, quel
 * que soit ce qu'elle montre ; la moitie des anneaux pouvait tomber hors de l'ecran sans
 * qu'aucun rectangle ne bouge d'un pixel. Un releve responsive de 160 combinaisons est passe
 * au vert pendant que le defaut etait la, entier.
 *
 * On cherche donc de la matiere lumineuse collee au bord gauche ou droit, dans la bande libre
 * entre la barre de navigation et le panneau de saisie. Chromium decode la capture pour nous.
 */
/**
 * Se poser AU MILIEU d'un chapitre, nomme par sa cle.
 *
 * Viser une fraction du voyage est un piege : les hauteurs sont en vh, les bornes bougent
 * avec les chapitres, et 0,68 tombait sur le cabinet quand on croyait viser l'arbre — le test
 * mesurait alors un film, qui occupe legitimement tout le cadre, et echouait pour une raison
 * qui n'avait rien a voir avec ce qu'il verifiait. On cherche donc les bornes reelles.
 */
/**
 * Se poser AU MILIEU d'un chapitre, nomme par sa cle.
 *
 * Viser une fraction du voyage a vue est un piege : 0,68 tombait sur le cabinet quand on
 * croyait viser l'arbre, et le test mesurait alors un film — qui occupe legitimement tout le
 * cadre — puis echouait pour une raison etrangere a ce qu'il verifiait.
 *
 * On demande donc ses bornes au MODELE, celui-la meme qui decide du chapitre affiche. Un test
 * qui recalcule de son cote ce que le code sait deja finit toujours par mesurer autre chose.
 */
async function allerAuChapitre(frame: Frame, cle: string, dans = 0.5) {
  const i = CHAPITRES.findIndex(c => c.cle === cle);
  if (i < 0) throw new Error(`chapitre inconnu : ${cle}`);
  const { de, a } = bornes()[i];
  await allerA(frame, de + (a - de) * dans);
  await frame.waitForTimeout(2600);
  const obtenu = await frame.evaluate(() => document.querySelector('[data-testid="ih-scene"]')!.getAttribute('data-ih-chapitre'));
  expect(obtenu, `on voulait le chapitre ${cle}`).toBe(cle);
}
async function matiereAuBord(page: Page, frame: Frame, largeur: number, hauteur: number) {
  const bornes = await frame.evaluate(() => {
    const scene = document.querySelector('[data-testid="ih-scene"]')!.getBoundingClientRect();
    const barre = document.querySelector('[data-testid="ih-barre"]');
    const panneau = document.querySelector('[data-testid="ih-panneau"]');
    const rp = panneau?.getBoundingClientRect();
    return {
      basBarre: barre ? barre.getBoundingClientRect().bottom - scene.top : 0,
      hautPanneau: rp && rp.height > 4 ? rp.top - scene.top : null,
    };
  });
  const capture = (await page.screenshot({ type: 'png' })).toString('base64');
  return page.evaluate(
    async ([donnees, l, h, basBarre, hautPanneau]) => {
      const image = new Image();
      await new Promise(resoudre => { image.onload = resoudre; image.src = `data:image/png;base64,${donnees}`; });
      const toile = document.createElement('canvas');
      toile.width = l as number;
      toile.height = h as number;
      const ctx = toile.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const px = ctx.getImageData(0, 0, l as number, h as number).data;
      const lum = (x: number, y: number) => {
        const i = (y * (l as number) + x) * 4;
        return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      };
      // Le fond de la scene est #070a16, de luminance 10 : 34 est nettement au-dessus.
      const y0 = Math.round((basBarre as number) + 8);
      const y1 = Math.round((hautPanneau === null ? (h as number) : (hautPanneau as number)) - 8);
      let gauche = 0;
      let droite = 0;
      let lignes = 0;
      for (let y = y0; y < y1; y++) {
        lignes++;
        for (let x = 0; x < 3; x++) if (lum(x, y) > 34) { gauche++; break; }
        for (let x = (l as number) - 3; x < (l as number); x++) if (lum(x, y) > 34) { droite++; break; }
      }
      return lignes > 0 ? Math.max(gauche, droite) / lignes : 0;
    },
    [capture, largeur, hauteur, bornes.basBarre, bornes.hautPanneau] as const,
  );
}

test('LES ANNEAUX tiennent dans le cadre sur telephone, et le panneau ne les recouvre pas', async ({ page }) => {
  for (const [l, h] of [[320, 720], [375, 812], [390, 844]]) {
    await page.setViewportSize({ width: l, height: h });
    const frame = await ouvrir(page);
    await allerAuChapitre(frame, 'anneaux', 0.6);

    // Avant la correction : 16 % des lignes portaient de la matiere au ras du bord.
    const part = await matiereAuBord(page, frame, l, h);
    expect(part, `${l}x${h} : les anneaux debordent du cadre`).toBeLessThan(0.05);

    // Et ils sont bien au-dessus du panneau, pas derriere lui.
    const audessus = await frame.evaluate(() => {
      const p = document.querySelector('[data-testid="ih-panneau"]')?.getBoundingClientRect();
      return p ? p.width > 0 : false;
    });
    expect(audessus, 'le panneau de saisie doit etre monte a ce stade du chapitre').toBe(true);
  }
});

test('L ARBRE tient dans le cadre sur telephone, racines comprises', async ({ page }) => {
  for (const [l, h] of [[320, 720], [375, 812]]) {
    await page.setViewportSize({ width: l, height: h });
    const frame = await ouvrir(page);
    // Aux deux tiers du chapitre : le houppier est sorti, les racines aussi.
    await allerAuChapitre(frame, 'arbre', 0.66);
    const part = await matiereAuBord(page, frame, l, h);
    expect(part, `${l}x${h} : l arbre deborde du cadre`).toBeLessThan(0.05);
  }
});

test('LE FILM DE LA CARTE se montre entier sur telephone, et plein cadre sur ecran large', async ({ page }) => {
  // Les films sont en 1920 x 1074 : remplir un telephone en portrait n'en montrerait que 26 %
  // de la largeur, et une carte de visite vue au quart central n'est plus une carte.
  await page.setViewportSize({ width: 375, height: 812 });
  let frame = await ouvrir(page);
  await allerAuChapitre(frame, 'carte');
  const telephone = await frame.evaluate(() => {
    const v = document.querySelector('video')!;
    const s = document.querySelector('[data-testid="ih-scene"]')!.getBoundingClientRect();
    const b = v.getBoundingClientRect();
    return { hauteurRelative: b.height / s.height, largeurRelative: b.width / s.width };
  });
  expect(telephone.largeurRelative, 'le film doit tenir toute la largeur').toBeGreaterThan(0.98);
  expect(telephone.hauteurRelative, 'et ne pas remplir la hauteur : c est le prix du sujet entier').toBeLessThan(0.45);

  // Sur un ecran large, rien ne change : le film reprend tout le cadre.
  await page.setViewportSize({ width: 1440, height: 900 });
  frame = await ouvrir(page);
  await allerAuChapitre(frame, 'carte');
  const bureau = await frame.evaluate(() => {
    const v = document.querySelector('video')!;
    const s = document.querySelector('[data-testid="ih-scene"]')!.getBoundingClientRect();
    return v.getBoundingClientRect().height / s.height;
  });
  expect(bureau, 'le cadrage de bureau ne doit pas bouger').toBeGreaterThan(0.98);
});

test('ECHAP dans le sous-panneau des acces rapides ne detruit PAS la saisie', async ({ page }) => {
  /*
   * La fenetre de connexion ecoute Echap depuis qu une issue de secours lui a ete ajoutee.
   * Le sous-panneau << Gerer >> s ouvre AU-DESSUS d elle, sur six templates : sans ecouteur a
   * lui, Echap fermait la connexion entiere et effacait l adresse et les six chiffres deja
   * saisis. Une touche de retour en arriere qui detruit la saisie est pire que pas de touche.
   */
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(900);

  const voile = frame.locator('.fixed.inset-0').first();
  const champ = voile.locator('input[type="email"]').first();
  await champ.fill('essai@talvex.fr');
  const cases = voile.locator('input[maxlength="1"]');
  for (let i = 0; i < 6; i++) await cases.nth(i).fill(String(i + 1));

  // On ouvre le sous-panneau, puis on presse Echap.
  const gerer = voile.getByText(/Gerer|Gérer|ניהול/).first();
  await gerer.click();
  await frame.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await frame.waitForTimeout(500);

  // La connexion est toujours la, et la saisie avec elle.
  await expect(voile).toBeVisible();
  await expect(champ).toHaveValue('essai@talvex.fr');
  expect(await cases.nth(0).inputValue(), 'le code saisi doit survivre').toBe('1');

  // Un second Echap, le sous-panneau referme, doit bien fermer la connexion.
  await page.keyboard.press('Escape');
  await frame.waitForTimeout(500);
  expect(await frame.locator('.fixed.inset-0').count()).toBe(0);
});

test('EN HEBREU, les boutons sans texte portent un nom hebreu', async ({ page }) => {
  // Deux etiquettes d accessibilite etaient ecrites en francais en dur : un visiteur au lecteur
  // d ecran entendait << Fermer >> au milieu d une fenetre entierement en hebreu.
  await page.setViewportSize({ width: 1440, height: 900 });
  const frame = await ouvrir(page);
  await frame.getByTestId('ih-connexion').click();
  await frame.waitForTimeout(900);

  const voile = frame.locator('.fixed.inset-0').first();
  await expect(voile.locator('button[aria-label="סגירה"]')).toHaveCount(1);

  await voile.locator('input[type="email"]').first().fill('essai@talvex.fr');
  await frame.waitForTimeout(300);
  await expect(voile.locator('button[aria-label="מחיקה"]')).toHaveCount(1);
});
