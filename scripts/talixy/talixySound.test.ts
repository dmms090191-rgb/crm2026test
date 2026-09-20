// Tests du son d'interface Talixy (reglages, branchement) et du clic unique sur un onglet de la roue.
//   node --test scripts/talixy/talixySound.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TALIXY_SOUND_DEFAULT, clampVolume, parseSoundPrefs, serializeSoundPrefs, soundGain, soundPrefsKey,
} from '../../src/talixy/talixySoundPrefs.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('son actif par defaut a 35 %', () => {
  assert.deepEqual(TALIXY_SOUND_DEFAULT, { volume: 35, muted: false });
  assert.deepEqual(parseSoundPrefs(null), { volume: 35, muted: false });
  assert.ok(soundGain(TALIXY_SOUND_DEFAULT) > 0);
});

test('reglage lu sans jamais casser : valeur abimee -> defaut, volume borne 0-100, jamais NaN', () => {
  assert.deepEqual(parseSoundPrefs('{pas du json'), { volume: 35, muted: false });
  assert.deepEqual(parseSoundPrefs('null'), { volume: 35, muted: false });
  assert.deepEqual(parseSoundPrefs('{"volume":250,"muted":true}'), { volume: 100, muted: true });
  assert.deepEqual(parseSoundPrefs('{"volume":-4}'), { volume: 0, muted: false });
  assert.deepEqual(parseSoundPrefs('{"volume":"abc","muted":"oui"}'), { volume: 35, muted: false });
  assert.equal(clampVolume(Number.NaN), 35);
  assert.equal(clampVolume(42.6), 43);
  const p = { volume: 70, muted: true };
  assert.deepEqual(parseSoundPrefs(serializeSoundPrefs(p)), p);
});

test('coupe ou volume nul : aucun son ; le volume monte le gain de facon progressive', () => {
  assert.equal(soundGain({ volume: 80, muted: true }), 0);
  assert.equal(soundGain({ volume: 0, muted: false }), 0);
  let prev = 0;
  for (let v = 5; v <= 100; v += 5) {
    const g = soundGain({ volume: v, muted: false });
    assert.ok(g > prev && g <= 1, `volume ${v} : ${g}`);
    prev = g;
  }
});

test('reglage attache au compte Auth reellement connecte (jamais a l entite visualisee)', () => {
  assert.equal(soundPrefsKey('abc'), 'talixy:sound:abc');
  const hook = read('src/talixy/useTalixySound.ts');
  assert.match(hook, /supabase\.auth\.getSession\(\)/);
  assert.match(hook, /onAuthStateChange/);
  assert.doesNotMatch(hook, /Visualization|useVisu|visualized/i, 'la Visu ne doit ni changer ni couper le reglage');
});

test('son joue au changement d onglet, seulement avec Talixy, jamais sur l onglet deja ouvert', () => {
  const sbHook = read('src/talixy/useTalixySidebar.ts');
  assert.match(sbHook, /if \(talixy\.active && view !== \(pendingView \?\? activeView\)\) sound\.play\('navigation'\);/);
  for (const file of ['src/pages/admin/Sidebar.tsx', 'src/pages/company-super-admin/CSASidebar.tsx',
    'src/pages/vendor/VendorSidebar.tsx', 'src/pages/client/ClientSidebar.tsx']) {
    assert.doesNotMatch(read(file), /useTalixySound|TalixyPlanet/, `${file} : aucune generalisation aux autres roles`);
  }
});

test('un seul clic suffit : le focus donne par un appui ne fait jamais tourner la roue', () => {
  const input = read('src/talixy/useArcInput.ts');
  assert.match(input, /const onDown = \(e: PointerEvent\) => \{\s*lastPress\.current = performance\.now\(\);/);
  assert.match(input, /if \(performance\.now\(\) - lastPress\.current < POINTER_FOCUS_WINDOW_MS\) return;/);
});
