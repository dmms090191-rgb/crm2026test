// Regle de suppression du module Systeme : un parent ne part que VIDE.
// Arbre fabrique EN MEMOIRE : aucune connexion Supabase, aucune donnee reelle touchee.
//   node --test scripts/system/suppressionSysteme.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkCategoryDeletable,
  buildTree,
  countAllItems,
  type SystemCategory,
  type SystemItem,
} from '../../src/pages/admin/views/system/types.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

/*
 * Copie fidele de l'arbre reel de David, avec des identifiants lisibles :
 *
 *   Responsive
 *   └─ page d'accueil
 *      ├─ Inscription   -> 2 notes
 *      └─ Connexion     -> 1 note
 */
const cat = (id: string, name: string, parent_id: string | null, position = 0): SystemCategory => ({
  id, name, parent_id, position, color: null, created_at: '2026-01-01',
});
const note = (id: string, title: string, category_id: string, position = 0): SystemItem => ({
  id, title, description: '', status: 'todo', status_id: null, position, category_id,
  created_at: '2026-01-01', updated_at: '2026-01-01',
});

function arbreDeDepart() {
  const categories = [
    cat('responsive', 'Responsive', null, 1),
    cat('accueil', 'page d’accueil', 'responsive', 0),
    cat('inscription', 'Inscription', 'accueil', 0),
    cat('connexion', 'Connexion', 'accueil', 1),
  ];
  const items = [
    note('n1', 'On a la possibilité de s’inscrire', 'inscription', 0),
    note('n2', 'carte inscription en attente', 'inscription', 1),
    note('n3', 'L’admin peut se connecter', 'connexion', 0),
  ];
  return { categories, items };
}

/** Supprimer une note = la retirer de la liste. Exactement ce que fait handleDeleteItem. */
const sansNote = (items: SystemItem[], id: string) => items.filter((i) => i.id !== id);
/** Supprimer une categorie = la retirer. JAMAIS ses enfants : aucune cascade cote application. */
const sansCategorie = (categories: SystemCategory[], id: string) => categories.filter((c) => c.id !== id);

test('A. une note se supprime seule, sans rien entrainer avec elle', () => {
  const { categories, items } = arbreDeDepart();
  const apres = sansNote(items, 'n1');

  assert.equal(apres.length, 2, 'une seule note est partie');
  assert.equal(apres.filter((i) => i.category_id === 'inscription').length, 1, 'il reste une note dans Inscription');
  assert.equal(categories.length, 4, 'aucune categorie touchee');
  // La deuxieme note du meme groupe est intacte : pas de suppression de groupe deguisee.
  assert.ok(apres.some((i) => i.id === 'n2'));
});

test('B. un sous-groupe qui contient encore une note ne se supprime pas, et le message le dit', () => {
  const { categories, items } = arbreDeDepart();

  const plein = checkCategoryDeletable(categories, items, 'inscription');
  assert.equal(plein.ok, false);
  assert.equal(plein.message, 'Ce sous-groupe contient encore 2 notes.');

  // Il en reste une : toujours bloque, et le compte suit.
  const uneEnMoins = sansNote(items, 'n1');
  const encore = checkCategoryDeletable(categories, uneEnMoins, 'inscription');
  assert.equal(encore.ok, false);
  assert.equal(encore.message, 'Ce sous-groupe contient encore 1 note.', 'singulier, pas « 1 notes »');
});

test('C. le sous-groupe se supprime des qu il est vide', () => {
  const { categories, items } = arbreDeDepart();
  const vide = sansNote(sansNote(items, 'n1'), 'n2');

  const verdict = checkCategoryDeletable(categories, vide, 'inscription');
  assert.equal(verdict.ok, true);
  assert.equal(verdict.message, undefined);

  // Et sa suppression ne touche ni ses freres ni ses parents.
  const apres = sansCategorie(categories, 'inscription');
  assert.equal(apres.length, 3);
  assert.ok(apres.some((c) => c.id === 'connexion'), 'le sous-groupe voisin reste');
  assert.ok(apres.some((c) => c.id === 'accueil'), 'le parent reste');
  assert.equal(vide.filter((i) => i.category_id === 'connexion').length, 1, 'la note du voisin reste');
});

test('D. la categorie reste bloquee tant qu elle contient un sous-groupe', () => {
  const { categories, items } = arbreDeDepart();

  // « page d’accueil » n'a aucune note directe, mais deux sous-groupes.
  assert.equal(items.filter((i) => i.category_id === 'accueil').length, 0);
  const accueil = checkCategoryDeletable(categories, items, 'accueil');
  assert.equal(accueil.ok, false);
  assert.equal(accueil.message, 'Ce sous-groupe contient encore 2 sous-groupes.');

  // « Responsive » est la grande categorie : le sujet change.
  const racine = checkCategoryDeletable(categories, items, 'responsive');
  assert.equal(racine.ok, false);
  assert.equal(racine.message, 'Cette catégorie contient encore 1 sous-groupe.');
});

test('E. la categorie se supprime quand elle est vide — et seulement a ce moment-la', () => {
  const { categories, items } = arbreDeDepart();

  // On vide en remontant, note par note, exactement comme dans l'interface.
  let cats = categories;
  let notes = items;

  notes = sansNote(sansNote(notes, 'n1'), 'n2');
  cats = sansCategorie(cats, 'inscription');
  notes = sansNote(notes, 'n3');
  cats = sansCategorie(cats, 'connexion');

  // page d’accueil est enfin vide.
  const accueil = checkCategoryDeletable(cats, notes, 'accueil');
  assert.equal(accueil.ok, true);
  cats = sansCategorie(cats, 'accueil');

  // Responsive aussi.
  const racine = checkCategoryDeletable(cats, notes, 'responsive');
  assert.equal(racine.ok, true);

  assert.equal(notes.length, 0);
  assert.deepEqual(cats.map((c) => c.id), ['responsive']);
});

test('les deux comptes se cumulent dans un seul message', () => {
  const categories = [cat('c', 'Mixte', null), cat('f', 'Fils', 'c')];
  const items = [note('a', 'a', 'c'), note('b', 'b', 'c'), note('d', 'd', 'c')];
  const verdict = checkCategoryDeletable(categories, items, 'c');
  assert.equal(verdict.ok, false);
  assert.equal(verdict.message, 'Cette catégorie contient encore 1 sous-groupe et 3 notes.');
});

test('la regle ne compte QUE les enfants directs : c est ce que la base cascaderait', () => {
  const { categories, items } = arbreDeDepart();
  // Responsive a 3 notes en tout, mais aucune en direct : son blocage ne parle que du sous-groupe.
  const arbre = buildTree(categories, items);
  assert.equal(countAllItems(arbre[0]), 3, 'trois notes dans tout l arbre');
  const verdict = checkCategoryDeletable(categories, items, 'responsive');
  assert.match(verdict.message ?? '', /1 sous-groupe/);
  assert.doesNotMatch(verdict.message ?? '', /note/, 'aucune note directe : on n en parle pas');
});

test('l interface expose bien les quatre actions sur une note, et ne les cache plus au survol', () => {
  const row = read('src/pages/admin/views/system/components/SystemItemRow.tsx');
  const menu = read('src/pages/admin/views/system/components/SystemItemActions.tsx');

  // Le defaut d origine : le bloc d actions etait invisible tant qu on ne survolait pas la ligne.
  assert.doesNotMatch(row, /group-hover\/row:opacity-100/, 'plus d actions revelees au survol');
  assert.doesNotMatch(row, /sm:opacity-0/, 'plus d actions a opacite nulle sur desktop');

  assert.match(row, /<SystemItemActions/, 'la note porte le menu « ... »');
  for (const action of ['Monter', 'Descendre', 'Modifier', 'Supprimer']) {
    assert.match(menu, new RegExp(`label: '${action}'`), `action ${action} presente`);
  }

  // « Modifier » rebranche la fonction qui existait mais n etait cablee nulle part.
  const vue = read('src/pages/admin/views/system/SystemView.tsx');
  assert.match(vue, /actions\.handleUpdateItemTitle\(/, 'handleUpdateItemTitle est enfin utilise');
});

test('une seule fenetre de confirmation sert les trois niveaux, et elle ne decide rien', () => {
  const vue = read('src/pages/admin/views/system/SystemView.tsx');
  const modale = read('src/pages/admin/views/system/components/SystemConfirmDelete.tsx');

  assert.match(vue, /<SystemConfirmDelete/, 'la fenetre est montee une seule fois');
  assert.match(vue, /genre: 'note' \| 'categorie'/, 'elle sert la note comme la categorie');
  assert.match(modale, /Supprimer «/, 'le texte demande bien « Supprimer « nom » ? »');

  // La verification passe AVANT l ouverture : on n ouvre jamais sur un parent non vide.
  assert.match(vue, /const verdict = actions\.canDeleteCategory\(id\);/);
  assert.match(vue, /if \(!verdict\.ok\) \{[\s\S]*?setBlocage\(/, 'parent non vide -> blocage, pas de fenetre');

  // Et le handler re-verifie de son cote : deuxieme verrou contre la cascade de la base.
  const hook = read('src/pages/admin/views/system/useSystemActions.ts');
  assert.match(hook, /const verdict = checkCategoryDeletable\(categories, items, id\);\n\s*if \(!verdict\.ok\) return/);
});

test('aucune suppression en cascade cote application', () => {
  const hook = read('src/pages/admin/views/system/useSystemActions.ts');
  // Une seule suppression de categorie, une seule de note, toutes deux par id unique.
  assert.equal((hook.match(/\.delete\(\)/g) ?? []).length, 3, 'categorie, note, statut : trois suppressions, pas une de plus');
  assert.match(hook, /from\('crm_system_categories'\)\.delete\(\)\.eq\('id', id\)/);
  assert.match(hook, /from\('crm_system_items'\)\.delete\(\)\.eq\('id', id\)/);
  // Jamais de suppression par parent_id ou category_id : ce serait une cascade applicative.
  assert.doesNotMatch(hook, /\.delete\(\)\.eq\('parent_id'/);
  assert.doesNotMatch(hook, /\.delete\(\)\.eq\('category_id'/);
});
