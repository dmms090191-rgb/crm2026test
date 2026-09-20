// Geometrie FLUIDE de l'arc : continuite en largeur, et ajustement a la hauteur MESUREE.
//   node --test scripts/talixy/arcFluide.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  arcMetrics, ajusteALaHauteur, spacingPourHauteur, CRANS_VISIBLES, SPACING_MIN,
} from '../../src/talixy/arcFluid.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

/** Les largeurs que David veut voir couvertes, plus quelques voisines pieges. */
const LARGEURS = [
  320, 360, 375, 390, 412, 440, 480, 600, 700,
  767, 768, 769, 820, 900, 1000, 1023, 1024, 1025,
  1100, 1180, 1280, 1366, 1439, 1440, 1441,
  1600, 1920, 2200, 2560, 3440, 3840,
];

test('les trois jeux valides sont retrouves EXACTEMENT a leur largeur', () => {
  const compact = arcMetrics(768);
  assert.equal(compact.spacing, 56);
  assert.equal(compact.padStart, 106);
  assert.equal(compact.asideW, 312);

  const laptop = arcMetrics(1024);
  assert.equal(laptop.spacing, 67);
  assert.equal(laptop.asideW, 376);

  const desktop = arcMetrics(1440);
  assert.equal(desktop.spacing, 75);
  assert.equal(desktop.asideW, 420);
});

test('CONTINUITE : aucun saut, a aucune largeur, sur aucune grandeur', () => {
  let precedent = arcMetrics(600);
  let sautMax = 0;
  let ouSaute = 0;
  for (let w = 601; w <= 2560; w++) {
    const m = arcMetrics(w);
    for (const cle of ['spacing', 'padStart', 'asideW', 'lineGap', 'disc'] as const) {
      const saut = Math.abs(m[cle] - precedent[cle]);
      if (saut > sautMax) { sautMax = saut; ouSaute = w; }
    }
    precedent = m;
  }
  assert.ok(sautMax <= 0.5, `saut de ${sautMax} px a ${ouSaute} px de large`);
});

test('MONOTONIE et PLATEAU : ca grandit avec la largeur, puis ca s arrete a 1440', () => {
  for (let i = 1; i < LARGEURS.length; i++) {
    const a = arcMetrics(LARGEURS[i - 1]);
    const b = arcMetrics(LARGEURS[i]);
    assert.ok(b.spacing >= a.spacing - 1e-9, `${LARGEURS[i - 1]} -> ${LARGEURS[i]} : l arc retrecit`);
  }
  const ref = arcMetrics(1440);
  for (const w of [1600, 1920, 2560, 3840]) assert.deepEqual(arcMetrics(w), ref, `${w} px doit rendre comme 1440`);
});

/*
 * ---------- HAUTEUR ----------
 * L'objectif est de garder 7 positions. La condition que TalixyArc verifie est reproduite ici
 * telle quelle : c'est elle qui decidait auparavant du repli a 3 onglets.
 */
const tient = (hauteur: number, span: number, spacing: number, focus: number) => {
  const halfPx = (span / 2) * spacing + spacing / 2 + 6;
  return hauteur * focus >= halfPx && hauteur * (1 - focus) >= halfPx;
};

/*
 * Etendue reellement a loger. Ce n est PAS 6 : entre la premiere et la derniere position il y a
 * 6 intervalles d onglets, MAIS aussi les respirations des compartiments, qui occupent 0,42 cran
 * chacune sur la jante. Avec la configuration de David (7 onglets, 4 compartiments) :
 *     span = 6 + 4 x 0,42 = 7,68
 * Modeliser 6 au lieu de 7,68 sous-estime de 28 % la place necessaire — c est exactement l erreur
 * qui faisait croire que 73,5 px tenait a 560 px de haut.
 */
const SPAN_7 = (CRANS_VISIBLES - 1) + 4 * 0.42;

test('spacingPourHauteur donne EXACTEMENT le plus grand espacement qui tient', () => {
  for (const h of [400, 500, 560, 600, 640, 700, 768, 900, 1080, 1440]) {
    const s = spacingPourHauteur(h, SPAN_7, 0.51);
    assert.ok(tient(h, SPAN_7, s, 0.51), `${h} px : ${s} ne tient pas`);
    // Un demi-pixel de plus, et ca deborde : c est donc bien le maximum.
    assert.ok(!tient(h, SPAN_7, s + 0.5, 0.51), `${h} px : ${s} n est pas le maximum`);
  }
});

test('LE DEFAUT CORRIGE : a 768 px de haut, les 7 positions tiennent maintenant', () => {
  // Hauteur du conteneur de l arc sur une fenetre de 768 px : logo et pied deduits par la mise en
  // page. On prend une valeur prudente, plus petite que la realite.
  const hauteurArc = 560;
  const voulu = arcMetrics(1366);
  assert.equal(voulu.spacing, 73.5, 'la largeur 1366 demande 73,5');

  // Avant : on gardait 73,5 et ca ne tenait pas -> repli, actif au centre, 3 onglets.
  assert.equal(tient(hauteurArc, SPAN_7, voulu.spacing, voulu.focus), false, 'l ancien comportement ne tenait pas');

  // Apres : on resserre, et ca tient.
  const ajuste = ajusteALaHauteur(voulu, hauteurArc, SPAN_7);
  assert.ok(ajuste.spacing < voulu.spacing, 'l espacement a bien ete reduit');
  assert.ok(tient(hauteurArc, SPAN_7, ajuste.spacing, ajuste.focus), 'les 7 positions tiennent');
});

test('les 7 positions tiennent sur toutes les hauteurs demandees par David', () => {
  // Hauteur du conteneur de l arc, estimee prudemment a 73 % de la hauteur de fenetre.
  const conteneur = (fenetre: number) => Math.round(fenetre * 0.73);
  for (const [largeur, fenetre] of [[1024, 768], [1366, 768], [1440, 1080], [1440, 768], [1440, 640], [1440, 560], [1920, 1080]] as const) {
    const base = arcMetrics(largeur);
    const m = ajusteALaHauteur(base, conteneur(fenetre), SPAN_7);
    const ok = tient(conteneur(fenetre), SPAN_7, m.spacing, m.focus);
    // Si ca ne tient pas, c est uniquement parce qu on a touche le plancher de lisibilite.
    assert.ok(ok || m.spacing === SPACING_MIN, `${largeur}x${fenetre} : ni tenue ni plancher (${m.spacing})`);
  }
});

test('DEGRADATION PROGRESSIVE : rien ne s effondre, tout se resserre', () => {
  const base = arcMetrics(1440);
  let precedent = ajusteALaHauteur(base, 1200, SPAN_7);
  for (let h = 1199; h >= 300; h--) {
    const m = ajusteALaHauteur(base, h, SPAN_7);
    assert.ok(m.spacing <= precedent.spacing + 1e-9, `${h} px : l espacement remonte`);
    assert.ok(m.disc <= precedent.disc + 1e-9, `${h} px : le disque remonte`);
    assert.ok(precedent.spacing - m.spacing <= 0.5, `${h} px : marche de ${precedent.spacing - m.spacing}`);
    precedent = m;
  }
  // Planchers : on ne descend jamais dans l illisible.
  const minimal = ajusteALaHauteur(base, 200, SPAN_7);
  assert.equal(minimal.spacing, SPACING_MIN);
  assert.ok(minimal.disc >= 30, `disque ${minimal.disc} px : trop petit au doigt`);
});

test('le disque resiste plus longtemps que l espacement : la cible reste confortable', () => {
  const base = arcMetrics(1440);
  const serre = ajusteALaHauteur(base, 500, SPAN_7);
  const chuteSpacing = 1 - serre.spacing / base.spacing;
  const chuteDisque = 1 - serre.disc / base.disc;
  assert.ok(chuteDisque < chuteSpacing, 'le disque doit chuter moins vite que l espacement');
  assert.ok(serre.disc >= 30);
});

test('une hauteur confortable ne touche a rien', () => {
  const base = arcMetrics(1440);
  assert.deepEqual(ajusteALaHauteur(base, 2000, SPAN_7), base);
  assert.deepEqual(ajusteALaHauteur(base, 0, SPAN_7), base, 'avant la mesure, on ne touche a rien');
});

test('SEUIL UNIQUE : le JavaScript lit la meme requete que le CSS', () => {
  const sidebar = read('src/talixy/useTalixySidebar.ts');
  const roue = read('src/talixy/TalixySidebarWheel.tsx');

  assert.match(sidebar, /export const TALIXY_ARC_QUERY = `\(min-width: \$\{TALIXY_BREAKPOINTS\.mobileMax \+ 1\}px\)`/);
  assert.match(sidebar, /window\.matchMedia\(TALIXY_ARC_QUERY\)/, 'le crochet interroge la media query');
  assert.doesNotMatch(sidebar, /window\.innerWidth > TALIXY_BREAKPOINTS\.mobileMax/, 'plus de comparaison sur innerWidth');

  assert.match(roue, /useMediaQuery\(TALIXY_ARC_QUERY\)/, 'la roue bascule sur la meme requete');
  assert.doesNotMatch(roue, /width > TALIXY_BREAKPOINTS\.mobileMax/, 'plus de seuil parallele dans la roue');
});

test('l arc ne devine plus la place : il la mesure', () => {
  const arc = read('src/talixy/TalixyArc.tsx');
  assert.match(arc, /ajusteALaHauteur\(depart, size\.h, spanALoger\)/, 'ajuste sur la hauteur mesuree');
  assert.match(arc, /const halfPx = \(span \/ 2\) \* ajuste\.spacing/, 'le test de tenue utilise l espacement ajuste');
  const fluide = read('src/talixy/arcFluid.ts');
  assert.doesNotMatch(fluide, /RESERVE_VERTICALE/, 'plus aucune reserve verticale devinee');
});
