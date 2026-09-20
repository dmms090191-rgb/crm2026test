// Plein ecran du telephone virtuel : ajustement, zoom, et surtout INVARIANCE DU VIEWPORT.
// Aucun navigateur, aucune base : calcul pur + lecture des sources.
//   node --test scripts/phone/pleinEcran.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { echelleAjustement, echelleFinale } from '../../src/components/phoneFullscreen.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

// Panneau mesure : coque + en-tete + barre de controles. Valeurs proches du rendu reel.
const PANNEAU_IPHONE = { w: 233, h: 500 };   // 440 x 0.42 + 24 de coque, + les deux barres
const PANNEAU_SAMSUNG = { w: 250, h: 537 };  // 480 x 0.42 + 24
const MARGE = 56;

test('ajustement : le telephone tient ENTIER, sans rognage ni deformation', () => {
  const ecran = { w: 1920, h: 1080 };
  const e = echelleAjustement(PANNEAU_IPHONE, ecran, MARGE);

  // Une seule echelle pour les deux axes : les proportions sont forcement conservees.
  const largeurAffichee = PANNEAU_IPHONE.w * e;
  const hauteurAffichee = PANNEAU_IPHONE.h * e;
  assert.ok(largeurAffichee <= ecran.w - MARGE + 1e-9, 'rien ne deborde en largeur');
  assert.ok(hauteurAffichee <= ecran.h - MARGE + 1e-9, 'rien ne deborde en hauteur');

  // Et c'est bien le MAXIMUM : l'un des deux cotes touche la limite.
  const toucheH = Math.abs(hauteurAffichee - (ecran.h - MARGE)) < 1e-9;
  const toucheW = Math.abs(largeurAffichee - (ecran.w - MARGE)) < 1e-9;
  assert.ok(toucheH || toucheW, 'un cote atteint exactement la place disponible');

  // Sur un ecran large, c'est la hauteur qui contraint — d'ou le min() et pas le max().
  assert.ok(toucheH, 'ecran 16:9, telephone tres vertical : la hauteur commande');

  // Le rapport de forme est identique avant et apres.
  const avant = PANNEAU_IPHONE.w / PANNEAU_IPHONE.h;
  const apres = largeurAffichee / hauteurAffichee;
  assert.ok(Math.abs(avant - apres) < 1e-12, 'aucun etirement');
});

test('ajustement : un ecran etroit fait commander la largeur', () => {
  const etroit = { w: 300, h: 2000 };
  const e = echelleAjustement(PANNEAU_IPHONE, etroit, MARGE);
  assert.ok(Math.abs(PANNEAU_IPHONE.w * e - (etroit.w - MARGE)) < 1e-9, 'la largeur touche la limite');
  assert.ok(PANNEAU_IPHONE.h * e <= etroit.h - MARGE, 'la hauteur reste dans le cadre');
});

test('ajustement : tant que la mesure n est pas faite, on ne deforme rien', () => {
  assert.equal(echelleAjustement({ w: 0, h: 0 }, { w: 1920, h: 1080 }, MARGE), 1);
  assert.equal(echelleAjustement(PANNEAU_IPHONE, { w: 40, h: 40 }, MARGE), 1, 'ecran plus petit que la marge');
});

test('zoom et plein ecran sont deux commandes distinctes qui se multiplient', () => {
  const ecran = { w: 1920, h: 1080 };
  const ajuste = echelleAjustement(PANNEAU_IPHONE, ecran, MARGE);

  // En plein ecran, 100 % remplit exactement la place disponible.
  assert.equal(echelleFinale(ajuste, 100), ajuste);
  // 75 % et 125 % agissent par-dessus, proportionnellement.
  assert.ok(Math.abs(echelleFinale(ajuste, 75) - ajuste * 0.75) < 1e-12);
  assert.ok(Math.abs(echelleFinale(ajuste, 125) - ajuste * 1.25) < 1e-12);

  // Hors plein ecran, l'ajustement vaut 1 : on retrouve exactement le zoom d'avant.
  assert.equal(echelleFinale(1, 75), 0.75);
  assert.equal(echelleFinale(1, 100), 1);
  assert.equal(echelleFinale(1, 125), 1.25);
});

test('le Samsung s ajuste autrement que l iPhone, parce qu il est plus grand', () => {
  const ecran = { w: 1920, h: 1080 };
  const eIphone = echelleAjustement(PANNEAU_IPHONE, ecran, MARGE);
  const eSamsung = echelleAjustement(PANNEAU_SAMSUNG, ecran, MARGE);
  assert.ok(eSamsung < eIphone, 'un panneau plus grand recoit une echelle plus petite');
  // Mais les deux remplissent la meme hauteur a l ecran : c est bien un ajustement, pas un hasard.
  assert.ok(Math.abs(PANNEAU_IPHONE.h * eIphone - PANNEAU_SAMSUNG.h * eSamsung) < 1e-9);
});

test('VIEWPORT : les deux modeles ont des dimensions logiques reellement differentes', () => {
  const src = read('src/components/SimulatedPhone.tsx');
  // iPhone 17 Pro Max
  assert.match(src, /viewportW: 440,\s*\n\s*viewportH: 956,/);
  // Samsung S26 Ultra
  assert.match(src, /viewportW: 480,\s*\n\s*viewportH: 1040,/);

  // L iframe prend SA largeur du modele, et se reduit par une transformation.
  assert.match(src, /width: model\.viewportW,/, 'largeur logique = celle du modele');
  assert.match(src, /height: viewportH,/, 'hauteur logique = celle du modele');
  assert.match(src, /transform: `scale\(\$\{SCALE\}\)`/, 'la reduction est une transformation, pas une largeur');
  // Une transformation ne change pas le viewport de mise en page : le responsive est donc reel.
  assert.doesNotMatch(src, /width: model\.viewportW \* SCALE/, 'la largeur de l iframe n est jamais pre-multipliee');
});

test('PLEIN ECRAN : il ne touche ni au viewport, ni a l iframe, ni a la session', () => {
  const src = read('src/components/FloatingPhoneWindow.tsx');

  // Le plein ecran n agit QUE sur la transformation de la racine.
  assert.match(src, /transform: `translate\(-50%, -50%\) scale\(\$\{echelle\}\)`/);
  assert.match(src, /const \[pleinEcran, setPleinEcran\] = useState\(false\);/);

  // Il ne passe aucune prop nouvelle au telephone : SimulatedPhone ignore tout du plein ecran.
  const appel = src.match(/<SimulatedPhone[\s\S]*?\/>/)?.[0] ?? '';
  assert.ok(appel.length > 0, 'le telephone est bien monte');
  assert.doesNotMatch(appel, /pleinEcran|fullscreen|echelle/, 'aucune prop de plein ecran ne descend');

  // Le voile est TOUJOURS monte : sinon l index du panneau changerait et React le remonterait,
  // ce qui rechargerait l iframe et perdrait la page mobile en cours.
  assert.doesNotMatch(src, /\{pleinEcran && <div data-tx-phone-veil/, 'le voile n est jamais conditionnel');
  assert.match(src, /opacity: pleinEcran \? 1 : 0/, 'seule son opacite change');

  // Aucune cle d iframe, aucun rechargement declenche depuis ce fichier.
  assert.doesNotMatch(src, /iframeKey|setLoaded/, 'le plein ecran ne recharge rien');

  // Echap sort du plein ecran avant de reduire.
  assert.match(src, /if \(pleinEcran\) setPleinEcran\(false\);\s*\n\s*else onMinimize\(\);/);
});

test('le bouton plein ecran est une commande de plus, pas un remplacement', () => {
  const src = read('src/components/FloatingPhoneWindow.tsx');
  // Les commandes existantes sont intactes.
  assert.match(src, /onClick=\{\(\) => onScaleChange\(scale - 10\)\}/);
  assert.match(src, /onClick=\{\(\) => onScaleChange\(scale \+ 10\)\}/);
  assert.match(src, /onClick=\{\(\) => onModelChange\(m\.id\)\}/);
  assert.match(src, /onClick=\{onMinimize\}/);
  assert.match(src, /onClick=\{onClose\}/);
  // Et la nouvelle s ajoute a cote, avec les deux etats de son icone.
  assert.match(src, /data-tx-fs-btn/);
  assert.match(src, /pleinEcran \? <Minimize2 [^>]*\/> : <Maximize2 /);
});
