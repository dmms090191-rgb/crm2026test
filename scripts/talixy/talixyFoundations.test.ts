// Tests des fondations Talixy : declaration complete du theme, source unique des couleurs et du mouvement,
// feuille de style strictement limitee a Talixy, contrastes lisibles.
//   node --test scripts/talixy/talixyFoundations.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TALIXY_PALETTE, TALIXY_ROLES, TALIXY_MODULE_HUES } from '../../src/talixy/talixyPalette.ts';
import { TALIXY_CLAIR } from '../../src/talixy/talixyPaletteClair.ts';
import { TALIXY_MOTION } from '../../src/talixy/talixyConfig.ts';
import { buildTalixyTokens } from '../../src/lib/themeTokensTalixy.ts';
import { buildTalixyClairTokens } from '../../src/lib/themeTokensTalixyClair.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const CSS = read('src/talixy/talixy.css');
/** Couche de design du contenu (pages, champs, boutons, menus) : memes regles de cloisonnement. */
const CSS_UI = read('src/talixy/talixyUI.css');
const kebab = (s: string) => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

/* ---------- Declaration : un oubli a un seul endroit provoque un flash ou un retour silencieux a 'dark' ---------- */

test('Talixy est declare partout ou un theme doit l etre (type, fonds, validation, tokens, bibliotheque, anti-flash)', () => {
  const types = read('src/contexts/themeTypes.ts');
  assert.match(types, /\|\s*'glass'\s*\|\s*'talixy';/, 'type Theme');
  assert.match(types, /talixy:\s*'#AEB8C7'/, 'THEME_BG');
  assert.match(read('src/contexts/themeScope.ts'), /'glass',\s*'talixy',\s*\n\];/, 'VALID_THEMES');
  assert.match(read('src/lib/themeTokens.ts'), /talixy:\s*buildTalixyClairTokens\(TALIXY_CLAIR\)/, 'tokenMap');
  // La variante « Nuit indigo » reste presente dans le code, non branchee (masquer, jamais supprimer).
  assert.match(read('src/lib/themeTokens.ts'), /buildTalixyTokens/, 'variante Nuit indigo conservee');
  assert.match(read('src/components/theme/themeData.ts'), /value:\s*'talixy'/, 'ALL_THEMES');
  assert.match(read('index.html'), /talixy:'#AEB8C7'\}/, 'table anti-flash de index.html');
  assert.match(read('src/main.tsx'), /import '\.\/talixy\/talixy\.css';/, 'feuille de style chargee');
});

test('le fond anti-flash, THEME_BG et la feuille de style utilisent le meme gris bleute (maquette)', () => {
  assert.equal(TALIXY_CLAIR.mist, '#AEB8C7');
  assert.match(CSS, /html\[data-theme="talixy"\] \{[\s\S]{0,160}background: #AEB8C7;/);
});

test('garde-fou landing (E0) : anti-flash conditionne a une session, data-theme retire hors tableau de bord', () => {
  const html = read('index.html');
  assert.match(html, /sessionStorage/, "l'anti-flash regarde la session");
  assert.match(html, /hasSession\?localStorage\.getItem\('crm_theme_last'\):null/);
  const ctx = read('src/contexts/ThemeContext.tsx');
  assert.match(ctx, /if \(!dashboardHost\) \{/);
  assert.match(ctx, /removeAttribute\('data-theme'\)/);
  assert.match(read('src/app/AppShell.tsx'), /dashboardHost>/, 'AppShell marque les tableaux de bord');
  // Les montages publics d'App.tsx ne posent JAMAIS le marqueur.
  assert.doesNotMatch(read('src/App.tsx'), /dashboardHost/);
});

test('etape 1 invisible : le theme par defaut reste inchange (aucun basculement automatique)', () => {
  const ctx = read('src/contexts/ThemeContext.tsx');
  assert.match(ctx, /useState<Theme>\('dark'\)/);
  assert.match(ctx, /cachedTheme \?\? 'dark'/);
  assert.doesNotMatch(ctx, /talixy/i);
});

/* ---------- Source unique : la palette et la configuration ---------- */

test('variables CSS identiques a la palette (aucune couleur dupliquee qui pourrait diverger)', () => {
  for (const [key, hex] of Object.entries(TALIXY_CLAIR)) {
    const m = CSS.match(new RegExp(`--tx-${kebab(key)}:\\s*(#[0-9A-Fa-f]{6});`));
    assert.ok(m, `variable --tx-${kebab(key)} absente`);
    assert.equal(m![1].toUpperCase(), hex.toUpperCase(), `--tx-${kebab(key)}`);
  }
});

test('durees et courbe CSS identiques a la configuration du mouvement', () => {
  const pairs: [string, number][] = [
    ['nav-ms', TALIXY_MOTION.navMs], ['ring-delay-ms', TALIXY_MOTION.ringDelayMs], ['ring-ms', TALIXY_MOTION.ringMs],
    ['hover-ms', TALIXY_MOTION.hoverMs], ['modal-in-ms', TALIXY_MOTION.modalInMs], ['modal-out-ms', TALIXY_MOTION.modalOutMs],
    ['view-enter-ms', TALIXY_MOTION.viewEnterMs],
  ];
  for (const [name, ms] of pairs) assert.match(CSS, new RegExp(`--tx-${name}:\\s*${ms}ms;`), `--tx-${name}`);
  assert.ok(CSS.includes(`--tx-ease-out: ${TALIXY_MOTION.easeOut};`));
  assert.match(CSS, new RegExp(`--tx-motion-scale:\\s*${TALIXY_MOTION.mobileFactor};`));
});

test('roles officiels et couleurs de module pointent vers des couleurs existantes de la palette', () => {
  for (const [role, key] of [...Object.entries(TALIXY_ROLES), ...Object.entries(TALIXY_MODULE_HUES)]) {
    assert.ok(key in TALIXY_PALETTE, `${role} -> ${key}`);
  }
  for (const role of ['primary', 'secondary', 'accent', 'glow', 'surface', 'surfaceActive', 'text', 'textMuted', 'danger', 'success', 'warning']) {
    assert.ok(role in TALIXY_ROLES, `role ${role}`);
  }
});

test('aucune couleur ecrite en dur dans les tokens : tout vient de la palette', () => {
  const src = read('src/lib/themeTokensTalixy.ts');
  const body = src.slice(src.indexOf('export function buildTalixyTokens'));
  assert.doesNotMatch(body, /#[0-9A-Fa-f]{3,8}\b/);
  assert.doesNotMatch(body, /rgba?\(/);
});

/* ---------- Feuille de style : jamais hors de Talixy, jamais sur la landing ---------- */

/** Extrait les selecteurs d'une feuille, hors commentaires, @regles et etapes de @keyframes. */
function selectorsOf(css: string): string[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
    .map(m => m[1].trim())
    .filter(s => !s.startsWith('@'))
    .filter(s => !/^(from|to|[0-9.]+%)$/.test(s));
}

test('chaque regle CSS est limitee a html[data-theme="talixy"], sans selecteur d element global', () => {
  // Les DEUX feuilles Talixy sont soumises a la meme regle : la scene et la couche de contenu.
  for (const [nom, css] of [['talixy.css', CSS], ['talixyUI.css', CSS_UI]] as const) {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 3, `${nom} : aucune regle lue`);
    for (const group of selectors) {
      for (const sel of group.split(',').map(s => s.trim())) {
        assert.ok(sel.startsWith('html[data-theme="talixy"]'), `${nom} : selecteur non limite a Talixy : ${sel}`);
        // Interdit le NOM D'ELEMENT isole (« ... main », « aside.x »), pas un nom de classe qui
        // contiendrait le mot (« .tx-page-body » est une classe, pas l'element body).
        assert.doesNotMatch(
          sel,
          /(^|[\s>+~])(nav|aside|header|main|body)([\s>+~.:[]|$)/,
          `${nom} : selecteur d'element global : ${sel}`,
        );
      }
    }
  }
  // La couche de contenu doit etre chargee, sinon elle ne s'applique nulle part.
  assert.match(read('src/main.tsx'), /import '\.\/talixy\/talixyUI\.css';/);
});

test('mouvement reduit prevu des l etape 1 (animations retirees des elements .tx-anim)', () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html\[data-theme="talixy"\] \.tx-anim \{/);
  assert.match(CSS, /animation: none !important;/);
});

/* ---------- Tokens : complets et lisibles ---------- */

function luminance(hex: string): number {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('tokens complets : aucune valeur vide ou indefinie (variantes claire ET nuit)', () => {
  for (const tokens of [buildTalixyClairTokens(TALIXY_CLAIR), buildTalixyTokens(TALIXY_PALETTE)] as unknown as Record<string, unknown>[]) {
  const walk = (v: unknown, path: string) => {
    if (v && typeof v === 'object') for (const [k, w] of Object.entries(v)) walk(w, `${path}.${k}`);
    else assert.ok(v !== undefined && v !== '' && !String(v).includes('undefined'), `${path} = ${String(v)}`);
  };
  walk(tokens, 'tokens');
  }
});

test('contrainte dure : les tokens concatenes ${token}NN restent des hexadecimaux 6 chiffres', () => {
  const t = buildTalixyClairTokens(TALIXY_CLAIR);
  for (const [name, v] of [
    ['surface.primary', t.surface.primary], ['surface.secondary', t.surface.secondary],
    ['accent.text', t.accent.text], ['text.quaternary', t.text.quaternary],
    ['topbar.notifPillBg', t.topbar.notifPillBg], ['sidebar.divider', t.sidebar.divider],
    ['chat.listBg', t.chat.listBg],
  ] as const) {
    assert.match(v, /^#[0-9A-Fa-f]{6}$/, name);
  }
});

test('contrastes lisibles du texte sombre sur les surfaces claires (WCAG AA 4,5:1)', () => {
  const t = buildTalixyClairTokens(TALIXY_CLAIR);
  const P = TALIXY_CLAIR;
  const pairs: [string, string, string][] = [
    ['text.primary / carte', t.text.primary, P.card],
    ['text.primary / surface', t.text.primary, t.surface.primary],
    ['heading.primary / zone claire', t.heading.primary, P.veil],
    ['text.secondary / carte', t.text.secondary, P.card],
    ['text.tertiary / horizon', t.text.tertiary, P.horizon],
    ['accent.text / carte', t.accent.text, P.card],
    ['text.link / carte', t.text.link, P.card],
    ['danger / carte', t.danger.text, P.card],
    ['success / carte', t.success.text, P.card],
    ['warning / carte', t.warning.text, P.card],
    ['modal.title / modal', t.modal.title, '#EFF3FA'],
  ];
  for (const [name, fg, bg] of pairs) {
    const r = contrast(fg, bg);
    assert.ok(r >= 4.5, `${name} : ${r.toFixed(2)}:1`);
  }
  // Navigation : libelles lumineux sur la zone assombrie par le vignettage (>= 3:1, grand texte /
  // elements d'interface — c'est le procede de la maquette elle-meme, valide par David).
  assert.ok(contrast(P.lumen, P.edge) >= 3, `libelle de navigation : ${contrast(P.lumen, P.edge).toFixed(2)}:1`);
});
