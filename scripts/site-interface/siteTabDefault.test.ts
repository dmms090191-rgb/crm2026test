// Onglet « Site » visible par defaut pour les Groupes et les Societes, sans casser les preferences enregistrees.
//   node --test scripts/site-interface/siteTabDefault.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultEntries, reconcileLayout, visibleEntries, toggleHiddenEntry, toLayout } from '../../src/lib/sidebarLayout.ts';
import type { LayoutDefaultSection, LayoutEntry, LayoutItem } from '../../src/lib/sidebarLayout.ts';

/* Ligne de definition de l'onglet 'site' dans les defauts reels d'un panel (fichier source). */
function siteDefinition(file: string): string {
  const line = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    .split('\n').find(l => /\{\s*id:\s*'site'\s*,\s*label:\s*'Site'/.test(l));
  assert.ok(line, `definition de l'onglet Site introuvable dans ${file}`);
  return line;
}

test('defauts reels : Site visible pour la Societe et pour le Groupe', () => {
  assert.doesNotMatch(siteDefinition('src/pages/admin/Sidebar.tsx'), /hidden\s*:\s*true/);
  assert.doesNotMatch(siteDefinition('src/pages/company-super-admin/CSASidebar.tsx'), /hidden\s*:\s*true/);
});

const SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [{ id: 'vue-ensemble', label: 'Dashboard' }, { id: 'site', label: 'Site' }, { id: 'logo', label: 'Logo', hidden: true }] },
];
const ENTITY = 'aaaaaaaa-0000-4000-8000-000000000001';
const isSiteVisible = (entries: LayoutEntry[]) => visibleEntries(entries).some(e => e.kind === 'item' && e.id === 'site');

test('nouvelle Societe (aucune preference) : Site visible', () => {
  const entries = reconcileLayout(defaultEntries(SECTIONS), null, 'admin', ENTITY);
  assert.equal(isSiteVisible(entries), true);
});

test('preference explicite enregistree : Site masque par Talvex reste masque', () => {
  const defaults = defaultEntries(SECTIONS);
  const siteIndex = defaults.findIndex(e => e.kind === 'item' && e.id === 'site');
  const hiddenByTalvex = toggleHiddenEntry(defaults, siteIndex);
  assert.equal((hiddenByTalvex[siteIndex] as LayoutItem).hidden, true, 'le masquage reste possible');
  const saved = toLayout(hiddenByTalvex, 'admin', ENTITY);
  assert.equal(isSiteVisible(reconcileLayout(defaults, saved, 'admin', ENTITY)), false);
});

test('preference enregistree visible (cas reel Societe et Groupe) : Site reste visible et reste masquable', () => {
  const defaults = defaultEntries(SECTIONS);
  const savedVisible = toLayout(defaults, 'company_super_admin', ENTITY);
  const entries = reconcileLayout(defaults, savedVisible, 'company_super_admin', ENTITY);
  assert.equal(isSiteVisible(entries), true);
  const idx = entries.findIndex(e => e.kind === 'item' && e.id === 'site');
  assert.equal(isSiteVisible(toggleHiddenEntry(entries, idx)), false);
});
