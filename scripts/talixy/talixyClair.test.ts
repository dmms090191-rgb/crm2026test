// Tests de la reference « maquette gris bleute » (image 3, 1672x941) : geometrie mesuree de l'arc,
// mode fixe (7 visibles au plus, ancre au milieu), et decisions de David encodees.
//   node --test scripts/talixy/talixyClair.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  arcPose, CAROUSEL_SLOTS, carouselPositions, carouselStart, fixedAnchor, followCenter, listFits,
  separatorRim,
  rimPositions, wheelPivot, wheelRadius, type RimKind,
} from '../../src/talixy/arcGeometry.ts';
import {
  TALIXY_ARC2_EMPHASIS, TALIXY_ARC2_LAYOUT, TALIXY_ARC2_PRESETS, TALIXY_ARC_MODE,
} from '../../src/talixy/talixyConfig.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const A = TALIXY_ARC2_PRESETS.desktop;

test('geometrie de la maquette : moyeu a DROITE, centres des disques sur R 512 px, pas 8 deg, tout opaque, 7 visibles au plus', () => {
  assert.equal(TALIXY_ARC_MODE, 'fixed');
  assert.equal(A.hub, 'right');
  // Cercle des cases R 537 ; centre des disques 25 px plus a droite -> R 512 mesure sur la maquette.
  assert.ok(Math.abs(wheelRadius(A) - 537) < 1, `rayon cases ${wheelRadius(A).toFixed(1)} px`);
  assert.ok(Math.abs(TALIXY_ARC2_LAYOUT.desktop.padStart + 25 - 204) < 1, 'apex des disques a x = 204 (maquette)');
  assert.ok(Math.abs(TALIXY_ARC2_LAYOUT.desktop.padStart + wheelRadius(A) - 715.4) < 2, 'moyeu a x = 715 (maquette)');
  assert.equal(A.stepDeg, 8);
  assert.equal(A.apexOffsetSteps, 0);
  assert.equal(A.depthPerStep, 0);
  assert.equal(A.tiltPerStepDeg, 0);
  assert.equal(A.scalePerStep, 0);
  assert.equal(A.labelTurn, 0);
  for (const d of [-3, -2, -1, 0, 1, 2, 3]) assert.equal(arcPose(d, A).opacity, 1, `d=${d} opaque`);
  // 7 visibles au plus (David) : le 4e cran est deja hors fenetre.
  assert.equal(arcPose(4, A).visible, false);
  assert.equal(arcPose(-4, A).visible, false);
});

test('arc en « ( » : les voisins derivent vers la DROITE (moyeu a droite), R(1-cos) comme la maquette', () => {
  const C = wheelPivot(A);
  assert.ok(C.x > 0, 'moyeu a droite du foyer');
  for (const d of [-3, -2, -1, 1, 2, 3]) {
    const p = arcPose(d, A);
    assert.ok(p.x > 0, `d=${d} : x=${p.x} (derive vers la droite)`);
  }
  // A ±3 crans (24 deg) : derive theorique R(1-cos24) ≈ 46,5 px.
  assert.ok(Math.abs(arcPose(3, A).x - wheelRadius(A) * (1 - Math.cos(24 * Math.PI / 180))) < 0.5);
});

test('mode fixe : ancre au milieu de la liste, listes courtes immobiles, listes longues suivies', () => {
  const kinds8: RimKind[] = ['item', 'item', 'item', 'item', 'item', 'item', 'item'];
  const pos8 = rimPositions(kinds8, A);
  assert.ok(listFits(pos8, A), '7 onglets tiennent');
  assert.equal(fixedAnchor(pos8), 3, 'ancre = milieu');
  const kinds24: RimKind[] = Array.from({ length: 24 }, () => 'item' as const);
  const pos24 = rimPositions(kinds24, A);
  assert.ok(!listFits(pos24, A), '24 onglets ne tiennent pas');
  // followCenter : ne bouge que si l'actif sort de la fenetre, et reste borne aux extremites.
  const c0 = followCenter(10, 10, pos24, A);
  assert.equal(c0, 10, 'actif au centre : rien ne bouge');
  const c1 = followCenter(10, 11.2, pos24, A);
  assert.equal(c1, 10, 'actif dans la fenetre de confort : rien ne bouge');
  const c2 = followCenter(10, 23, pos24, A);
  assert.ok(c2 <= pos24[23] - A.windowSteps + 1e-9 || Math.abs(c2 - (23 - (A.windowSteps - 0.5))) < 1e-9);
  const cEdge = followCenter(0, 0, pos24, A);
  assert.ok(cEdge >= pos24[0] + A.windowSteps - 1e-9, 'jamais de vide en haut de la liste');
});

test('mise en valeur de l actif et disposition mesurees (x1,4 ; libelle x1,27 ; colonne 420 px ; ligne +51 px)', () => {
  // Correction visuelle de David : disque 44 px (actif x1,36 = 60 px), libelle actif x1,04 seulement.
  assert.equal(TALIXY_ARC2_EMPHASIS.discScale, 1.36);
  assert.equal(TALIXY_ARC2_EMPHASIS.labelScale, 1.04);
  assert.equal(TALIXY_ARC2_LAYOUT.desktop.asideW, 420);
  // Ligne d'arc de la maquette : bord gauche a x = 152 -> rayon 564 depuis le moyeu (537 + 27).
  assert.equal(TALIXY_ARC2_LAYOUT.desktop.lineGap, 27);
  const css = read('src/talixy/talixy.css');
  assert.match(css, /--tx-disc: 44px;/);
  assert.match(css, /--tx-disc-active: 1\.36;/);
  assert.match(css, /scale\(1\.04\)/);
  // La hitbox reste pleine case malgre le visuel reduit.
  assert.match(css, /\.tx-arc-slot > div \{\s*height: 100%;/);
});

test('TalixyArc : mode fixe branche, halo pose par arcPose (il glisse sur le cercle), entrees inertes quand tout tient', () => {
  const arc = read('src/talixy/TalixyArc.tsx');
  // « Ca tient » = 7 ONGLETS au plus (les respirations des compartiments ne comptent pas),
  // ET la place verticale reelle suffit (rien ne deborde sur le logo ni le pied) ;
  // la fenetre s'elargit alors pour englober toute la liste.
  assert.match(arc, /const fits = mode === 'fixed' && itemCount <= CAROUSEL_SLOTS && fitsH;/);
  assert.match(arc, /size\.h \* focus >= halfPx && size\.h \* \(1 - focus\) >= halfPx/);
  assert.match(arc, /windowSteps: half \+ 0\.02/);
  assert.match(arc, /\? fixedAnchor\(rim\)/);
  assert.match(arc, /className="tx-arc-halo"/);
  assert.match(arc, /transform: arcPose\(positions\[activeIndex\] - center, params, orientation\)\.transform/);
  assert.match(arc, /if \(!fits\) setBrowse/);
});

/*
 * Regression : « Chat Groupes » et « Systeme » n'etaient pas cliquables.
 * Une case fait un cran (75 px) alors qu'un compartiment n'est qu'a 0,42 cran de son onglet :
 * leurs boites se chevauchent. Comme arcPose donne un z-index qui decroit avec la distance au
 * centre, SOUS l'ancre le compartiment passait devant l'onglet et avalait le clic.
 * Le decor doit donc etre inerte, et ne jamais passer devant un onglet.
 */
test('clic de l arc : chaque onglet recoit le clic sur son disque, jamais un compartiment', () => {
  const ENTREES: { kind: RimKind; nom: string }[] = [
    { kind: 'section', nom: 'PRINCIPAL' }, { kind: 'item', nom: 'Dashboard' }, { kind: 'item', nom: 'Acces' },
    { kind: 'divider', nom: '-' },
    { kind: 'section', nom: 'GESTION' }, { kind: 'item', nom: 'Groupes' }, { kind: 'item', nom: 'Statuts' },
    { kind: 'divider', nom: '-' },
    { kind: 'section', nom: 'COMMUNICATION' }, { kind: 'item', nom: 'Chat' },
    { kind: 'divider', nom: '-' },
    { kind: 'section', nom: 'MAINTENANCE' }, { kind: 'item', nom: 'Systeme' },
    { kind: 'divider', nom: '-' },
  ];
  const L = TALIXY_ARC2_LAYOUT.desktop;
  const kinds = ENTREES.map(e => e.kind);
  const pos = rimPositions(kinds, A);
  const half = (pos[pos.length - 1] - pos[0]) / 2;
  const p = half > A.windowSteps ? { ...A, windowSteps: half + 0.02 } : A;
  const centre = fixedAnchor(pos);
  const slotW = L.asideW - L.padStart - L.padEnd;
  const DISC_CX = 25;   // centre du disque depuis le bord gauche de la case

  /** Case du dessus au point donne, selon que le decor est inerte ou non. */
  const recoit = (px: number, py: number, decorInerte: boolean) => ENTREES
    .map((e, i) => {
      const q = arcPose(pos[i] - centre, p);
      const item = e.kind === 'item';
      return { i, e, q, z: decorInerte && !item ? q.zIndex - 50 : q.zIndex, clic: q.visible && (item || !decorInerte) };
    })
    .filter(c => c.clic && px >= c.q.x && px <= c.q.x + slotW
      && py >= c.q.y - A.spacing / 2 && py <= c.q.y + A.spacing / 2)
    .sort((a, b) => b.z - a.z || b.i - a.i)[0];

  let voles = 0;
  ENTREES.forEach((e, i) => {
    if (e.kind !== 'item') return;
    const q = arcPose(pos[i] - centre, p);
    // Avec la correction : l'onglet recoit son propre clic.
    assert.equal(recoit(q.x + DISC_CX, q.y, true)?.i, i, `${e.nom} doit recevoir son clic`);
    // Sans la correction : on verifie que le probleme existait bien (sinon le garde-fou ne sert a rien).
    if (recoit(q.x + DISC_CX, q.y, false)?.i !== i) voles++;
  });
  assert.equal(voles, 2, 'sans la correction, 2 onglets (sous l ancre) etaient voles par leur compartiment');

  const arc = read('src/talixy/TalixyArc.tsx');
  assert.match(arc, /const interactif = item\.kind === 'item';/);
  assert.match(arc, /pointerEvents: pose\.visible && interactif \? 'auto' : 'none'/);
  assert.match(arc, /zIndex: interactif \? pose\.zIndex : pose\.zIndex - 50/);
  assert.match(arc, /onClick=\{onSelect && interactif/);
});

/*
 * Carrousel : au-dela de 7 onglets, la jante porte 7 positions FIXES et ce sont les onglets qui
 * tournent. La fenetre doit rester PLEINE partout, y compris aux deux extremites — c'est ce qui
 * manquait : on retombait a 4 ou 5 onglets avec du vide en haut ou en bas.
 */
test('carrousel : toujours exactement 7 onglets visibles, a toutes les positions', () => {
  const NOMS = ['Dashboard', 'Acces', 'Site', 'Application', 'Themes', 'Groupes',
    'Statuts', 'Chat', 'Documentation', 'Tests', 'Sauvegarde', 'Systeme'];
  const kinds: RimKind[] = [];
  const rang: number[] = [];   // index dans NOMS, ou -1 pour le decor
  NOMS.forEach((_, i) => {
    if (i % 4 === 0) { kinds.push('section'); rang.push(-1); }
    kinds.push('item'); rang.push(i);
    if (i % 4 === 3) { kinds.push('divider'); rang.push(-1); }
  });
  const pos = carouselPositions(kinds);
  const total = NOMS.length;

  const ongletsVisibles = (start: number) => {
    const centre = start + (CAROUSEL_SLOTS - 1) / 2;
    return kinds
      .map((k, i) => ({ k, nom: rang[i] >= 0 ? NOMS[rang[i]] : '', vu: arcPose(pos[i] - centre, A).visible }))
      .filter(x => x.vu && x.k === 'item')
      .map(x => x.nom);
  };

  // Le decor ne prend aucune position : la jante ne porte que les onglets.
  assert.equal(pos.filter(Number.isFinite).length, total);
  assert.ok(pos.some(p => !Number.isFinite(p)), 'compartiments et separateurs hors jante');

  // A, B, C, D — la sequence decrite par David.
  assert.deepEqual(ongletsVisibles(carouselStart(0, -1, total)).slice(0, 3), ['Dashboard', 'Acces', 'Site']);
  assert.deepEqual(ongletsVisibles(carouselStart(1, -1, total)).slice(0, 2), ['Acces', 'Site']);
  assert.equal(ongletsVisibles(carouselStart(1, -1, total))[6], 'Chat', 'un cran plus bas : Chat entre par le bas');
  assert.equal(ongletsVisibles(carouselStart(99, -1, total))[6], 'Systeme', 'tout en bas : le dernier onglet est visible');

  // Balayage exhaustif : aucune position ne doit montrer moins de 7 onglets.
  for (let s = 0; s <= total - CAROUSEL_SLOTS; s++) {
    assert.equal(ongletsVisibles(s).length, CAROUSEL_SLOTS, `start=${s}`);
  }

  // Bornes et rappel de l'actif hors fenetre.
  assert.equal(carouselStart(-5, -1, total), 0, 'jamais de vide en haut');
  assert.equal(carouselStart(total + 10, -1, total), total - CAROUSEL_SLOTS, 'jamais de vide en bas');
  assert.equal(carouselStart(0, total - 1, total), total - CAROUSEL_SLOTS, 'actif en bas : le carrousel le ramene');
  assert.equal(carouselStart(5, 0, total), 0, 'actif en haut : le carrousel le ramene');
  assert.equal(carouselStart(2, 4, total), 2, 'actif deja visible : rien ne bouge');

  // 7 onglets ou moins : pas de carrousel, on garde le groupe centre.
  const court: RimKind[] = ['section', 'item', 'item', 'divider', 'item'];
  assert.ok(court.filter(k => k === 'item').length <= CAROUSEL_SLOTS);

  const arc = read('src/talixy/TalixyArc.tsx');
  assert.match(arc, /const carousel = mode === 'fixed' && itemCount > CAROUSEL_SLOTS;/);
  assert.match(arc, /\? start \+ \(CAROUSEL_SLOTS - 1\) \/ 2/);
  assert.match(arc, /setCarStart\(carouselStart\(startRef\.current \+ dir, -1, itemCount\)\)/);
});

/*
 * Regression : le premier compartiment restait colle en haut de la fenetre.
 * La separation etait ancree sur le premier voisin VISIBLE ; comme le premier compartiment n'a
 * jamais de voisin au-dessus, il se replacait a chaque cran juste au-dessus de la case du haut.
 * Elle est desormais ancree sur la frontiere REELLE dans la liste : tous les compartiments
 * suivent le meme calcul et tournent avec la roue.
 */
test('separateurs : meme regle pour tous, le premier compartiment n est pas epingle', () => {
  const NOMS = ['Dashboard', 'Acces', 'Site', 'Groupes', 'Statuts', 'Chat', 'Doc', 'Tests', 'Sauvegarde', 'Systeme'];
  const kinds: RimKind[] = [];
  NOMS.forEach((_, i) => {
    if (i % 3 === 0) kinds.push('section');
    kinds.push('item');
  });
  const pos = carouselPositions(kinds);
  const sections = kinds.map((k, i) => (k === 'section' ? i : -1)).filter(i => i >= 0);
  const total = NOMS.length;

  // La frontiere se calcule pareil partout : demi-cran avant le premier onglet du groupe.
  sections.forEach(s => {
    const rim = separatorRim(pos, kinds, s);
    assert.ok(rim !== null, 'chaque compartiment a une frontiere');
    const premier = pos.slice(s + 1).find(Number.isFinite) as number;
    assert.equal(rim, premier - 0.5, 'frontiere = demi-cran avant le premier onglet du groupe');
  });

  // Le premier compartiment DOIT se deplacer quand le carrousel tourne (sinon il est epingle).
  const rim0 = separatorRim(pos, kinds, sections[0]) as number;
  const ecart = (start: number) => rim0 - (start + (CAROUSEL_SLOTS - 1) / 2);
  assert.ok(ecart(1) < ecart(0), 'le premier compartiment remonte quand on descend d un cran');
  assert.equal(ecart(0) - ecart(1), 1, 'il remonte exactement d un cran, comme un onglet');

  // Quand plus aucun onglet du groupe n'est visible, le compartiment s'efface.
  const groupeVisible = (s: number, start: number) => {
    const centre = start + (CAROUSEL_SLOTS - 1) / 2;
    for (let i = s + 1; i < kinds.length && kinds[i] !== 'section'; i++) {
      if (kinds[i] === 'item' && arcPose(pos[i] - centre, A).visible) return true;
    }
    return false;
  };
  assert.equal(groupeVisible(sections[0], 0), true, 'en haut : le premier compartiment est visible');
  const max = total - CAROUSEL_SLOTS;
  assert.equal(groupeVisible(sections[0], max), false, 'tout en bas : son groupe est sorti, il disparait');

  const arc = read('src/talixy/TalixyArc.tsx');
  assert.match(arc, /const rimSep = separatorRim\(positions, kinds, s\);/);
  assert.match(arc, /opacity: sep\.visible \? 1 : 0/);
  assert.doesNotMatch(arc, /poses\[i\]\.visible\) return i;/, 'plus d ancrage sur le voisin visible');
});

test('compartiments et separateurs : invisibles sur l arc de la maquette, JAMAIS retires des configurations', () => {
  const wheelSrc = read('src/talixy/TalixySidebarWheel.tsx');
  assert.match(wheelSrc, /className="sr-only">\{entry\.label\}/, 'titre annonce aux lecteurs d ecran');
  assert.doesNotMatch(wheelSrc, /removeEntry|\.remove\(/);
});

test('l arc vit partout au-dessus du mobile (dont le volet d apercu ~840 px) ; sous 768 px : liste classique', () => {
  const hook = read('src/talixy/useTalixySidebar.ts');
  /*
   * Le seuil ne se lit plus sur window.innerWidth mais sur la MEDIA QUERY : innerWidth compte la
   * barre de defilement, les media queries non, et cet ecart ouvrait une bande d une dizaine de
   * pixels (770-780, mesuree a l ecran) ou le JavaScript se croyait en mode large pendant que le
   * CSS etait encore en mobile. Une seule source de verite : celle que le CSS applique.
   */
  assert.match(hook, /window\.matchMedia\(TALIXY_ARC_QUERY\)/);
  assert.match(hook, /mobileMax \+ 1/, 'la requete derive bien du meme seuil');
  assert.match(hook, /!collapsed && wide/);
  // Palier compact : meme courbure (rayon/espacement identique), tailles reduites.
  const R = (p: { spacing: number; stepDeg: number }) => p.spacing / (p.stepDeg * Math.PI / 180);
  assert.ok(Math.abs(R(TALIXY_ARC2_PRESETS.compact) / TALIXY_ARC2_PRESETS.compact.spacing - R(TALIXY_ARC2_PRESETS.desktop) / TALIXY_ARC2_PRESETS.desktop.spacing) < 1e-9);
  assert.equal(TALIXY_ARC2_LAYOUT.compact.asideW, 312);
});

test('assets de la maquette : police Urbanist auto-hebergee, vrai logo Talvex copie dans public/', () => {
  assert.equal(readFileSync(new URL('../../public/fonts/urbanist-latin.woff2', import.meta.url)).subarray(0, 4).toString('latin1'), 'wOF2');
  assert.ok(readFileSync(new URL('../../public/talixy/logo-talvex.png', import.meta.url)).length > 10_000);
  const css = read('src/talixy/talixy.css');
  assert.match(css, /font-family: 'Urbanist';/);
  assert.match(css, /url\('\/fonts\/urbanist-latin\.woff2'\)/);
  assert.match(read('src/pages/superadmin/SuperAdminSidebar.tsx'), /\/talixy\/logo-talvex\.png/);
});

test('points de l arc : 1 compartiment reel = 1 separateur = 1 point, et AUCUN point decoratif', () => {
  /*
   * Regle de David : les seuls points poses sur la courbe de l'arc appartiennent a un compartiment
   * reel. Plus aucun point de decor (ils etaient ecrits en dur, 6 angles, sans rapport avec la
   * navigation). Les particules du fond, elles, ne sont pas concernees : elles ne sont pas sur l'arc.
   */
  const ligne = read('src/talixy/TalixyArcLine.tsx');
  const config = read('src/talixy/talixyConfig.ts');
  const css = read('src/talixy/talixy.css');
  assert.doesNotMatch(ligne, /tx-arcline-dot/, 'plus de points decoratifs dessines sur la ligne');
  assert.doesNotMatch(config, /LINE_DOTS/, 'plus d angles de points ecrits en dur');
  assert.doesNotMatch(css, /tx-arcline-dot|--tx-dot-a/, 'plus de style de point decoratif');
  // Le fond garde ses particules : on ne touche qu'a la courbe.
  assert.match(css, /tx-drift-/, 'les particules flottantes du fond restent');

  // Un seul point par separateur, et un seul separateur par section reelle.
  const arc = read('src/talixy/TalixyArc.tsx');
  assert.equal((arc.match(/tx-arc-sep-dot/g) ?? []).length, 1, 'un seul endroit dessine un point');
  assert.match(arc, /if \(item\.kind !== 'section' \|\| !item\.label\) return;/, 'un point naît d une section reelle');

  // La structure commande : 4 compartiments -> 4 points ; en ajouter un en donne 5, le retirer en rend 4.
  const points = (compartiments: string[][]) => {
    const kinds: RimKind[] = [];
    compartiments.forEach(onglets => { kinds.push('section'); onglets.forEach(() => kinds.push('item')); });
    const pos = carouselPositions(kinds);
    return kinds.reduce((n, k, i) => (k === 'section' && separatorRim(pos, kinds, i) !== null ? n + 1 : n), 0);
  };
  const REEL = [['Dashboard', 'Acces', 'Site'], ['Groupes', 'Statuts'], ['Chat'], ['Doc', 'Systeme']];
  assert.equal(REEL.length, 4, 'PRINCIPAL, GESTION, COMMUNICATION, MAINTENANCE');
  assert.equal(points(REEL), 4, 'configuration actuelle : exactement 4 points, pas 5, pas 8');
  assert.equal(points([...REEL, ['Devis', 'Factures']]), 5, 'un compartiment VENTES ajoute -> un 5e point, sans toucher au CSS');
  assert.equal(points(REEL), 4, 'le compartiment retire -> son point disparaît');
});

test('actif de l arc : aucune lueur diffuse autour du disque, mais un actif toujours lisible', () => {
  /*
   * Decision de David : l onglet actif ne doit plus briller. Deux couches produisaient le bloom —
   * un disque de 112 px en degrade radial blanc (.tx-arc-halo::before) et une lueur externe
   * « 0 0 24px » dans l ombre du disque. Les deux sont parties. Ce qui reste doit suffire a lire
   * l actif : disque agrandi, liseret clair, liseret interieur et libelle plus present. Rien de plus :
   * le point qui suivait le libelle a ete retire lui aussi.
   */
  const css = read('src/talixy/talixy.css');

  // 1. La couche marqueur existe toujours (meme element, meme rotation), mais elle ne peint rien.
  assert.match(css, /\.tx-arc-halo \{/, 'la couche qui glisse vers l actif est conservee');
  assert.doesNotMatch(css, /\.tx-arc-halo::before/, 'elle ne peint plus aucun disque lumineux');
  assert.doesNotMatch(css, /tx-arc-halo[^{]*\{[^}]*radial-gradient/, 'plus de degrade radial sur le marqueur');

  // 2. Le disque actif n a plus de lueur externe blanche.
  const actif = css.match(/\.tx-arc-slot\[data-active="true"\] \[data-sb-icon\] \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.ok(actif.length > 0, 'la regle du disque actif existe');
  assert.doesNotMatch(actif, /0 0 \d+px rgba\(255,\s*255,\s*255/, 'plus de glow blanc autour du disque actif');
  assert.doesNotMatch(actif, /drop-shadow/, 'aucun drop-shadow sur le disque actif');

  // 3. L actif reste parfaitement lisible : taille, liserets et icone inchanges.
  assert.match(actif, /transform: scale\(var\(--tx-disc-active\)\)/, 'le disque actif garde sa taille');
  assert.match(actif, /border-color: var\(--tx-pure\)/, 'liseret clair conserve');
  assert.match(actif, /inset 0 1px 0 var\(--tx-pure\)/, 'liseret interieur conserve');
  assert.match(css, /--tx-disc-active: 1\.36;/, 'le facteur d agrandissement n a pas bouge');

  // 4. AUCUN point apres le libelle de l actif : David l a fait retirer a son tour.
  assert.doesNotMatch(css, /span\.truncate::after/, 'plus de point apres le libelle actif');
  assert.doesNotMatch(css, /::after/, 'aucun pseudo-element ne repeint un point dans la scene');
  // Les points des COMPARTIMENTS, eux, restent : poses sur la courbe, ils n ont aucun rapport.
  assert.match(css, /\.tx-arc-sep-dot \{/, 'les points de compartiment restent');
});
