// Le template « Numerologie celeste » est-il visible, identifiable et ouvrable ?
//   node --test --experimental-strip-types scripts/site/templateNumerologie.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTemplateLibrary } from '../../src/lib/siteWorkspaceModel.ts';
import type { SiteTemplate } from '../../src/lib/companyHomePagesTypes.ts';

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

const CLE = 'numerologie_celeste';

/** La ligne telle qu'elle est reellement en base (relevee le 2026-10-12). */
const NUMEROLOGIE = {
  id: 'id-numerologie',
  name: 'Numerologie celeste',
  slug: 'numerologie-celeste',
  template_key: CLE,
  description: 'Experience 3D immersive...',
  category: 'Spiritualite',
  thumbnail_url: '/site-templates/numerologie-celeste.jpg',
  is_default: false,
  is_visible: true,
} as unknown as SiteTemplate;

const UN_AUTRE = {
  id: 'id-builder',
  name: 'Builder Ready',
  template_key: 'builder_ready',
  thumbnail_url: null,
  is_visible: true,
} as unknown as SiteTemplate;

test('Talvex Administrateur voit le template dans sa bibliotheque', () => {
  const entrees = buildTemplateLibrary({
    templates: [UN_AUTRE, NUMEROLOGIE],
    assignedIds: new Set(),
    activeTemplate: null,
    actorIsTalvex: true,
    targetCompanyId: null,
  });
  const trouve = entrees.find(e => e.template.template_key === CLE);
  assert.ok(trouve, 'le template n apparait pas pour Talvex Administrateur');
  assert.equal(trouve.isActive, false, 'il ne doit surtout pas etre le template actif');
  assert.equal(trouve.isAssigned, false, 'il n est attribue a personne, et c est voulu');
});

test('une Societe ne le voit PAS tant qu il ne lui est pas attribue', () => {
  // Ce n'est pas un defaut : c'est la regle de buildTemplateLibrary, ligne 184.
  // Une Societe ne voit que ce qui lui est attribue, ou son template actif.
  const entrees = buildTemplateLibrary({
    templates: [UN_AUTRE, NUMEROLOGIE],
    assignedIds: new Set(),
    activeTemplate: null,
    actorIsTalvex: false,
    targetCompanyId: 'une-societe',
  });
  assert.equal(entrees.find(e => e.template.template_key === CLE), undefined);
});

test('attribue a une Societe, il apparait chez elle aussi', () => {
  const entrees = buildTemplateLibrary({
    templates: [UN_AUTRE, NUMEROLOGIE],
    assignedIds: new Set(['id-numerologie']),
    activeTemplate: null,
    actorIsTalvex: false,
    targetCompanyId: 'une-societe',
  });
  const trouve = entrees.find(e => e.template.template_key === CLE);
  assert.ok(trouve, 'attribue, il devrait apparaitre');
  assert.equal(trouve.isAssigned, true);
});

test('le registre React connait la cle, et par un hote PARESSEUX', () => {
  const registre = read('src/pages/superadmin/views/site-builder/templates/templateRegistry.tsx');
  assert.match(registre, /numerologie_celeste: NumerologieTemplate/, 'cle absente du registre');
  assert.match(registre, /import NumerologieTemplate from '\.\/NumerologieTemplate'/);

  // L hote ne doit porter AUCUNE dependance 3D : c est lui qui tient la frontiere de
  // chargement. Un import direct de la scene ferait entrer three.js dans le paquet d entree.
  const hote = read('src/pages/superadmin/views/site-builder/templates/NumerologieTemplate.tsx');
  assert.match(hote, /lazy\(\(\) => import\('\.\/numerologie\/NumerologieSite'\)\)/);
  assert.doesNotMatch(hote, /from '@react-three\/fiber'/, 'l hote ne doit pas importer R3F');
  assert.doesNotMatch(hote, /from 'three'/, 'l hote ne doit pas importer three');
});

test('les DEUX cartes de la bibliotheque savent afficher une vignette', () => {
  const onglet = read('src/pages/superadmin/views/site-builder/SiteTemplatesTab.tsx');
  const carte = read('src/pages/superadmin/views/site-builder/SiteTemplateCard.tsx');

  assert.match(onglet, /template\.thumbnail_url && !vignetteCassee/, 'la carte de l onglet ignore la vignette');
  assert.match(carte, /showImage \? \(/, 'la carte de bibliotheque ignore la vignette');

  // Les deux se protegent d une vignette qui ne charge pas. Ce n est pas du luxe :
  // vercel.json reecrit tout chemin inconnu vers index.html EN 200, donc une image absente
  // arrive comme du HTML et non comme une erreur franche.
  assert.match(onglet, /onError=\{\(\) => setVignetteCassee\(true\)\}/);
  assert.match(carte, /onError=\{\(\) => setImageFailed\(true\)\}/);

  // Et un degrade de repli existe pour la cle, dans les deux, si l image ne charge pas.
  assert.match(onglet, /numerologie_celeste: 'linear-gradient/);
  assert.match(carte, /numerologie_celeste: 'linear-gradient/);
});

test('la vignette versionnee est bien celle que la base designe', () => {
  const migration = read('supabase/migrations/20261012075144_set_numerologie_celeste_thumbnail.sql');
  assert.match(migration, /\/site-templates\/numerologie-celeste\.jpg/);
  // L UPDATE ne vise que notre ligne : les neuf autres templates gardent leur degrade.
  assert.match(migration, /WHERE template_key = 'numerologie_celeste'/);

  // Le fichier existe vraiment, et pese ce qu une vignette doit peser.
  const img = readFileSync(new URL('../../public/site-templates/numerologie-celeste.jpg', import.meta.url));
  assert.ok(img.length > 10_000, 'vignette suspecte : trop petite');
  assert.ok(img.length < 400_000, `vignette trop lourde : ${img.length} octets`);
});

test('le seed rend le template visible, sans toucher a rien d autre', () => {
  const seed = read('supabase/migrations/20261011090157_seed_numerologie_celeste_template.sql');
  assert.match(seed, /INSERT INTO public\.site_templates/);
  assert.match(seed, /ON CONFLICT \(template_key\) DO NOTHING/, 'le seed doit etre rejouable');
  // Rien ne doit toucher la page d accueil ni la portee plateforme.
  assert.doesNotMatch(seed, /UPDATE public\.company_home_pages/);
  assert.doesNotMatch(seed, /site_scope\s*=\s*'platform'/);
});
