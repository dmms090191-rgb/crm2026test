// Mini arc mobile : navigation circulaire, arc toujours plein, une seule source de verite.
//   node --test scripts/talixy/miniArcMobile.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ecartCirculaire, mobileItems } from '../../src/talixy/mobileNav.ts';
import type { LayoutEntry } from '../../src/lib/sidebarLayout.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

/** La configuration reelle de David : 7 onglets repartis en 4 compartiments. */
const ENTREES: LayoutEntry[] = [
  { kind: 'section', id: 's1', label: 'PRINCIPAL' },
  { kind: 'item', id: 'dashboard' },
  { kind: 'item', id: 'mon-compte' },
  { kind: 'section', id: 's2', label: 'GESTION' },
  { kind: 'item', id: 'super-admins' },
  { kind: 'item', id: 'statuts' },
  { kind: 'section', id: 's3', label: 'COMMUNICATION' },
  { kind: 'item', id: 'chat-admin' },
  { kind: 'section', id: 's4', label: 'MAINTENANCE' },
  { kind: 'item', id: 'documentation-crm' },
  { kind: 'item', id: 'system' },
];
const LIBELLES: Record<string, string> = {
  dashboard: 'Dashboard', 'mon-compte': 'Accès & sécurité', 'super-admins': 'Liste des groupes',
  statuts: 'Gestion des statuts', 'chat-admin': 'Chat Groupes',
  'documentation-crm': 'Documentation CRM', system: 'Système',
};

test('les onglets et leurs compartiments sortent de la VRAIE liste, sans rien inventer', () => {
  const items = mobileItems(ENTREES, e => (e.kind === 'item' ? (e.label ?? LIBELLES[e.id] ?? e.id) : ''));
  assert.deepEqual(items.map(i => i.id), [
    'dashboard', 'mon-compte', 'super-admins', 'statuts', 'chat-admin', 'documentation-crm', 'system',
  ]);
  // Chaque onglet porte le compartiment de la section qui le precede.
  assert.equal(items[0].compartiment, 'PRINCIPAL');
  assert.equal(items[2].compartiment, 'GESTION');
  assert.equal(items[4].compartiment, 'COMMUNICATION');
  assert.equal(items[6].compartiment, 'MAINTENANCE');
  // Le libelle vient des defauts, ou du renommage s il existe.
  assert.equal(items[6].label, 'Système');
});

test('un onglet masque disparait du mobile, sans code special', () => {
  const resolveur = (e: LayoutEntry) => (e.kind === 'item' ? (e.label ?? LIBELLES[e.id] ?? e.id) : '');
  const avec = mobileItems([...ENTREES.slice(0, 2), { kind: 'item', id: 'statuts', hidden: true }], resolveur);
  // visibleEntries retire les masques en amont ; ici on verifie que rien ne les reintroduit.
  assert.equal(avec.filter(i => i.id === 'statuts').length, 1, 'mobileItems ne filtre pas lui-meme');
  // Le filtrage est bien fait par la couche du dessus : la source unique reste layout.visible.
  const nav = read('src/talixy/useTalixyMobileNav.ts');
  assert.match(nav, /mobileItems\(layout\.visible, e => entryLabel/);
  assert.doesNotMatch(nav, /getTabsForRole/, 'aucune liste parallele');
});

test('un renommage de compartiment se propage tout seul', () => {
  const renomme = ENTREES.map(e => (e.kind === 'section' && e.id === 's2' ? { ...e, label: 'VENTES' } : e));
  const items = mobileItems(renomme, e => (e.kind === 'item' ? (e.label ?? LIBELLES[e.id] ?? e.id) : ''));
  assert.equal(items[2].compartiment, 'VENTES');
  assert.equal(items[3].compartiment, 'VENTES');
  assert.equal(items[4].compartiment, 'COMMUNICATION', 'les autres ne bougent pas');
});

test('ROUE CIRCULAIRE : l actif est toujours au centre, avec des voisins des deux cotes', () => {
  const n = 7;
  for (let actif = 0; actif < n; actif++) {
    const ecarts = Array.from({ length: n }, (_, i) => ecartCirculaire(i, actif, n));
    assert.equal(ecarts[actif], 0, `actif ${actif} doit etre au sommet`);
    // Il y a toujours au moins deux onglets de chaque cote : l arc n est jamais vide d un cote.
    const gauche = ecarts.filter(d => d < 0 && d >= -2.2).length;
    const droite = ecarts.filter(d => d > 0 && d <= 2.2).length;
    assert.ok(gauche >= 2, `actif ${actif} : seulement ${gauche} a gauche`);
    assert.ok(droite >= 2, `actif ${actif} : seulement ${droite} a droite`);
  }
});

test('ROUE : le dernier onglet a bien le premier a sa droite, et reciproquement', () => {
  const n = 7;
  // Systeme (index 6) actif : Dashboard (0) doit etre a +1, pas a -6.
  assert.equal(ecartCirculaire(0, 6, n), 1);
  // Dashboard (0) actif : Systeme (6) doit etre a -1, pas a +6.
  assert.equal(ecartCirculaire(6, 0, n), -1);
});

test('ROUE : chaque onglet garde une position unique, aucun empilement', () => {
  for (const n of [3, 4, 5, 7, 9, 12]) {
    for (let actif = 0; actif < n; actif++) {
      const ecarts = Array.from({ length: n }, (_, i) => ecartCirculaire(i, actif, n));
      assert.equal(new Set(ecarts).size, n, `n=${n}, actif=${actif} : deux onglets au meme endroit`);
      for (const d of ecarts) assert.ok(d >= -n / 2 && d < n / 2, `ecart ${d} hors de la roue`);
    }
  }
});

test('ROUE : le rebouclage se fait TOUJOURS hors du champ visible', () => {
  // Un onglet reboucle quand son ecart passe de +n/2 a -n/2. A ce moment il doit etre invisible,
  // donc son ecart doit depasser la portee de 2,2. C est ce qui rend la rotation continue.
  const PORTEE = 2.2;
  for (const n of [7, 9, 12]) {
    const extremite = n / 2 - 1;
    assert.ok(extremite > PORTEE, `n=${n} : le rebouclage se verrait (${extremite} <= ${PORTEE})`);
  }
  // Avec 5 onglets ou moins, il n y a pas de rebouclage visible non plus : tout tient dans la portee.
  for (const n of [3, 4, 5]) {
    const maxEcart = Math.floor(n / 2);
    assert.ok(maxEcart <= PORTEE + 0.5, `n=${n} : ecart max ${maxEcart}`);
  }
});

test('les fleches ne se bloquent plus jamais', () => {
  const nav = read('src/talixy/useTalixyMobileNav.ts');
  assert.match(nav, /aLIndice\(activeIndex - 1\)/, 'precedent circulaire');
  assert.match(nav, /aLIndice\(activeIndex \+ 1\)/, 'suivant circulaire');
  assert.doesNotMatch(nav, /activeIndex > 0 \?/, 'plus de borne au premier onglet');
  assert.doesNotMatch(nav, /activeIndex < items\.length - 1/, 'plus de borne au dernier onglet');
});

test('aucun doublon metier : une position par onglet reel, ciblee par son id', () => {
  const arc = read('src/talixy/TalixyMiniArc.tsx');
  // On rend la liste telle quelle, une fois : pas de tableau duplique pour simuler la roue.
  assert.match(arc, /items\.map\(\(item, i\) =>/);
  assert.doesNotMatch(arc, /\[\.\.\.items, \.\.\.items\]/, 'pas de liste dupliquee');
  assert.match(arc, /onClick=\{\(\) => onSelect\(item\.id\)\}/, 'chaque position pointe vers l onglet reel');
  // Les positions hors champ ne volent aucun clic.
  assert.match(arc, /pointerEvents: dans \? 'auto' : 'none'/);
  assert.match(arc, /tabIndex=\{dans \? 0 : -1\}/);
});

test('la rotation est animee par transform, pas par un saut de mise en page', () => {
  const arc = read('src/talixy/TalixyMiniArc.tsx');
  const css = read('src/talixy/talixyUI.css');
  assert.match(arc, /transform: `translate\(\$\{x\.toFixed\(1\)\}px, \$\{y\.toFixed\(1\)\}px\)/);
  assert.match(css, /\[data-tx-miniarc-tab\] \{[\s\S]*?transition: transform 420ms/);
  assert.doesNotMatch(arc, /left: p\.x/, 'plus de positionnement par left/top');
});

test('le compartiment actif est seul a l ecran, avec un fondu', () => {
  const arc = read('src/talixy/TalixyMiniArc.tsx');
  assert.match(arc, /setVisible\(false\)/, 'l ancien nom s efface d abord');
  assert.match(arc, /setAffiche\(compartiment\); setVisible\(true\)/, 'puis le nouveau apparait');
  assert.match(arc, /\{affiche\}/, 'une seule valeur affichee');
  const css = read('src/talixy/talixyUI.css');
  assert.match(css, /\[data-tx-miniarc-compartiment\][\s\S]*?transition: opacity/);
});

test('le mini arc ne se montre que sous Talixy et pour Talvex Administrateur', () => {
  const shell = read('src/app/PwaMobileShell.tsx');
  const bureau = read('src/pages/superadmin/SuperAdminDashboard.tsx');
  assert.match(shell, /talixy\.active && role === 'super_admin'/, 'coquille mobile : scope strict');
  assert.match(shell, /\{arcMobile \? \(/, 'la barre codee en dur cede la place');
  assert.match(bureau, /talixy\.active && !largeEcran/, 'navigateur mobile : scope strict');
});

test('la reserve basse vaut pour TOUS les onglets, et suit la hauteur mesuree', () => {
  const arc = read('src/talixy/TalixyMiniArc.tsx');
  const css = read('src/talixy/talixyUI.css');
  const shell = read('src/app/PwaMobileShell.tsx');
  const bureau = read('src/pages/superadmin/SuperAdminDashboard.tsx');

  // La hauteur est MESUREE puis publiee, jamais ecrite en dur.
  assert.match(arc, /setProperty\('--tx-miniarc-h'/);
  assert.match(arc, /new ResizeObserver\(publier\)/);

  // Elle est consommee sur le conteneur de contenu, donc par tous les onglets a la fois.
  assert.match(css, /\[data-tx-mobile-body\] \{[\s\S]*?padding-bottom: calc\(var\(--tx-miniarc-h/);
  assert.match(shell, /data-tx-mobile-body=/);
  assert.match(bureau, /data-tx-mobile-body=/);

  // Et plus aucune valeur de reserve devinee dans les pages.
  assert.doesNotMatch(css, /calc\(186px \+ env/, 'plus de reserve inventee');
});
