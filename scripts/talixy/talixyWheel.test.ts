// Tests de l'etape 3 Talixy : parcours de la roue et branchement dans la sidebar Talvex Administrateur.
//   node --test scripts/talixy/talixyWheel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { edgeItem, itemIndexes, nearestItem, stepItem, wheelStep, WHEEL_INPUT } from '../../src/talixy/arcNavigation.ts';
import { arcPose, rimPositions, withOverrides, wheelRadius, type RimKind } from '../../src/talixy/arcGeometry.ts';
import { TALIXY_WHEEL_PRESETS } from '../../src/talixy/talixyConfig.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const KINDS: RimKind[] = ['section', 'item', 'item', 'divider', 'section', 'item', 'item'];
const DESKTOP = TALIXY_WHEEL_PRESETS.desktop;

/* ---------- Parcours ---------- */

test('la roue ne s arrete que sur des onglets (jamais sur un titre de compartiment ou un separateur)', () => {
  assert.deepEqual(itemIndexes(KINDS), [1, 2, 5, 6]);
  assert.equal(stepItem(2, KINDS, 1), 5);
  assert.equal(stepItem(5, KINDS, -1), 2);
  assert.equal(nearestItem(rimPositions(KINDS, DESKTOP)[3], rimPositions(KINDS, DESKTOP), KINDS), 2);
});

test('parcours borne au premier et au dernier onglet ; actif introuvable -> bord de la liste', () => {
  assert.equal(stepItem(6, KINDS, 1), 6);
  assert.equal(stepItem(1, KINDS, -1), 1);
  assert.equal(stepItem(-1, KINDS, 1), 1);
  assert.equal(stepItem(-1, KINDS, -1), 6);
  assert.equal(edgeItem(KINDS, 'first'), 1);
  assert.equal(edgeItem(KINDS, 'last'), 6);
  assert.equal(stepItem(0, ['section'], 1), -1);
});

test('molette et trackpad : cumul des petits deltas, seuil, intervalle minimal, lignes Firefox', () => {
  let s = { acc: 0, lastStepAt: 0 };
  let r = wheelStep(s, 12, 0, 1000); s = r.state; assert.equal(r.step, 0);
  r = wheelStep(s, 12, 0, 1010); s = r.state; assert.equal(r.step, 0);
  r = wheelStep(s, 30, 0, 1020); s = r.state; assert.equal(r.step, 1, '54 px cumules -> un cran');
  r = wheelStep(s, 80, 0, 1050); s = r.state; assert.equal(r.step, 0, 'trop tot apres le cran precedent');
  r = wheelStep(s, 10, 0, 1020 + WHEEL_INPUT.minIntervalMs + 1); assert.equal(r.step, 1);
  assert.equal(wheelStep({ acc: 0, lastStepAt: 0 }, -2, 1, 5000).step, -1, 'deltaMode 1 : 2 lignes vers le haut');
  assert.equal(wheelStep({ acc: 40, lastStepAt: 0 }, -20, 0, 5000).step, 0, 'changement de sens : on repart de zero');
  assert.equal(wheelStep({ acc: 0, lastStepAt: 0 }, Number.NaN, 0, 5000).step, 0);
});

test('reglages directs (rayon, pas, profondeur) : meme geometrie, pas de roue parallele', () => {
  const p = withOverrides(DESKTOP, { radius: 300, angleStep: 10, depth: 20 });
  assert.equal(p.stepDeg, 10);
  assert.ok(Math.abs(wheelRadius(p) - 300) < 1e-9);
  assert.equal(p.depthPerStep, 20);
  assert.deepEqual(withOverrides(DESKTOP, {}), DESKTOP);
  assert.equal(arcPose(0, p).transform, arcPose(0, withOverrides(p, {})).transform);
});

/* ---------- Branchement : Talvex Administrateur seulement, sans toucher au moteur ---------- */

test('TalixyArc n a aucune geometrie propre : tout passe par arcPose', () => {
  const arc = read('src/talixy/TalixyArc.tsx');
  assert.match(arc, /arcPose\(positions\[i\] - center, params, orientation\)/);
  assert.match(arc, /transform: pose\.transform/);
  assert.doesNotMatch(arc, /Math\.(cos|sin)|translateY\(|translateX\(|rotateX\(|rotateZ\(/);
  assert.match(arc, /transition: `transform \$\{ms\}ms \$\{ease\}, opacity \$\{ms\}ms \$\{ease\}`/);
});

test('SidebarLayoutControls : roue desactivee par defaut, et Reorganiser garde son affichage actuel', () => {
  const src = read('src/components/sidebar-v2/SidebarLayoutControls.tsx');
  assert.match(src, /wheel\?: boolean;/);
  assert.match(src, /renderItem, wheel = false,/);
  assert.match(src, /\{reordering \? \(\s*<>\s*\{split\.main\.map\(\(\{ entry, realIdx \}, idx\) => \(\s*<ReorderSlot/);
  assert.match(src, /\) : wheel \? \(\s*<TalixySidebarWheel rows=\{split\.main\}/);
});

test('seule la sidebar Talvex Administrateur active l arc, via le hook commun (Talixy, mouvement, hors editeur, desktop)', () => {
  const sa = read('src/pages/superadmin/SuperAdminSidebar.tsx');
  assert.match(sa, /useTalixySidebar<SAView>\(\{ activeView, onNavigate, collapsed, reordering: layout\.reordering \}\)/);
  assert.match(sa, /wheel=\{tx\.arc\}/);
  const sbHook = read('src/talixy/useTalixySidebar.ts');
  assert.match(sbHook, /talixy\.motion && !editorCtx\?\.editorOpen && !collapsed && wide/);
  for (const file of ['src/pages/admin/Sidebar.tsx', 'src/pages/company-super-admin/CSASidebar.tsx',
    'src/pages/vendor/VendorSidebar.tsx', 'src/pages/client/ClientSidebar.tsx']) {
    assert.doesNotMatch(read(file), /wheel=|talixy/i, `${file} ne doit pas activer la roue`);
  }
  const hook = read('src/talixy/useTalixy.ts');
  assert.match(hook, /motion: active && !reducedMotion/);
});

test('scene de la maquette : ligne d arc montee (JAMAIS la planete), coquille transparente sans trait', () => {
  const sa = read('src/pages/superadmin/SuperAdminSidebar.tsx');
  assert.match(sa, /\{tx\.scene && <TalixyArcLine \/>\}/);
  assert.match(sa, /data-tx-scene=\{tx\.scene \? '' : undefined\}/);
  assert.doesNotMatch(sa, /TalixyPlanet/, 'aucune planete (nouvelle reference) ; TalixyPlanet.tsx reste conserve');
  const css = read('src/talixy/talixy.css');
  assert.match(css, /\.tx-arcline \{/);
  assert.match(css, /\.tx-arc-halo/);
  assert.match(css, /backdrop-filter: none !important/);
  // Le decor ne s'anime pas : la ligne et ses points sont peints une fois.
  assert.doesNotMatch(css.match(/\.tx-arcline \{[^}]*\}/)?.[0] ?? '', /transition|animation/);
});

test('moteur de sidebar, Visu et routeur non touches par la roue', () => {
  for (const file of ['src/hooks/useSidebarLayout.ts', 'src/lib/sidebarLayout.ts', 'src/components/sidebar-v2/reorderView.ts',
    'src/contexts/VisualizationContext.tsx', 'src/app/AppDashboardRouter.tsx']) {
    assert.doesNotMatch(read(file), /talixy|wheel/i, file);
  }
});

test('mouvement reduit force uniquement pour les tests Playwright', () => {
  assert.match(read('playwright.config.ts'), /reducedMotion: 'reduce',/);
  assert.doesNotMatch(read('src/talixy/useTalixy.ts'), /reducedMotion\s*=\s*true|return true/);
});
