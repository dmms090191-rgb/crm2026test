/*
 * TALVEX S'INSTALLE-T-IL SUR UN TELEPHONE DEPUIS LE NAVIGATEUR ?
 *   node --import tsx --test scripts/runtime/pwaInstallable.test.ts
 *
 * ---------- POURQUOI CE FICHIER NAIT LE 29 OCTOBRE 2026 ----------
 *
 * Il n'existait AUCUN releve sur cette voie. Mesure du jour : un balayage de scripts/, e2e/
 * et supabase/functions/ cherchant « webmanifest », « apple-touch-icon »,
 * « apple-mobile-web-app » et « public/icons » ne rendait qu'un seul fichier,
 * scripts/generateIcons.cjs — un generateur, pas un garde-fou.
 *
 * ET CE SILENCE A COUTE. Trois des cinq icones etaient en NIVEAUX DE GRIS : colorType 4,
 * zero pour cent de pixels colores, un carre noir avec un glyphe blanc. Elles etaient
 * anterieures au generateur, et le generateur saute tout fichier deja present — il les
 * contournait donc depuis des mois. Pendant ce temps, le defaut symetrique etait bien
 * verrouille sur l'icone NATIVE par projetIos.test.ts.
 *
 * Un defaut qu'aucun releve ne regarde finit toujours par arriver en production.
 *
 * ---------- CE QUE CE FICHIER NE PRETEND PAS ----------
 *
 * Aucun iPhone n'a ete touche. Il mesure des OCTETS et des CHAINES : que le manifeste
 * declare ce qu'il faut, que les fichiers existent aux bonnes dimensions, que les icones
 * portent reellement de la couleur, et que la detection du navigateur ne se trompe pas.
 * Il ne prouve pas qu'un appareil affiche quoi que ce soit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import {
  navigateurIOSDepuisUA,
  voieNavigateur,
  VOIES_INSTALLATION_IOS,
  type NavigateurIOS,
} from '../../src/lib/plateforme.ts';

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const octets = (p: string) => readFileSync(new URL('../../' + p, import.meta.url));
const existe = (p: string) => existsSync(new URL('../../' + p, import.meta.url));

/* Les commentaires sont retires avant toute recherche de motif : ce fichier parle
   abondamment d'icones grises, et sans ce filtre il mordrait sur sa propre prose. */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

// ===================== A. LE MANIFESTE =====================

interface IconeManifeste { src: string; sizes: string; type: string; purpose?: string }
interface ManifestePWA {
  name: string; short_name: string; start_url: string; scope: string;
  display: string; background_color: string; theme_color: string;
  icons: IconeManifeste[];
}

const manifeste = (): ManifestePWA => JSON.parse(lire('public/manifest.webmanifest')) as ManifestePWA;

test('A1 le manifeste se parse et declare ce qu une installation exige', () => {
  const m = manifeste();
  assert.equal(m.display, 'standalone',
    "sans display=standalone, l'icone ouvrirait un onglet de navigateur et non une application");
  assert.equal(m.start_url, '/', "start_url deplacee : l'application ne s'ouvrirait plus sur la page d'entree");
  assert.equal(m.scope, '/', 'un scope plus etroit ferait sortir de l application au premier lien interne');
  for (const cle of ['name', 'short_name', 'background_color', 'theme_color'] as const) {
    assert.ok(typeof m[cle] === 'string' && m[cle].length > 0, `${cle} est vide`);
  }
  /* short_name est ce qui s'affiche SOUS l'icone : au-dela d'une douzaine de caracteres,
     iOS le tronque avec des points de suspension. */
  assert.ok(m.short_name.length <= 12, `short_name fait ${m.short_name.length} caracteres : il sera tronque`);
});

test('A2 chaque icone declaree EXISTE, aux dimensions annoncees', () => {
  /*
   * PIEGE A TRAITER A PART, ET IL EST DANS LE MANIFESTE LIVRE : la cinquieme icone est
   * /favicon.svg, declaree sizes="any" et type="image/svg+xml". Un releve qui lirait un
   * en-tete PNG sur CHAQUE entree rougirait des son premier lancement, sur une declaration
   * parfaitement correcte. Le vectoriel se verifie autrement : il existe, et il s'ouvre.
   */
  for (const ic of manifeste().icons) {
    const chemin = 'public' + ic.src;
    assert.ok(existe(chemin), `${ic.src} est declaree au manifeste mais absente du disque`);

    if (ic.type === 'image/svg+xml') {
      const svg = lire(chemin);
      assert.match(svg, /<svg[\s>]/, `${ic.src} n'est pas un SVG`);
      assert.equal(ic.sizes, 'any', 'un SVG se declare sizes="any" : il n a pas de dimension fixe');
      continue;
    }

    const b = octets(chemin);
    assert.equal(b.slice(1, 4).toString(), 'PNG', `${ic.src} n'est pas un PNG`);
    const [attendue] = ic.sizes.split('x').map(Number);
    assert.equal(b.readUInt32BE(16), attendue, `${ic.src} : largeur reelle differente de ${ic.sizes}`);
    assert.equal(b.readUInt32BE(20), attendue, `${ic.src} : hauteur reelle differente de ${ic.sizes}`);
  }
});

test('A3 les deux tailles qu une installation reclame sont la, et une maskable', () => {
  const m = manifeste();
  const png = m.icons.filter((i) => i.type === 'image/png');
  for (const taille of ['192x192', '512x512']) {
    assert.ok(png.some((i) => i.sizes === taille && (i.purpose ?? 'any') === 'any'),
      `aucune icone ${taille} de purpose "any" : l'installation peut etre refusee`);
  }
  /*
   * LES DEUX TAILLES EN MASKABLE AUSSI, et c'est une mutation qui l'a impose : exiger
   * seulement qu'il EXISTE une maskable laissait passer la perte de l'une des deux, puisque
   * l'autre suffisait a satisfaire le `some`. Un releve qui se contente d'un exemplaire ne
   * garde pas un jeu.
   */
  for (const taille of ['192x192', '512x512']) {
    assert.ok(png.some((i) => i.sizes === taille && i.purpose === 'maskable'),
      `aucune icone ${taille} de purpose "maskable" : sur Android elle serait rognee de travers`);
  }
});

// ===================== B. CE QU'iOS LIT, ET QUI N'EST PAS LE MANIFESTE =====================

test('B1 index.html porte le lien du manifeste et les quatre balises apple-*', () => {
  /*
   * iOS NE LIT PAS TOUT LE MANIFESTE. Il a ses propres balises, et chacune repare un defaut
   * visible : sans apple-touch-icon, l'icone de l'ecran d'accueil est une CAPTURE D'ECRAN
   * de la page ; sans apple-mobile-web-app-capable, l'application s'ouvre dans une barre de
   * navigateur au lieu du plein ecran ; sans apple-mobile-web-app-title, le nom sous
   * l'icone est celui de la balise <title>, souvent trop long.
   */
  const html = sansCommentaires(lire('index.html'));
  assert.match(html, /<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/,
    'le manifeste n est plus lie : aucun navigateur ne proposera l installation');
  assert.match(html, /<meta[^>]+name="apple-mobile-web-app-capable"[^>]+content="yes"/,
    "sans cette balise, l'application posee s'ouvre avec la barre de Safari");
  assert.match(html, /<meta[^>]+name="apple-mobile-web-app-title"/,
    "le nom sous l'icone retomberait sur le <title> de la page");
  assert.match(html, /<meta[^>]+name="apple-mobile-web-app-status-bar-style"/,
    'la barre d etat ne serait plus accordee au theme');
  assert.match(html, /<link[^>]+rel="apple-touch-icon"[^>]+href="\/icons\/apple-touch-icon\.png"/,
    "sans apple-touch-icon, iOS pose une CAPTURE D'ECRAN de la page comme icone");
  /* viewport-fit=cover : sans lui, toutes les env(safe-area-inset-*) valent zero, et
     l'application plein ecran passe sous l'encoche. */
  assert.match(html, /viewport-fit=cover/, 'les zones sures ne sont plus calculees');
});

/* ---- Decodeur PNG minimal : on mesure les PIXELS, pas le nom du fichier ---- */
function pixelsPNG(chemin: string) {
  const b = octets(chemin);
  let o = 8;
  const idat: Buffer[] = [];
  let w = 0, h = 0, depth = 0, ct = 0;
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.slice(o + 4, o + 8).toString();
    if (type === 'IHDR') {
      w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12);
      depth = b[o + 16]; ct = b[o + 17];
    }
    if (type === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const canaux = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[ct];
  assert.ok(canaux, `${chemin} : colorType ${ct} non gere par ce releve`);
  const bpp = canaux * (depth / 8);
  const rowLen = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * rowLen);
  let prev = Buffer.alloc(rowLen);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (rowLen + 1)];
    const ligne = Buffer.from(raw.slice(y * (rowLen + 1) + 1, (y + 1) * (rowLen + 1)));
    for (let i = 0; i < rowLen; i++) {
      const a = i >= bpp ? ligne[i - bpp] : 0;
      const bb = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (f === 1) ligne[i] = (ligne[i] + a) & 255;
      else if (f === 2) ligne[i] = (ligne[i] + bb) & 255;
      else if (f === 3) ligne[i] = (ligne[i] + ((a + bb) >> 1)) & 255;
      else if (f === 4) {
        const p = a + bb - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
        ligne[i] = (ligne[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255;
      }
    }
    ligne.copy(out, y * rowLen);
    prev = ligne;
  }
  const pas = depth === 16 ? 2 : 1;
  const lire1 = (x: number, y: number) => {
    const i = y * rowLen + x * bpp;
    if (ct === 0) return { r: out[i], v: out[i], b: out[i], a: 255 };
    if (ct === 4) return { r: out[i], v: out[i], b: out[i], a: out[i + pas] };
    if (ct === 2) return { r: out[i], v: out[i + pas], b: out[i + 2 * pas], a: 255 };
    return { r: out[i], v: out[i + pas], b: out[i + 2 * pas], a: out[i + 3 * pas] };
  };
  let colores = 0, opaques = 0, total = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const p = lire1(x, y);
      total++;
      if (p.a === 255) opaques++;
      if (Math.max(p.r, p.v, p.b) - Math.min(p.r, p.v, p.b) > 18) colores++;
    }
  }
  return { w, h, depth, ct, pourcentColore: (100 * colores) / total, pourcentOpaque: (100 * opaques) / total, lire1 };
}

test('B2 l icone de l ecran d accueil porte LA MARQUE, et pas du gris', () => {
  /*
   * LE RELEVE QUI MANQUAIT, ET QUI AURAIT ATTRAPE LE DEFAUT DU 29/10/2026.
   *
   * apple-touch-icon.png etait un carre NOIR avec un glyphe blanc : colorType 4, zero
   * pourcent de pixels colores. Sur l'ecran d'accueil d'un iPhone, Talvex n'etait pas
   * reconnaissable.
   *
   * ON MESURE LA COULEUR RENDUE, PAS LE TYPE DE COULEUR DU PNG, et la distinction est
   * mesuree : scripts/generateIcons.cjs ecrit en colorType 6 (RVB + alpha). Un releve qui
   * exigerait colorType 2 — « RVB sans alpha », comme l'exige l'icone NATIVE d'Apple —
   * rougirait donc le jour ou un fichier serait supprime puis regenere. Ce n'est pas le
   * meme contrat : l'App Store refuse un alpha, l'ecran d'accueil s'en moque.
   *
   * ET L'ALPHA N'ETAIT PAS LE DEFAUT. Mesure : 1 655 pixels sur 32 400 n'etaient pas
   * totalement opaques, tous dans les coins arrondis qu'iOS decoupe de toute facon.
   * Reencoder sans alpha aurait converti du gris en gris.
   */
  const apple = pixelsPNG('public/icons/apple-touch-icon.png');
  assert.equal(apple.w, 180, "iOS attend 180x180 pour l'icone de l'ecran d'accueil");
  assert.equal(apple.h, 180);
  assert.ok(apple.pourcentColore > 40,
    `l'icone Apple ne porte que ${apple.pourcentColore.toFixed(0)} % de pixels colores : `
    + 'elle est en niveaux de gris, et Talvex n y est pas reconnaissable');
  /* PLEINE BORDURE : iOS applique son propre masque arrondi. Une icone deja arrondie et
     transparente dans les coins se retrouve composee sur du noir, avec un double arrondi. */
  assert.ok(apple.pourcentOpaque > 97,
    `l'icone Apple n'est opaque qu'a ${apple.pourcentOpaque.toFixed(0)} % : iOS la composera sur du noir`);
});

test('B3 les icones du manifeste portent la marque elles aussi', () => {
  for (const nom of ['icon-192x192.png', 'icon-512x512.png', 'icon-192x192-maskable.png', 'icon-512x512-maskable.png']) {
    const ic = pixelsPNG('public/icons/' + nom);
    assert.ok(ic.pourcentColore > 40,
      `${nom} ne porte que ${ic.pourcentColore.toFixed(0)} % de pixels colores : elle est grise`);
  }
});

test('B4 aucune icone du dossier n a ete oubliee par le manifeste', () => {
  /* Un fichier dans public/icons que le manifeste ne declare pas est soit un oubli, soit un
     reliquat. Les deux meritent d'etre vus : c'est ainsi que trois icones grises ont
     survecu des mois. */
  const declarees = new Set(manifeste().icons.map((i) => i.src.replace('/icons/', '')));
  const surDisque = readdirSync(new URL('../../public/icons/', import.meta.url));
  for (const f of surDisque) {
    if (f === 'apple-touch-icon.png') continue; // declaree dans index.html, pas au manifeste
    assert.ok(declarees.has(f), `public/icons/${f} n'est declaree nulle part : oubli ou reliquat ?`);
  }
});

// ===================== C. LE NAVIGATEUR, PAS SEULEMENT L'APPAREIL =====================

test('C1 les navigateurs iOS sont distingues, et l ORDRE des tests est le piege', () => {
  /*
   * SUR iOS, TOUS LES NAVIGATEURS PORTENT « Safari/ » dans leur chaine d'agent, parce
   * qu'Apple les oblige a employer WebKit. Chrome ajoute « CriOS », Firefox « FxiOS », Edge
   * « EdgiOS » — mais tous gardent « Safari/ » a cote.
   *
   * Tester Safari en premier classerait donc les trois autres comme Safari, EN SILENCE, et
   * leur montrerait un bouton Partager en bas de l'ecran alors qu'il est en haut. C'est le
   * meme piege que l'iPad qui se fait passer pour un Mac.
   *
   * Ces chaines sont reelles : chacune contient bien « Safari/ ».
   */
  const UA = {
    safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    chrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
    firefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15',
    edge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.2903.91 Mobile/15E148 Safari/604.1',
  };
  for (const [attendu, ua] of Object.entries(UA)) {
    assert.ok(/Safari\//.test(ua), `la chaine de test de ${attendu} ne porte pas Safari/ : elle n eprouve rien`);
    assert.equal(navigateurIOSDepuisUA(ua), attendu as NavigateurIOS,
      `${attendu} est classe ${navigateurIOSDepuisUA(ua)} : l ordre des tests est faux`);
  }
  assert.equal(navigateurIOSDepuisUA(''), 'autre', 'une chaine vide doit retomber sur le cas generique');
});

test('C2 chaque navigateur recoit un mode d emploi COMPLET', () => {
  const navigateurs = Object.keys(VOIES_INSTALLATION_IOS) as NavigateurIOS[];
  assert.ok(navigateurs.length >= 5, 'un navigateur a disparu de la table');
  for (const n of navigateurs) {
    const v = VOIES_INSTALLATION_IOS[n];
    assert.ok(v.navigateur.length > 0, `${n} : le navigateur n est pas nomme`);
    assert.equal(v.etapes.length, 2, `${n} : le mode d emploi doit tenir en DEUX gestes`);
    for (const e of v.etapes) assert.ok(e.length > 12, `${n} : une etape est trop courte pour etre suivie`);
    assert.ok(v.reserve && v.reserve.length > 40,
      `${n} : la reserve sur la session n est plus dite, l utilisateur la decouvrira a la deconnexion`);
  }
});

test('C3 Safari est le seul recommande, et les autres DISENT pourquoi', () => {
  /*
   * Decision du 29/10/2026 : les deux voies marchent, et on ne force personne a changer de
   * navigateur. Mais Safari est le seul chez qui l'option existe depuis toujours ; chez les
   * autres elle depend d'iOS 16.4 ou plus. Un navigateur non recommande doit donc porter la
   * RAISON — sans elle, le conseil ressemble a une preference arbitraire, et l'utilisateur
   * soit l'ignore, soit change de navigateur pour rien.
   */
  const recommandes = (Object.keys(VOIES_INSTALLATION_IOS) as NavigateurIOS[])
    .filter((n) => VOIES_INSTALLATION_IOS[n].recommande);
  assert.deepEqual(recommandes, ['safari'], 'Safari doit etre le seul recommande');
  for (const n of Object.keys(VOIES_INSTALLATION_IOS) as NavigateurIOS[]) {
    const v = VOIES_INSTALLATION_IOS[n];
    if (v.recommande) continue;
    assert.ok(v.pourquoiPasRecommande && v.pourquoiPasRecommande.length > 30,
      `${n} n est pas recommande mais ne dit pas pourquoi`);
  }
});

test('C4 seul iOS a une voie navigateur, et elle ne depend pas du manifeste', () => {
  /* Android a un VRAI bouton d'installation expose par le navigateur : lui donner un mode
     d'emploi manuel serait lui proposer le chemin long. Et sur un ordinateur, la question
     ne se pose pas de la meme facon. */
  for (const p of ['windows', 'macos', 'android', 'inconnue'] as const) {
    assert.equal(voieNavigateur(p), undefined, `${p} ne doit pas porter de voie navigateur`);
  }
  assert.ok(voieNavigateur('ios'), 'iOS a perdu sa voie navigateur : un iPhone n aurait plus aucun chemin');
  /* Sans chaine d'agent, on rend quand meme quelque chose : un defaut qui marche vaut mieux
     qu'un undefined qui efface l'offre. */
  assert.equal(voieNavigateur('ios')?.navigateur, 'Safari');
});

// ===================== D. CE QUE LA PAGE EN FAIT =====================

test('D1 la page montre la voie navigateur, et seulement si aucune autre n est ouverte', () => {
  const code = sansCommentaires(lire('src/components/telechargement/CentreTelechargement.tsx'));
  assert.match(code, /const voie = voieNavigateur\(p\.cle, ua\);/,
    'la voie navigateur n est plus calculee, ou ne tient plus compte du navigateur');
  assert.match(code, /voie && !actif && !parMagasin &&/,
    'deux chemins concurrents pourraient s afficher : le mode d emploi doit s effacer des qu un bouton existe');
  assert.match(code, /InstallerDepuisLeNavigateur/, 'le mode d emploi n est plus rendu');
});

test('D2 la page dit POURQUOI il n y a pas de bouton sur iPhone', () => {
  /* Sur Android le navigateur expose un vrai bouton d'installation ; iOS ne l'expose a
     AUCUN navigateur. Sans cette phrase, l'utilisateur cherche le bouton que les autres
     ont, et conclut que la page est cassee. */
  const code = sansCommentaires(lire('src/components/telechargement/CentreTelechargement.tsx'));
  assert.match(code, /aucun site ne peut s'installer tout seul/,
    "la page n explique plus l'absence de bouton d installation sur iPhone");
});

test('D3 la plateforme du visiteur passe devant, sans que les autres disparaissent', () => {
  /*
   * DEFAUT MESURE LE 29/10/2026 : la page affichait les quatre cartes quelle que soit la
   * plateforme, et un iPhone se voyait donc proposer un .exe Windows ET un .apk Android,
   * tous deux actionnables, pendant que sa propre carte etait un pave mort.
   *
   * La detection RANGE, elle ne RETIRE pas : les autres restent atteignables d'un geste.
   */
  const code = sansCommentaires(lire('src/components/telechargement/CentreTelechargement.tsx'));
  assert.match(code, /rangerPlateformes\(plateforme\)/, 'les plateformes ne sont plus rangees par pertinence');
  assert.match(code, /'details'/, 'les autres plateformes ne sont plus repliees mais toujours affichees');
  assert.match(code, /data-testid="autres-plateformes"/, 'le depliant des autres plateformes a disparu');
});

test('D4 le manifeste est lu EN LIGNE quand l application est installee', () => {
  /*
   * DEFAUT QUI MENTAIT DEJA A L'ECRAN SUR ANDROID. Dans une WebView, l'origine est le paquet
   * local : un fetch relatif lit le manifeste EMBARQUE, c'est-a-dire l'etat du monde au
   * moment du build. Un paquet vN ne peut pas declarer vN disponible — il a ete bati avant.
   */
  const code = sansCommentaires(lire('src/components/telechargement/CentreTelechargement.tsx'));
  assert.match(code, /estApplicationInstallee\(\) \? ADRESSE_MANIFESTE : '\/telechargements\.json'/,
    "l'application installee relirait son propre manifeste embarque, donc perime");
});

// ===================== E. LE HORS LIGNE, DIT HONNETEMENT =====================

test('E1 le service worker ne PRETEND PAS un hors ligne qu il n a pas', () => {
  /*
   * MESURE DU 29/10/2026 : public/service-worker.js ne precache que trois entrees, et ne
   * contient AUCUN appel a cache.put. Aucun morceau hache n est donc jamais mis en cache,
   * ni le manifeste, ni les icones.
   *
   * La simple PRESENCE d'un service worker fait croire a un fonctionnement hors ligne. Ce
   * releve ne corrige pas cela — precacher demande une liste produite au build, et c'est une
   * decision produit. Il FIGE l'etat reel, pour qu'une tentative future de precacher soit
   * forcement accompagnee d'un nouveau nom de cache : sans quoi les anciens clients
   * garderaient l'ancienne liste pour toujours.
   */
  const sw = lire('public/service-worker.js');
  const aUnPut = /cache\.put\s*\(/.test(sansCommentaires(sw));
  const nomDeCache = /CACHE_NAME\s*=\s*['"`]([^'"`]+)['"`]/.exec(sw)?.[1];
  assert.ok(nomDeCache, 'CACHE_NAME a disparu : une mise a jour de cache ne pourrait plus etre datee');
  assert.equal(aUnPut, false,
    'un cache.put est apparu : le hors ligne devient reel, donc CACHE_NAME DOIT changer et '
    + "la promesse faite a l'utilisateur doit etre revue. Mettre ce releve a jour sciemment.");
});
