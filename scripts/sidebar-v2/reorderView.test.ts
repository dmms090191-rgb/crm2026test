/**
 * Tests de la COUCHE VUE du mode Reorganiser (regroupement + filtre).
 * Lancer :  npx tsx scripts/sidebar-v2/reorderView.test.ts
 *
 * Ce qui est verifie : le regroupement visuel ne change AUCUNE donnee, et la
 * traduction index affiche -> index reel fait toujours agir sur la bonne entree.
 */
import { splitDisplayRows, flatRows, resolveDrop, hasHiddenItems } from '../../src/components/sidebar-v2/reorderView';
import { defaultEntries, moveEntry, toggleHiddenEntry, visibleEntries } from '../../src/lib/sidebarLayout';
import type { LayoutEntry, LayoutDefaultSection, LayoutItem } from '../../src/lib/sidebarLayout';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};
const ids = (l: LayoutEntry[]) => l.map(e => `${e.kind}:${e.id}`);
const rowIds = (r: { entry: LayoutEntry }[]) => r.map(x => `${x.entry.kind}:${x.entry.id}`);

const SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] },
  { title: 'Autre', items: [{ id: 'd', label: 'D' }, { id: 'e', label: 'E' }] },
];
const BASE = defaultEntries(SECTIONS);
const idxOf = (l: LayoutEntry[], id: string) => l.findIndex(e => e.kind === 'item' && e.id === id);
const item = (l: LayoutEntry[], id: string) => l.find(e => e.kind === 'item' && e.id === id) as LayoutItem;

// b (au milieu) et d masques
let E = toggleHiddenEntry(BASE, idxOf(BASE, 'b'));
E = toggleHiddenEntry(E, idxOf(E, 'd'));

console.log('\n=== 1. REGROUPEMENT VISUEL : LES MASQUES EN BAS ===');
{
  const avant = JSON.stringify(E);
  const s = splitDisplayRows(E, true);
  t('main ne contient AUCUN onglet masque',
    !s.main.some(r => r.entry.kind === 'item' && r.entry.hidden));
  t('hidden ne contient QUE des onglets masques',
    s.hidden.length === 2 && s.hidden.every(r => r.entry.kind === 'item' && r.entry.hidden === true));
  t('b et d sont dans la zone du bas', rowIds(s.hidden).join() === 'item:b,item:d');
  t('entries STRICTEMENT inchangees par le regroupement', JSON.stringify(E) === avant);
  t('aucune entree perdue', s.main.length + s.hidden.length === E.length);
  t('main garde l ordre reel',
    rowIds(s.main).join() === 'section:sec_def_principal,item:a,item:c,divider:div_def_principal,section:sec_def_autre,item:e');
  t('b reste a sa VRAIE position dans entries', idxOf(E, 'b') === 2);
}

console.log('\n=== 2. COMPARTIMENTS ET SEPARATEURS NE DESCENDENT JAMAIS ===');
{
  // tous les onglets masques : les compartiments/separateurs doivent rester en haut
  const tous = ['a', 'b', 'c', 'd', 'e'].reduce((acc, id) => {
    const i = idxOf(acc, id);
    return item(acc, id).hidden ? acc : toggleHiddenEntry(acc, i);
  }, E);
  const s = splitDisplayRows(tous, true);
  t('tous onglets masques : main ne contient que compartiments et separateurs',
    s.main.length === tous.filter(e => e.kind !== 'item').length && s.main.length === 3);
  t('aucun compartiment dans la zone des masques',
    !s.hidden.some(r => r.entry.kind === 'section'));
  t('aucun separateur dans la zone des masques',
    !s.hidden.some(r => r.entry.kind === 'divider'));
  t('compartiment vide conserve en haut', rowIds(s.main).includes('section:sec_def_autre'));
  t('separateur conserve en haut', rowIds(s.main).includes('divider:div_def_principal'));
}

console.log('\n=== 3. LE BOUTON GLOBAL NE TOUCHE AUCUNE DONNEE ===');
{
  const avant = JSON.stringify(E);
  const s = splitDisplayRows(E, true);
  const cache = flatRows(s, false);
  const affiche = flatRows(s, true);
  t('entries inchangees', JSON.stringify(E) === avant);
  t('masques caches : seule la zone principale est rendue', cache.length === s.main.length);
  t('masques affiches : les deux zones sont rendues', affiche.length === E.length);
  t('les masques sont bien APRES les autres', rowIds(affiche).slice(-2).join() === 'item:b,item:d');
  t('hasHiddenItems', hasHiddenItems(E) === true && hasHiddenItems(BASE) === false);
  t('hors Reorganiser aucun regroupement', splitDisplayRows(E, false).hidden.length === 0);
}

console.log('\n=== 4. MASQUER FAIT DESCENDRE, DEMASQUER FAIT REMONTER ===');
{
  // masquer 'a' (visible, en haut)
  const apresMasquage = toggleHiddenEntry(E, idxOf(E, 'a'));
  const s1 = splitDisplayRows(apresMasquage, true);
  t('l onglet masque descend VISUELLEMENT en bas', rowIds(s1.hidden).includes('item:a'));
  t('il quitte la zone principale', !rowIds(s1.main).includes('item:a'));
  t('sa VRAIE position ne bouge pas', idxOf(apresMasquage, 'a') === idxOf(E, 'a'));
  t('l ordre reel complet est identique', ids(apresMasquage).join() === ids(E).join());

  // demasquer 'b' (masque, au milieu des donnees)
  const apresDemasquage = toggleHiddenEntry(E, idxOf(E, 'b'));
  const s2 = splitDisplayRows(apresDemasquage, true);
  t('l onglet demasque remonte dans la zone principale', rowIds(s2.main).includes('item:b'));
  t('il quitte la zone des masques', !rowIds(s2.hidden).includes('item:b'));
  t('il retrouve sa VRAIE position, entre a et c',
    rowIds(s2.main).join() === 'section:sec_def_principal,item:a,item:b,item:c,divider:div_def_principal,section:sec_def_autre,item:e');
  t('aucune reconstruction : entries strictement identique en ordre', ids(apresDemasquage).join() === ids(E).join());
}

console.log('\n=== 5. REALIDX RESTE CORRECT MALGRE LE REGROUPEMENT ===');
{
  const s = splitDisplayRows(E, true);
  t('chaque ligne de main pointe la bonne entree', s.main.every(r => E[r.realIdx] === r.entry));
  t('chaque ligne de hidden pointe la bonne entree', s.hidden.every(r => E[r.realIdx] === r.entry));
  // l index AFFICHE de 'd' est le dernier, son index REEL est au milieu
  const flat = flatRows(s, true);
  const dDisp = flat.findIndex(r => r.entry.kind === 'item' && r.entry.id === 'd');
  t('index affiche != index reel (le piege)', dDisp !== flat[dDisp].realIdx);
  t('mais realIdx cible bien d', (E[flat[dDisp].realIdx] as LayoutItem).id === 'd');
  // demasquer via l index affiche traduit
  const r = toggleHiddenEntry(E, flat[dDisp].realIdx);
  t('demasquage applique a la BONNE entree', item(r, 'd').hidden === false && item(r, 'b').hidden === true);
}

console.log('\n=== 6. DEPLACER UN MASQUE AGIT SUR LA BONNE ENTREE REELLE ===');
{
  const s = splitDisplayRows(E, true);
  const flat = flatRows(s, true);
  const from = flat.findIndex(r => r.entry.kind === 'item' && r.entry.id === 'd');
  const to = flat.findIndex(r => r.entry.kind === 'item' && r.entry.id === 'a');
  const d = resolveDrop(flat, from, to, 'before');
  t('drop resolu', d !== null);
  const apres = d ? moveEntry(E, d.from, d.to) : E;
  t('c est bien D qui a bouge', idxOf(apres, 'd') < idxOf(apres, 'a'));
  t('il reste masque', item(apres, 'd').hidden === true);
  t('aucune entree perdue', apres.length === E.length);
  t('il reste VISUELLEMENT en bas tant qu il est masque',
    rowIds(splitDisplayRows(apres, true).hidden).includes('item:d'));
  const demasque = toggleHiddenEntry(apres, idxOf(apres, 'd'));
  t('demasque, il reapparait en haut a sa NOUVELLE vraie position',
    rowIds(splitDisplayRows(demasque, true).main).join().startsWith('section:sec_def_principal,item:d,item:a'));
}

console.log('\n=== 7. DEPLACER UN VISIBLE, MASQUES CACHES ===');
{
  const s = splitDisplayRows(E, true);
  const flat = flatRows(s, false);
  const from = flat.findIndex(r => r.entry.kind === 'item' && r.entry.id === 'a');
  const to = flat.findIndex(r => r.entry.kind === 'item' && r.entry.id === 'e');
  const d = resolveDrop(flat, from, to, 'after');
  const apres = d ? moveEntry(E, d.from, d.to) : E;
  t('c est bien A qui a bouge', idxOf(apres, 'a') > idxOf(apres, 'e'));
  t('les masques restent masques et presents',
    item(apres, 'b').hidden === true && item(apres, 'd').hidden === true);
  t('ordre des visibles attendu',
    ids(visibleEntries(apres)).filter(k => k.startsWith('item:')).join() === 'item:c,item:e,item:a');
}

console.log('\n=== 8. CAS LIMITES ===');
{
  const flat = flatRows(splitDisplayRows(E, true), true);
  t('drop hors bornes -> null', resolveDrop(flat, 99, 0, 'before') === null);
  t('drop sur soi-meme -> null', resolveDrop(flat, 1, 1, 'before') === null);
  t('aucun masque : hidden vide', splitDisplayRows(BASE, true).hidden.length === 0);
  t('aucun masque : main complet', splitDisplayRows(BASE, true).main.length === BASE.length);
}

console.log(`\n${ko === 0 ? '>>> TOUS LES TESTS PASSENT' : '>>> ' + ko + ' ECHEC(S)'}  (${ok} assertions)`);
if (ko > 0) process.exit(1);
