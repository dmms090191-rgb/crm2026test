// Tests de la roue Talixy : vraie geometrie circulaire (module pur, aucun navigateur).
//   node --test scripts/talixy/arcGeometry.test.ts
//
// Ces tests verrouillent l'exigence centrale : une VRAIE roue (pas un faux arc, pas un translateY de liste).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arcPose, opacityAt, parkDelta, presetNameFor, resolveCenter, rimPositions, transitionMs, visibleWindow,
  wheelPivot, wheelRadius, wheelTurnDeg, type ArcOrientation,
} from '../../src/talixy/arcGeometry.ts';
import {
  TALIXY_BREAKPOINTS, TALIXY_MOTION, TALIXY_WHEEL_PRESETS, TALIXY_WHEEL_REFERENCE, type WheelParams,
} from '../../src/talixy/talixyConfig.ts';

const DESKTOP = TALIXY_WHEEL_PRESETS.desktop;
const PRESETS = Object.entries(TALIXY_WHEEL_PRESETS) as [string, WheelParams][];
const ORIENTATIONS: ArcOrientation[] = ['vertical', 'horizontal'];

/* ---------- Petite algebre CSS : on recompose la transformation comme le navigateur ---------- */
type M = number[][];
const I = (): M => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul = (a: M, b: M): M => a.map((r, i) => b[0].map((_, j) => r.reduce((s, _v, k) => s + a[i][k] * b[k][j], 0)));
const rad = (d: number) => (d * Math.PI) / 180;
function fn(name: string, args: number[]): M {
  const [a, b, c] = args;
  switch (name) {
    case 'translate3d': return [[1, 0, 0, a], [0, 1, 0, b], [0, 0, 1, c], [0, 0, 0, 1]];
    case 'rotateZ': { const t = rad(a); return [[Math.cos(t), -Math.sin(t), 0, 0], [Math.sin(t), Math.cos(t), 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; }
    case 'rotateX': { const t = rad(a); return [[1, 0, 0, 0], [0, Math.cos(t), -Math.sin(t), 0], [0, Math.sin(t), Math.cos(t), 0], [0, 0, 0, 1]]; }
    case 'rotateY': { const t = rad(a); return [[Math.cos(t), 0, Math.sin(t), 0], [0, 1, 0, 0], [-Math.sin(t), 0, Math.cos(t), 0], [0, 0, 0, 1]]; }
    case 'scale': return [[a, 0, 0, 0], [0, a, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    default: throw new Error(`fonction CSS inattendue : ${name}`);
  }
}
function parse(transform: string): { name: string; args: number[] }[] {
  return [...transform.matchAll(/(\w+)\(([^)]*)\)/g)].map(m => ({
    name: m[1],
    args: m[2].split(',').map(s => parseFloat(s)),
  }));
}
const compose = (list: { name: string; args: number[] }[]) => list.reduce((acc, f) => mul(acc, fn(f.name, f.args)), I());
const origin = (m: M) => ({ x: m[0][3], y: m[1][3], z: m[2][3] });
/* Ce que fait le navigateur entre deux listes de meme structure : interpolation fonction par fonction. */
function interpolate(from: string, to: string, t: number) {
  const a = parse(from); const b = parse(to);
  return a.map((f, i) => ({ name: f.name, args: f.args.map((v, k) => v + (b[i].args[k] - v) * t) }));
}

test('actif au foyer : transformation exactement neutre (texte net), pour tous les presets et orientations', () => {
  for (const [name, p] of PRESETS) {
    for (const o of ORIENTATIONS) {
      const pose = arcPose(0, p, o);
      const m = compose(parse(pose.transform));
      m.forEach((row, i) => row.forEach((v, j) => assert.ok(Math.abs(v - (i === j ? 1 : 0)) < 1e-9, `${name}/${o} [${i}][${j}] = ${v}`)));
      assert.deepEqual([pose.x, pose.y, pose.z, pose.opacity, pose.scale], [0, 0, 0, 1, 1]);
    }
  }
});

test('meme liste de fonctions CSS pour toutes les cases : le navigateur interpole les angles', () => {
  for (const o of ORIENTATIONS) {
    const signature = (d: number) => parse(arcPose(d, DESKTOP, o).transform).map(f => f.name).join(' ');
    const ref = signature(0);
    for (let d = -8; d <= 8; d += 0.5) assert.equal(signature(d), ref, `d=${d} (${o})`);
  }
  assert.doesNotMatch(arcPose(0, DESKTOP).transform, /none/);
});

test('chaque element est sur le cercle de la roue, et la transformation CSS le place exactement la', () => {
  for (const [name, p] of PRESETS) {
    for (const o of ORIENTATIONS) {
      const C = wheelPivot(p, o);
      const R = wheelRadius(p);
      for (let d = -5; d <= 5; d += 0.25) {
        const pose = arcPose(d, p, o);
        assert.ok(Math.abs(Math.hypot(pose.x - C.x, pose.y - C.y) - R) < 0.02, `${name}/${o} d=${d} hors du cercle`);
        const at = origin(compose(parse(pose.transform)));
        assert.ok(Math.abs(at.x - pose.x) < 0.02 && Math.abs(at.y - pose.y) < 0.02 && Math.abs(at.z - pose.z) < 0.02,
          `${name}/${o} d=${d} : CSS ${JSON.stringify(at)} vs pose ${pose.x},${pose.y},${pose.z}`);
      }
    }
  }
});

test('changement d actif : chaque element voyage SUR la jante (pas en ligne droite), meme pour un saut de 3 crans', () => {
  const C = wheelPivot(DESKTOP);
  const R = wheelRadius(DESKTOP);
  for (const [from, to] of [[0, 3], [-2, 1], [1, -1], [4, 0]]) {
    const a = arcPose(from, DESKTOP).transform;
    const b = arcPose(to, DESKTOP).transform;
    for (let t = 0.1; t < 1; t += 0.1) {
      const at = origin(compose(interpolate(a, b, t)));
      assert.ok(Math.abs(Math.hypot(at.x - C.x, at.y - C.y) - R) < 0.05, `de ${from} a ${to}, t=${t.toFixed(1)} : hors de la jante`);
    }
  }
  // Une simple translation (corde) couperait l'arc : au milieu d'un saut de 3 crans, l'ecart depasse 3 px.
  const p0 = arcPose(0, DESKTOP); const p3 = arcPose(3, DESKTOP);
  const chordMid = { x: (p0.x + p3.x) / 2, y: (p0.y + p3.y) / 2 };
  assert.ok(R - Math.hypot(chordMid.x - C.x, chordMid.y - C.y) > 3);
});

test('geometrie calee sur la video de reference (decalages mesures a +/- 2 px)', () => {
  const { spacing, byStep } = TALIXY_WHEEL_REFERENCE.measuredOffsets;
  const ref: WheelParams = { ...DESKTOP, spacing, hub: 'right' };
  for (const [step, measured] of Object.entries(byStep)) {
    const x = arcPose(Number(step), ref).x;
    assert.ok(Math.abs(x - measured) <= 2, `cran ${step} : ${x.toFixed(1)} px, mesure ${measured} px`);
  }
  // Asymetrie de la reference : au-dessus, les voisins partent plus vite vers la droite.
  assert.ok(arcPose(-2, ref).x > arcPose(2, ref).x);
  assert.ok(Math.abs(wheelRadius(DESKTOP) / DESKTOP.spacing - TALIXY_WHEEL_REFERENCE.radiusPerSpacing) < 0.05);
  assert.equal(DESKTOP.stepDeg, 11.7);
});

test('moyeu a gauche (image de reference) : miroir EXACT de la roue de la video, rien d autre ne change', () => {
  assert.equal(DESKTOP.hub, 'left');
  for (const [name, p] of PRESETS) {
    const right: WheelParams = { ...p, hub: 'right' };
    for (let d = -6; d <= 6; d += 0.5) {
      const l = arcPose(d, p); const r = arcPose(d, right);
      assert.ok(Math.abs(l.x + r.x) < 1e-6, `${name} d=${d} : x ${l.x} / ${r.x}`);
      assert.deepEqual([l.y, l.z, l.scale, l.opacity, l.tiltDeg, l.zIndex], [r.y, r.z, r.scale, r.opacity, r.tiltDeg, r.zIndex]);
      assert.ok(Math.abs(l.turnDeg + r.turnDeg) < 1e-6, `${name} d=${d} : rotation du libelle en miroir`);
    }
    // Les voisins repartent vers la gauche, en suivant la jante de la planete.
    if (p.stepDeg > 5) for (const d of [-2, -1, 1, 2]) assert.ok(arcPose(d, p).x < 0, `${name} d=${d}`);
  }
  // La roue horizontale (onglets) n'est pas concernee par le miroir.
  assert.equal(arcPose(2, DESKTOP, 'horizontal').transform, arcPose(2, { ...DESKTOP, hub: 'right' }, 'horizontal').transform);
});

test('rotation de toute la roue autour du moyeu (lunes de la planete) : meme sens que les onglets', () => {
  const C = wheelPivot(DESKTOP);
  const angle = (d: number) => { const p = arcPose(d, DESKTOP); return Math.atan2(p.y - C.y, p.x - C.x) * 180 / Math.PI; };
  // Quand le centre passe de 0 a 1 cran, chaque onglet tourne exactement de wheelTurnDeg(1) - wheelTurnDeg(0).
  const turn = wheelTurnDeg(1, DESKTOP) - wheelTurnDeg(0, DESKTOP);
  for (const pos of [1, 2, 3]) {
    let delta = angle(pos - 1) - angle(pos);
    delta = ((delta + 540) % 360) - 180;
    assert.ok(Math.abs(delta - turn) < 1e-3, `onglet ${pos} : ${delta} vs ${turn}`); // positions arrondies au millieme de px
  }
  assert.equal(wheelTurnDeg(Number.NaN, DESKTOP), 0);
});

test('profondeur, bascule et taille : l actif est le plus proche, le plus grand, les voisins reculent', () => {
  for (const [name, p] of PRESETS) {
    let prevZ = 0; let prevS = 1;
    for (let k = 1; k <= 6; k++) {
      for (const d of [k, -k]) {
        const pose = arcPose(d, p);
        assert.ok(pose.z <= prevZ && pose.z >= -p.depthMax, `${name} d=${d} z=${pose.z}`);
        assert.ok(pose.scale <= prevS && pose.scale >= p.scaleMin, `${name} d=${d} scale=${pose.scale}`);
        assert.ok(Math.abs(pose.tiltDeg) <= p.tiltMaxDeg);
      }
      prevZ = arcPose(k, p).z; prevS = arcPose(k, p).scale;
    }
  }
  // Vertical : au-dessus, le haut s'eloigne ; au-dessous, le bas s'eloigne (bascule de signe oppose).
  assert.ok(arcPose(-2, DESKTOP).tiltDeg > 0 && arcPose(2, DESKTOP).tiltDeg < 0);
});

test('opacite progressive, plus rapide au-dessus, et disparition des elements eloignes', () => {
  assert.equal(opacityAt(0, DESKTOP), 1);
  for (const side of [-1, 1]) {
    let prev = 1;
    for (let k = 0.25; k <= 6; k += 0.25) {
      const o = opacityAt(side * k, DESKTOP);
      assert.ok(o <= prev + 1e-9, `cote ${side}, ${k} crans : ${o} > ${prev}`);
      prev = o;
    }
  }
  for (let k = 1; k <= 4; k++) assert.ok(opacityAt(-k, DESKTOP) < opacityAt(k, DESKTOP));
  const far = arcPose(DESKTOP.windowSteps + 0.5, DESKTOP);
  assert.equal(far.opacity, 0);
  assert.equal(far.visible, false);
  assert.ok(arcPose(1, DESKTOP).zIndex > arcPose(3, DESKTOP).zIndex);
});

test('elements hors fenetre gares au bord de la jante (jamais un tour de roue), et jamais de NaN', () => {
  const lim = DESKTOP.windowSteps + 1;
  assert.equal(parkDelta(27, DESKTOP.windowSteps), lim);
  assert.equal(parkDelta(-27, DESKTOP.windowSteps), -lim);
  assert.equal(parkDelta(Number.NaN, DESKTOP.windowSteps), lim);
  assert.equal(arcPose(27, DESKTOP).transform, arcPose(lim, DESKTOP).transform);
  const lost = arcPose(Number.NaN, DESKTOP);
  assert.doesNotMatch(lost.transform, /NaN|Infinity/);
  assert.equal(lost.visible, false);
});

test('positions sur la jante : onglets, titres de compartiment, separateurs ; mode reduit sans titres', () => {
  assert.deepEqual(rimPositions(['section', 'item', 'item', 'divider', 'item'], DESKTOP), [0, 0.6, 1.6, 2.6, 3]);
  const collapsed = TALIXY_WHEEL_PRESETS.collapsed;
  assert.deepEqual(rimPositions(['section', 'item', 'section', 'item'], collapsed), [0, 0, 1, 1]);
});

test('centre de la roue : actif introuvable (onglet masque) -> dernier centre connu', () => {
  const pos = [0, 0.6, 1.6];
  assert.equal(resolveCenter(pos, 2, 99), 1.6);
  assert.equal(resolveCenter(pos, -1, 0.6), 0.6);
  assert.equal(resolveCenter(pos, 7, 0.6), 0.6);
});

test('duree de rotation : 280 ms, plus 20 ms par cran supplementaire, 380 ms au plus', () => {
  assert.equal(transitionMs(1, TALIXY_MOTION), 280);
  assert.equal(transitionMs(-3, TALIXY_MOTION), 320);
  assert.equal(transitionMs(20, TALIXY_MOTION), 380);
  assert.equal(transitionMs(Number.NaN, TALIXY_MOTION), 280);
});

test('preset selon la largeur de fenetre et le mode reduit', () => {
  const bp = TALIXY_BREAKPOINTS;
  assert.equal(presetNameFor(1920, false, bp), 'desktop');
  assert.equal(presetNameFor(1280, false, bp), 'laptop');
  assert.equal(presetNameFor(900, false, bp), 'tablet');
  assert.equal(presetNameFor(390, false, bp), 'mobile');
  assert.equal(presetNameFor(1920, true, bp), 'collapsed');
});

test('fenetre visible calculee sur la place reelle (et plafonnee par windowSteps)', () => {
  const big = visibleWindow(2000, 2000, DESKTOP);
  assert.deepEqual(big, { above: Math.floor(DESKTOP.windowSteps), below: Math.floor(DESKTOP.windowSteps) });
  const small = visibleWindow(80, 140, DESKTOP);
  assert.ok(small.above < small.below && small.below <= 3);
  assert.deepEqual(visibleWindow(0, 0, DESKTOP), { above: 0, below: 0 });
});

test('orientation horizontale (onglets) : meme roue tournee, les voisins partent vers le haut', () => {
  for (const d of [-3, -2, -1, 1, 2, 3]) {
    const pose = arcPose(d, DESKTOP, 'horizontal');
    assert.equal(Math.sign(pose.x), Math.sign(d));
    assert.ok(pose.y < 0, `d=${d} : y=${pose.y}`);
  }
});
