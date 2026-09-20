// Tests de l'etape 2 Talixy : onglet et vitrine dans la Bibliotheque, reserves a la preference personnelle
// de Talvex Administrateur pendant le prototype.
//   node --test scripts/talixy/talixyLibrary.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TALIXY_TAB, withTalixyTab } from '../../src/talixy/talixyLibrary.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'favoris', label: 'Favoris' },
  { key: 'personnels', label: 'Personnels' },
  { key: 'glass', label: 'Glass' },
];

test('onglet Talixy juste apres Favoris (Tous | Favoris | Talixy | ...), seulement si autorise', () => {
  assert.deepEqual(withTalixyTab(TABS, true, 'favoris').map(t => t.key), ['all', 'favoris', TALIXY_TAB, 'personnels', 'glass']);
  assert.deepEqual(withTalixyTab(TABS, false, 'favoris').map(t => t.key), ['all', 'favoris', 'personnels', 'glass']);
});

test('jamais en double, et place de repli si Favoris est absent', () => {
  const twice = withTalixyTab(withTalixyTab(TABS, true, 'favoris'), true, 'favoris');
  assert.equal(twice.filter(t => t.key === TALIXY_TAB).length, 1);
  assert.deepEqual(withTalixyTab([{ key: 'all', label: 'Tous' }], true, 'favoris').map(t => t.key), ['all', TALIXY_TAB]);
  assert.deepEqual(withTalixyTab([], true, 'favoris').map(t => t.key), [TALIXY_TAB]);
  // Un onglet « talixy » venu d'ailleurs disparait quand ce n'est pas autorise.
  assert.deepEqual(withTalixyTab([...TABS, { key: TALIXY_TAB, label: 'x' }], false, 'favoris').map(t => t.key), TABS.map(t => t.key));
});

test('autorisation = preference personnelle de Talvex Administrateur, jamais la portee d une entreprise (Visu comprise)', () => {
  const ctx = read('src/contexts/ThemeContext.tsx');
  assert.match(ctx, /personalScope: scope\.kind === 'sa' && canPersist/);
  const modal = read('src/components/theme/ThemeSelectorModal.tsx');
  assert.match(modal, /tabs=\{withTalixyTab\(tabs, personalScope, FAV_TAB\)\}/);
  assert.match(modal, /tab === TALIXY_TAB && personalScope \?/);
  assert.match(modal, /function activateTalixy\(\) \{\s*if \(!personalScope\) return;/);
});

test('activation par le meme chemin que les autres themes, sans aucune ecriture dans theme_config', () => {
  const modal = read('src/components/theme/ThemeSelectorModal.tsx');
  assert.match(modal, /clearCustomTheme\(\);\s*setTheme\('talixy'\);/);
  for (const file of ['src/talixy/TalixyShowcase.tsx', 'src/talixy/talixyLibrary.ts', 'src/components/theme/ThemeSelectorModal.tsx']) {
    assert.doesNotMatch(read(file), /from\('theme_config'\)/, file);
  }
  assert.doesNotMatch(read('src/components/theme/useThemeSelectorData.ts'), /talixy/i);
});

test('theme par defaut toujours inchange a l etape 2', () => {
  const ctx = read('src/contexts/ThemeContext.tsx');
  assert.match(ctx, /useState<Theme>\('dark'\)/);
  assert.match(ctx, /cachedTheme \?\? 'dark'/);
});

test('vitrine : tous les elements demandes, et uniquement les couleurs de la palette', () => {
  const src = read('src/talixy/TalixyShowcase.tsx');
  for (const text of ['TALIXY', 'Thème signature Talvex', 'Navigation 3D en arc', 'Son interface', 'Expérience immersive',
    'Palette nuit indigo', 'Activer Talixy', 'Talixy est actif']) {
    assert.ok(src.includes(text), `texte manquant : ${text}`);
  }
  assert.doesNotMatch(src, /#[0-9A-Fa-f]{3,8}\b/, 'couleur ecrite en dur dans la vitrine');
  assert.match(src, /usePrefersReducedMotion\(\)/, 'mouvement reduit respecte');
});

test('onglet Talixy visible dans la barre (il n a pas de carte de theme a compter)', () => {
  const parts = read('src/components/theme/ThemeSelectorParts.tsx');
  assert.match(parts, /!isTalixyTab && t\.key !== 'glass' && count === 0\) return null;/);
  assert.match(parts, /isTalixyTab && activeTheme === 'talixy'/);
});
