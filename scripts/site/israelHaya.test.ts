// Le voyage Israel Haya : timeline, nombres, arbre.
//   node --test --experimental-strip-types scripts/site/israelHaya.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHAPITRES, bornes, chapitreActif, hauteurTotale, opaciteBande, progressionDe, tempsFilm,
} from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/chapitres.ts';
import {
  calculer, dateValide, reduire, salutation, themeDe, METHODE_FOURNIE,
} from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/numerologie.ts';
import { comptePousse, construireArbre, estNe } from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/arbre.ts';

const read = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');

/* ---------------------------------- LA TIMELINE ---------------------------------- */

test('les six chapitres couvrent la progression sans trou ni chevauchement', () => {
  const b = bornes();
  assert.equal(b.length, 6);
  assert.equal(b[0].de, 0);
  assert.ok(Math.abs(b[5].a - 1) < 1e-9, 'le voyage doit finir exactement a 1');
  for (let i = 1; i < b.length; i++) {
    assert.ok(Math.abs(b[i].de - b[i - 1].a) < 1e-9, `trou entre les chapitres ${i} et ${i + 1}`);
  }
});

test('REVERSIBILITE : la meme progression rend toujours le meme etat', () => {
  // C'est la propriete qui fait tout tenir. Si elle tombe, remonter la page casse le voyage.
  for (const p of [0, 0.07, 0.23, 0.41, 0.5, 0.68, 0.79, 0.94, 1]) {
    const aller = CHAPITRES.map((_, i) => progressionDe(p, i));
    const retour = CHAPITRES.map((_, i) => progressionDe(p, i));
    assert.deepEqual(aller, retour);
  }
});

test('un chapitre deja traverse reste a son etat final, il ne se reinitialise jamais', () => {
  // Au bout du voyage, tous les chapitres precedents doivent etre a 1.
  for (let i = 0; i < CHAPITRES.length - 1; i++) {
    assert.equal(progressionDe(1, i), 1, `le chapitre ${i + 1} s est reinitialise`);
  }
  // Et avant d avoir commence, ils sont tous a 0.
  for (let i = 1; i < CHAPITRES.length; i++) {
    assert.equal(progressionDe(0, i), 0);
  }
});

test('le chapitre actif suit bien la progression, du premier au dernier', () => {
  assert.equal(chapitreActif(0), 0);
  assert.equal(chapitreActif(1), 5);
  const b = bornes();
  for (let i = 0; i < b.length; i++) {
    const milieu = (b[i].de + b[i].a) / 2;
    assert.equal(chapitreActif(milieu), i, `milieu du chapitre ${i + 1}`);
  }
});

test('LA BANDE D OUVERTURE est posee des le chargement', () => {
  // Sans elle, le visiteur arrive sur une image muette : le site ne se nomme pas.
  const premiere = CHAPITRES[0].bandes[0];
  assert.equal(premiere.posee, true, 'la premiere bande doit etre posee');
  assert.equal(opaciteBande(0, premiere), 1, 'le titre doit etre lisible a progression zero');
  assert.equal(premiere.titre, 'ישראל חיה');
});

test('les legendes ont un plateau pleinement visible, et s effacent aux deux bords', () => {
  for (const c of CHAPITRES) {
    for (const bande of c.bandes) {
      const milieu = (bande.de + bande.a) / 2;
      assert.equal(opaciteBande(milieu, bande), 1, `chapitre ${c.numero} : pas de plateau`);
      assert.equal(opaciteBande(bande.a, bande), 0, `chapitre ${c.numero} : ne s efface pas`);
      if (!bande.posee) assert.equal(opaciteBande(bande.de, bande), 0);
    }
  }
});

test('le temps video reste dans le film, jamais sur la toute derniere image', () => {
  assert.equal(tempsFilm(0, 6), 0);
  assert.ok(tempsFilm(1, 6) < 6, 'chercher la derniere image fait caler le decodeur');
  assert.ok(tempsFilm(1, 6) > 5.9);
  assert.equal(tempsFilm(0.5, 6), 3);
});

test('chaque chapitre filme a son film ET son poster', () => {
  for (const c of CHAPITRES) {
    if (c.technique !== 'film') continue;
    assert.ok(c.film, `chapitre ${c.numero} sans film`);
    assert.ok(c.poster, `chapitre ${c.numero} sans poster : il serait vide si la video echoue`);
  }
});

test('la hauteur totale est credible : ni trop courte a lire, ni interminable', () => {
  const h = hauteurTotale();
  assert.ok(h >= 2500, `voyage trop court pour six chapitres : ${h}vh`);
  assert.ok(h <= 4500, `voyage interminable : ${h}vh`);
});

/* ---------------------------------- LES NOMBRES ---------------------------------- */

test('la reduction s arrete sur les nombres maitres', () => {
  assert.equal(reduire(1987), 7);
  assert.equal(reduire(29), 11, '11 est un nombre maitre, il ne se reduit pas');
  assert.equal(reduire(22), 22);
  assert.equal(reduire(9), 9);
});

test('une date impossible ne produit JAMAIS de nombre', () => {
  assert.equal(dateValide({ jour: 30, mois: 2, annee: 1990 }), false);
  assert.equal(dateValide({ jour: 31, mois: 11, annee: 1990 }), false);
  assert.equal(dateValide({ jour: 29, mois: 2, annee: 2024 }), true, '2024 est bissextile');
  assert.equal(calculer({ jour: 30, mois: 2, annee: 1990 }), null);
});

test('le resultat est ETIQUETE comme demonstration tant que la methode n est pas fournie', () => {
  // Exigence explicite du proprietaire : jamais de resultat presente comme authentique.
  assert.equal(METHODE_FOURNIE, false);
  const r = calculer({ jour: 14, mois: 3, annee: 1988 });
  assert.ok(r);
  assert.equal(r.estDemonstration, true);
  assert.ok(r.etapes.length >= 4, 'le calcul doit pouvoir etre refait a la main');
});

test('le prenom n entre dans AUCUN calcul', () => {
  // Calculer sur les lettres d un prenom serait de la guematria, explicitement exclue.
  const a = calculer({ jour: 14, mois: 3, annee: 1988 });
  const b = calculer({ jour: 14, mois: 3, annee: 1988 });
  assert.deepEqual(a, b);
  assert.equal(salutation('  '), '');
  assert.equal(salutation(' נועה '), 'נועה');
  const source = read('src/pages/superadmin/views/site-builder/templates/israel-haya/numerologie.ts');
  assert.doesNotMatch(source, /charCodeAt/, 'aucune valeur ne doit etre tiree des lettres');
});

test('chaque nombre possible a un theme', () => {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
    assert.ok(themeDe(n).titre.length > 0, `theme manquant pour ${n}`);
  }
});

/* ---------------------------------- L ARBRE ---------------------------------- */

test('l arbre est reproductible : le meme a chaque chargement', () => {
  const a = construireArbre({ seed: 7 });
  const b = construireArbre({ seed: 7 });
  assert.equal(a.segments.length, b.segments.length);
  assert.deepEqual(a.segments[0], b.segments[0]);
  assert.deepEqual(a.segments[a.segments.length - 1], b.segments[b.segments.length - 1]);
});

test('l arbre POUSSE : le nombre de branches nees ne fait que croitre', () => {
  const arbre = construireArbre();
  let precedent = -1;
  for (const p of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
    const n = comptePousse(arbre, p);
    assert.ok(n >= precedent, `la pousse recule entre deux instants (${p})`);
    precedent = n;
  }
  assert.equal(comptePousse(arbre, 1), arbre.segments.length, 'tout doit etre la a la fin');
});

test('les racines naissent AVANT le tronc, et elles descendent', () => {
  const arbre = construireArbre();
  const racines = arbre.segments.filter(s => s.naissance < 0.3);
  assert.ok(racines.length > 0, 'aucune racine');
  for (const r of racines) {
    assert.ok(r.y2 < r.y1, 'une racine doit descendre : le defilement va vers le bas');
  }
});

test('chaque feuille nait APRES sa branche, jamais dans le vide', () => {
  const arbre = construireArbre();
  const premiereFeuille = Math.min(...arbre.feuilles.map(f => f.naissance));
  assert.ok(arbre.feuilles.length > 50, 'un olivier sans feuilles');
  assert.ok(premiereFeuille > 0.3, 'des feuilles apparaissent avant le tronc');
  assert.equal(estNe({ naissance: 0.5 }, 0.49), false);
  assert.equal(estNe({ naissance: 0.5 }, 0.5), true);
});

/* ---------------------------------- LE BRANCHEMENT ---------------------------------- */

test('le registre connait la cle, par un hote PARESSEUX sans dependance 3D', () => {
  const registre = read('src/pages/superadmin/views/site-builder/templates/templateRegistry.tsx');
  assert.match(registre, /israel_haya: IsraelHayaTemplate/);

  const hote = read('src/pages/superadmin/views/site-builder/templates/IsraelHayaTemplate.tsx');
  assert.match(hote, /lazy\(\(\) => import\('\.\/israel-haya\/IsraelHayaSite'\)\)/);
  assert.doesNotMatch(hote, /@react-three\/fiber/, 'l hote ne doit pas importer R3F');
  assert.doesNotMatch(hote, /from 'three'/, 'l hote ne doit pas importer three');
});

test('la page passe en hebreu RTL, et le rend en partant', () => {
  const site = read('src/pages/superadmin/views/site-builder/templates/israel-haya/IsraelHayaSite.tsx');
  assert.match(site, /setAttribute\('dir', 'rtl'\)/);
  assert.match(site, /setAttribute\('lang', 'he'\)/);
  // Le nettoyage compte autant : le reste de Talvex ne doit pas rester en RTL.
  assert.match(site, /removeAttribute\('dir'\)/);
});

test('COMPLET SANS VIDEO : le repli existe a tous les etages', () => {
  const film = read('src/pages/superadmin/views/site-builder/templates/israel-haya/FilmScrub.tsx');
  // Le poster est toujours peint, sous la video, jamais conditionne.
  assert.match(film, /<img\s+src=\{poster\}/);
  assert.match(film, /setEchec\(true\)/, 'un echec reseau doit etre attrape');
  const site = read('src/pages/superadmin/views/site-builder/templates/israel-haya/IsraelHayaSite.tsx');
  assert.match(site, /!reglages\.webgl && !reglages\.video/, 'le secours total doit exister');
});
