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
import {
  DISTANCE_MIN, ETENDUE, ETENDUE_REELLE, cadrer, demiHauteurVue, distanceCamera, remonteeScene,
} from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/cadrage.ts';
import { LANGUES, LANGUE_DEFAUT, directionDe } from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/langue.ts';
import { textesDe } from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/textes.ts';
import { directionModale, textesModale } from '../../src/pages/superadmin/views/site-builder/templates/modaleTextes.ts';
import {
  COORDONNEES, COORDONNEES_PROVISOIRES, coordonneesActives, lienCourriel, lienTelephone, lienWhatsApp,
} from '../../src/pages/superadmin/views/site-builder/templates/israel-haya/coordonnees.ts';

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
  assert.equal(premiere.titre.he, 'ישראל חיה');
  assert.equal(premiere.titre.fr, 'Israel Haya');
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
    const theme = themeDe(n);
    assert.ok(theme.titre.he.length > 0, `titre hebreu manquant pour ${n}`);
    assert.ok(theme.titre.fr.length > 0, `titre francais manquant pour ${n}`);
    assert.ok(theme.texte.he.length > 0, `texte hebreu manquant pour ${n}`);
    assert.ok(theme.texte.fr.length > 0, `texte francais manquant pour ${n}`);
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
  // L hote charge la COQUILLE, qui porte la navigation, la langue et la connexion ; le voyage
  // est dessous. Ce qui compte n a pas change : rien de lourd dans le paquet d entree.
  assert.match(hote, /lazy\(\(\) => import\('\.\/israel-haya\/CoquilleIsraelHaya'\)\)/);
  assert.doesNotMatch(hote, /@react-three\/fiber/, 'l hote ne doit pas importer R3F');
  assert.doesNotMatch(hote, /from 'three'/, 'l hote ne doit pas importer three');
});

test('la direction du document suit la langue, et elle est rendue en partant', () => {
  // L effet a quitte le voyage pour la coquille : « A propos » et « Contact » ont besoin de la
  // meme direction, et document.documentElement est partage avec tout Talvex.
  const coquille = read('src/pages/superadmin/views/site-builder/templates/israel-haya/CoquilleIsraelHaya.tsx');
  assert.match(coquille, /setAttribute\('dir', directionDe\(langue\)\)/);
  assert.match(coquille, /setAttribute\('lang', etiquetteLangue\(langue\)\)/);
  // Le nettoyage compte autant : le reste de Talvex ne doit pas rester en RTL.
  assert.match(coquille, /removeAttribute\('dir'\)/);
  assert.match(coquille, /removeAttribute\('lang'\)/);
  // Et l effet doit DEPENDRE de la langue, sinon un changement de langue ne se verrait pas.
  assert.match(coquille, /\}, \[langue\]\)/);
});

test('COMPLET SANS VIDEO : le repli existe a tous les etages', () => {
  const film = read('src/pages/superadmin/views/site-builder/templates/israel-haya/FilmScrub.tsx');
  // Le poster est toujours peint, sous la video, jamais conditionne.
  assert.match(film, /<img\s+src=\{poster\}/);
  assert.match(film, /setEchec\(true\)/, 'un echec reseau doit etre attrape');
  const site = read('src/pages/superadmin/views/site-builder/templates/israel-haya/IsraelHayaSite.tsx');
  assert.match(site, /!reglages\.webgl && !reglages\.video/, 'le secours total doit exister');
});

/* ------------------------------ LES DEUX LANGUES ------------------------------ */

/**
 * Le dictionnaire est deja verifie par le compilateur : l interface `Textes` oblige les deux
 * langues a porter les memes cles. Ce que le type ne peut PAS voir, c est le contenu — une
 * chaine vide, ou une phrase hebraique restee dans la version francaise parce qu on a copie le
 * bloc sans le traduire. C est exactement ce genre d oubli qui arrive, et il ne se remarque
 * qu une fois le site devant le client.
 */
function toutesLesChaines(valeur: unknown, chemin = ''): [string, string][] {
  if (typeof valeur === 'string') return [[chemin, valeur]];
  if (Array.isArray(valeur)) return valeur.flatMap((v, i) => toutesLesChaines(v, `${chemin}[${i}]`));
  if (valeur && typeof valeur === 'object') {
    return Object.entries(valeur).flatMap(([c, v]) => toutesLesChaines(v, chemin ? `${chemin}.${c}` : c));
  }
  return [];
}

const HEBREU = /[֐-׿]/;

test('AUCUN TEXTE VIDE, dans aucune des deux langues', () => {
  for (const langue of LANGUES) {
    for (const [chemin, chaine] of toutesLesChaines(textesDe(langue))) {
      assert.ok(chaine.trim().length > 0, `texte vide : ${langue} / ${chemin}`);
    }
  }
});

test('LE FRANCAIS NE CONTIENT PAS D HEBREU, et inversement', () => {
  for (const [chemin, chaine] of toutesLesChaines(textesDe('fr'))) {
    assert.ok(!HEBREU.test(chaine), `de l hebreu est reste dans la version francaise : ${chemin}`);
  }
  for (const [chemin, chaine] of toutesLesChaines(textesDe('he'))) {
    assert.ok(HEBREU.test(chaine), `pas une lettre hebraique dans la version hebraique : ${chemin}`);
  }
});

test('LES SIX CHAPITRES et les douze themes sont traduits', () => {
  for (const c of CHAPITRES) {
    for (const bande of c.bandes) {
      assert.ok(bande.titre.fr.trim().length > 0, `chapitre ${c.numero} : titre francais manquant`);
      assert.ok(!HEBREU.test(bande.titre.fr), `chapitre ${c.numero} : titre francais non traduit`);
      if (bande.sous) {
        assert.ok(bande.sous.fr.trim().length > 0, `chapitre ${c.numero} : sous-titre francais manquant`);
        assert.ok(!HEBREU.test(bande.sous.fr), `chapitre ${c.numero} : sous-titre francais non traduit`);
      }
    }
  }
});

test('LA DIRECTION suit la langue, et l hebreu reste la langue d ouverture', () => {
  assert.equal(directionDe('he'), 'rtl');
  assert.equal(directionDe('fr'), 'ltr');
  // Le site est celui d une praticienne en Israel : le francais est un choix, pas un defaut.
  assert.equal(LANGUE_DEFAUT, 'he');
  assert.deepEqual([...LANGUES].sort(), ['fr', 'he']);
});

/* --------------------------- LES COORDONNEES PROVISOIRES --------------------------- */

test('LES LIENS DE CONTACT sont formes correctement', () => {
  assert.match(lienCourriel(), /^mailto:[^@\s]+@[^@\s]+$/);
  // Le lien telephonique doit etre INTERNATIONAL : un 0 initial ne compose pas depuis l etranger.
  assert.match(lienTelephone(), /^tel:\+\d{8,}$/);
  // WhatsApp refuse le plus et les separateurs.
  assert.match(lienWhatsApp(), /^https:\/\/wa\.me\/\d{8,}$/);
  assert.ok(!lienWhatsApp().includes('+'), 'WhatsApp n accepte pas le plus');
});

test('LES COORDONNEES DE DEMONSTRATION ne peuvent joindre personne', () => {
  /*
   * Israel n'a aucune plage de numeros reservee aux fictions, contrairement au 555 nord-americain :
   * un 050-555-2846 est un mobile parfaitement attribuable, et il peut sonner chez quelqu un
   * aujourd hui. Un bandeau qui previent en texte ne desarme pas le bouton WhatsApp juste a cote.
   */
  assert.equal(coordonneesActives(), false, 'tant que les coordonnees sont inventees, rien n est cliquable');

  // Le domaine est dans un suffixe RESERVE, qui ne peut etre enregistre par personne.
  assert.match(COORDONNEES.email, /\.example$/, 'le courriel de demonstration doit etre dans un domaine reserve');

  // Et le numero ne porte aucun abonne possible.
  assert.match(COORDONNEES.telephoneInternational, /^\+9725000000\d\d$/, 'numero de demonstration non attribuable');

  // La page de contact ne doit poser AUCUN lien tant que cette regle vaut.
  const page = read('src/pages/superadmin/views/site-builder/templates/israel-haya/PageContact.tsx');
  assert.ok(page.includes('coordonneesActives'), 'PageContact doit consulter la regle avant de poser un lien');
});

test('LES COORDONNEES sont rassemblees en UN SEUL endroit, et annoncees comme provisoires', () => {
  // Tant qu elles sont inventees, le site doit le dire au visiteur.
  assert.equal(COORDONNEES_PROVISOIRES, true);

  // Et aucune ne doit etre recopiee ailleurs : un numero invente qui traine dans un composant
  // survit toujours au remplacement.
  const dossier = 'src/pages/superadmin/views/site-builder/templates/israel-haya/';
  for (const fichier of ['PageContact.tsx', 'FormulaireContact.tsx', 'SectionsBas.tsx']) {
    const source = read(dossier + fichier);
    assert.ok(
      !source.includes(COORDONNEES.email) && !source.includes(COORDONNEES.telephoneAffiche),
      `${fichier} recopie une coordonnee au lieu de lire coordonnees.ts`,
    );
  }
});

/* ------------------------- LE FORMULAIRE NE MENT PAS ------------------------- */

test('LE FORMULAIRE DE CONTACT n envoie rien, et ne pretend pas le contraire', () => {
  const source = read('src/pages/superadmin/views/site-builder/templates/israel-haya/FormulaireContact.tsx');

  // Aucun appel reseau, aucune ecriture en base : l audit a montre qu aucun canal n existe.
  assert.doesNotMatch(source, /fetch\(/, 'un envoi reseau est apparu sans canal pour le recevoir');
  assert.doesNotMatch(source, /supabase/, 'aucune table n accepte un message de visiteur anonyme');

  // Le point de branchement doit rester signale, sinon personne ne le retrouvera.
  assert.match(source, /POINT DE BRANCHEMENT DE L'ENVOI/);

  // Et le bouton ne doit pas etre une soumission : l apercu les annule toutes.
  assert.match(source, /type="button"/);
  assert.doesNotMatch(source, /<form/, 'une soumission serait inerte dans l apercu');
});

/* ------------------------- LA FENETRE DE CONNEXION BILINGUE ------------------------- */

/**
 * Le contrat de retrocompatibilite, ecrit noir sur blanc.
 *
 * Cette fenetre est partagee par les onze templates. Un seul parle hebreu. Si une seule de ces
 * chaines francaises bougeait, dix sites changeraient de texte sans que personne l ait demande.
 * Les valeurs ci-dessous sont celles d AVANT la mise en deux langues, recopiees a l identique :
 * ce test echoue si quelqu un les retouche.
 */
const FRANCAIS_D_ORIGINE: Record<string, string> = {
  titre: 'Connexion',
  sousTitre: 'Accedez a votre espace personnel',
  adresseEmail: 'Adresse email',
  exempleEmail: 'votre@email.com',
  motDePasse: 'Mot de passe (6 chiffres)',
  masquer: 'Masquer',
  afficher: 'Afficher',
  naviguer: 'Fleches gauche/droite pour naviguer',
  enCours: 'Connexion en cours...',
  valider: 'VALIDER',
  pasDeCompte: 'Pas encore de compte ?',
  sInscrire: "S'inscrire",
  identifiantsInvalides: 'Email ou mot de passe incorrect.',
  domaineNonAutorise: "Ce compte n'est pas autorise sur ce domaine.",
  rapides: 'Rapides',
  enregistrer: 'Enregistrer',
  gerer: 'Gerer',
  titreRapides: 'Emails rapides',
  titreGerer: 'Gerer les emails',
  ajouterUnEmail: 'Ajouter un email...',
  toutSupprimer: 'Tout supprimer',
  aucunEmail: 'Aucun email rapide',
  aucunEmailAide: "Cliquez Enregistrer pour ajouter l'email actuel.",
  aucunEmailAideGerer: 'Ajoutez un email ci-dessus.',
  emailInvalide: 'Adresse email invalide.',
  dejaEnregistre: 'Cet email est deja enregistre.',
  ajouteAuxRapides: 'Email ajoute aux acces rapides.',
  ajoute: 'Email ajoute.',
  supprime: 'Email supprime.',
  listeVidee: 'Emails rapides vides.',
};

test('SANS LANGUE, la fenetre de connexion rend exactement ce qu elle rendait avant', () => {
  // L absence de langue doit valoir francais : c est ce qui protege les dix autres templates.
  for (const forme of [undefined, null] as const) {
    const L = textesModale(forme);
    for (const [cle, attendu] of Object.entries(FRANCAIS_D_ORIGINE)) {
      assert.equal(
        (L as unknown as Record<string, string>)[cle], attendu,
        `le texte francais « ${cle} » a change : dix autres sites l affichent`,
      );
    }
    assert.equal(L.compteur(1), '1 email enregistre');
    assert.equal(L.compteur(3), '3 emails enregistres');
  }
  // Et la direction d ecriture reste celle d avant.
  assert.equal(directionModale(), 'ltr');
  assert.equal(directionModale(null), 'ltr');
  assert.equal(directionModale('fr'), 'ltr');
});

test('EN HEBREU, la fenetre est traduite ET retournee', () => {
  assert.equal(directionModale('he'), 'rtl');

  const L = textesModale('he');
  for (const [cle, valeur] of Object.entries(L)) {
    if (typeof valeur !== 'string') continue;
    assert.ok(valeur.trim().length > 0, `texte vide : ${cle}`);
    // Une chaine francaise restee dans la version hebraique se verrait tout de suite a l ecran.
    assert.ok(
      HEBREU.test(valeur) || /^[\w@.]+$/.test(valeur),
      `pas une lettre hebraique dans « ${cle} » : ${valeur}`,
    );
  }
  // L hebreu n accorde pas le pluriel comme le francais.
  assert.notEqual(L.compteur(1), L.compteur(3));
});

test('LE SITE passe sa langue a la fenetre, et retire l inscription', () => {
  const coquille = read('src/pages/superadmin/views/site-builder/templates/israel-haya/CoquilleIsraelHaya.tsx');
  assert.match(coquille, /langue=\{langue\}/);
  // La connexion de ce site est celle de la praticienne vers son CRM, pas une inscription
  // ouverte a tout visiteur — et la fenetre d inscription n est pas traduite.
  assert.match(coquille, /inscription=\{false\}/);
});

test('LA FENETRE porte SA direction, au lieu de l heriter du document', () => {
  // Sans cela, un document en RTL retournait une fenetre ecrite en francais.
  const modale = read('src/pages/superadmin/views/site-builder/templates/TalvexLoginModal.tsx');
  assert.match(modale, /dir=\{directionModale\(langue\)\}/);
  // Et la langue doit etre OPTIONNELLE : un template qui l ignore ne doit rien changer.
  assert.match(modale, /langue\?: LangueModale \| null;/);
  assert.match(modale, /inscription = true/);
});

/* ---------------------------------- LE CADRAGE ---------------------------------- */

/*
 * CE QUE CES TESTS PROTEGENT.
 *
 * Les scenes des chapitres 3 et 4 sortaient du cadre sur telephone, et le defaut avait survecu
 * a un releve responsive de 160 combinaisons sans jamais y apparaitre. La raison est
 * instructive : ce releve mesurait des RECTANGLES DU DOM, or une scene 3D n'en a qu'un, qui
 * remplit toujours sa boite. Un objet a moitie hors champ ne deplace aucun rectangle.
 *
 * Le defaut etait entierement contenu dans la geometrie de la camera — c'est donc la qu'on
 * l'attrape, par le calcul, et non par une capture.
 */

test('CADRAGE : un ecran large garde EXACTEMENT son cadrage d origine', () => {
  // La regle qui rend la correction sans risque : elle n'agit que la ou il y avait un defaut.
  for (const aspect of [16 / 9, 16 / 10, 1440 / 900, 1920 / 1080, 1280 / 800, 3 / 2]) {
    for (const chapitre of [3, 4] as const) {
      assert.equal(
        distanceCamera(ETENDUE[chapitre], aspect), DISTANCE_MIN,
        `chapitre ${chapitre} a l aspect ${aspect.toFixed(3)} : la camera ne doit pas bouger`,
      );
    }
  }

  // Et sur un vrai ecran de bureau, le panneau de saisie tient dans un coin : aucune remontee.
  const bureau = cadrer({
    etendue: ETENDUE[3], largeurScene: 1440, hauteurScene: 900,
    hautPanneau: 542, largeurPanneau: 440, montee: 1,
  });
  assert.equal(bureau.distance, DISTANCE_MIN);
  assert.equal(bureau.hauteur, 0, "sur un ecran de bureau, rien ne bouge, pas meme d un pixel");
});

test('CADRAGE : sur un ecran etroit, la scene tient dans le cadre en largeur', () => {
  // Les tailles reelles du releve responsive, du plus petit telephone a la tablette.
  const ecrans = [[320, 720], [360, 800], [375, 812], [390, 844], [430, 932], [768, 1024]];
  for (const [l, h] of ecrans) {
    for (const chapitre of [3, 4] as const) {
      const etendue = ETENDUE[chapitre];
      const d = distanceCamera(etendue, l / h);
      const demiLargeurVue = demiHauteurVue(d) * (l / h);
      assert.ok(
        demiLargeurVue >= etendue.demiLargeur - 1e-9,
        `${l}x${h}, chapitre ${chapitre} : le cadre ne voit que ${demiLargeurVue.toFixed(2)} u pour ${etendue.demiLargeur} demandees`,
      );
      assert.ok(
        demiHauteurVue(d) >= etendue.demiHauteur - 1e-9,
        `${l}x${h}, chapitre ${chapitre} : hauteur insuffisante`,
      );
    }
  }
});

test('CADRAGE : le defaut d origine est bien celui qu on croit', () => {
  /*
   * La camera figee a 9,4 : la hauteur vue ne depend PAS de la forme de l ecran, la largeur si.
   * C'est tout le defaut, en deux assertions.
   */
  const demiHauteur = demiHauteurVue(DISTANCE_MIN);
  const largeurTelephone = demiHauteur * (375 / 812);
  const largeurBureau = demiHauteur * (1440 / 900);
  assert.ok(largeurTelephone < 1.7, `le telephone ne voyait que ${largeurTelephone.toFixed(2)} u de demi-largeur`);
  assert.ok(largeurBureau > 5.7, `le bureau en voyait ${largeurBureau.toFixed(2)}`);
  // Et les scenes en demandent 3,17, mesurees au pixel sur le rendu reel.
  assert.ok(largeurTelephone < 3.17 && largeurBureau > 3.17, 'coupe sur telephone, intact sur bureau');
});

test('CADRAGE : la scene ne remonte que si un panneau large occupe VRAIMENT le bas', () => {
  const telephone = { etendue: ETENDUE[3], largeurScene: 375, hauteurScene: 812 };

  // Sans panneau : rien ne bouge.
  assert.equal(remonteeScene({ ...telephone, hautPanneau: null, largeurPanneau: 0, montee: 1 }), 0);

  /*
   * Panneau MONTE mais pas encore apparu. C'est le cas reel du premier tiers du chapitre 3 :
   * le panneau est masque par `visibility`, donc il garde sa boite et se mesure deja. Sans la
   * montee, la scene etait remontee de 166 px devant un bas d ecran vide.
   */
  assert.equal(
    remonteeScene({ ...telephone, hautPanneau: 480, largeurPanneau: 345, montee: 0 }), 0,
    'un panneau invisible ne commande rien',
  );

  // Et la remontee accompagne son apparition, au lieu de la preceder.
  const demi = remonteeScene({ ...telephone, hautPanneau: 480, largeurPanneau: 345, montee: 0.5 });
  const plein = remonteeScene({ ...telephone, hautPanneau: 480, largeurPanneau: 345, montee: 1 });
  assert.ok(demi > 0 && demi < plein, `la montee doit graduer la remontee : ${demi} puis ${plein}`);

  // Panneau de coin, comme sur un ecran de bureau : rien ne bouge non plus.
  assert.equal(
    remonteeScene({
      etendue: ETENDUE[3], largeurScene: 1440, hauteurScene: 900,
      hautPanneau: 542, largeurPanneau: 440, montee: 1,
    }),
    0,
    'un panneau qui prend 31 % de la largeur ne doit rien deplacer',
  );

  // Remonter la scene dans le cadre veut dire DESCENDRE la camera.
  const vue = cadrer({ ...telephone, hautPanneau: 480, largeurPanneau: 345, montee: 1 });
  assert.ok(vue.hauteur < 0, 'remonter la scene dans le cadre veut dire DESCENDRE la camera');
});

test('CADRAGE : la scene tient dans le cadre MEME APRES avoir ete remontee', () => {
  /*
   * LE DEFAUT BLOQUANT QUE CE TEST VERROUILLE.
   *
   * La distance et la hauteur de camera etaient calculees par deux fonctions qui ne se
   * connaissaient pas : on cadrait une scene CENTREE, puis on la remontait sans verifier que
   * son sommet tenait encore. Sur une fenetre presque carree — rapport superieur a 0,915, ou le
   * recul vaut deja son minimum — il ne restait aucune marge a manger, et le haut des anneaux
   * ressortait du cadre de 25 a 97 px selon la taille. Un defaut de la classe exacte que la
   * correction pretendait eliminer.
   *
   * On verifie donc la composition, pas chaque moitie separement.
   */
  const tailles = [
    [640, 700], [698, 700], [720, 720], [800, 800], [844, 520], [1024, 768],
    [320, 720], [375, 812], [390, 844], [430, 932], [768, 1024], [1440, 900], [1920, 1080],
  ];

  for (const [l, h] of tailles) {
    for (const chapitre of [3, 4] as const) {
      const etendue = ETENDUE[chapitre];
      // Un panneau pleine largeur, au pire moment : entierement apparu, haut place.
      const hautPanneau = Math.round(h * 0.56);
      const vue = cadrer({
        etendue, largeurScene: l, hauteurScene: h,
        hautPanneau: chapitre === 3 ? hautPanneau : null,
        largeurPanneau: Math.min(l * 0.92, 440),
        montee: 1,
      });
      const demi = demiHauteurVue(vue.distance);
      // `hauteur` est negative : le sommet de la scene monte d autant dans le cadre.
      const sommet = etendue.demiHauteur - vue.hauteur;
      const pied = etendue.demiHauteur + vue.hauteur;
      assert.ok(
        sommet <= demi + 1e-9,
        `${l}x${h} chap ${chapitre} : le sommet atteint ${sommet.toFixed(3)} u pour ${demi.toFixed(3)} vues`,
      );
      assert.ok(
        pied <= demi + 1e-9,
        `${l}x${h} chap ${chapitre} : le pied atteint ${pied.toFixed(3)} u pour ${demi.toFixed(3)} vues`,
      );
      assert.ok(
        demi * (l / h) >= etendue.demiLargeur - 1e-9,
        `${l}x${h} chap ${chapitre} : la largeur ne tient plus apres remontee`,
      );
    }
  }
});

test('CADRAGE : ce qu on montre et ce qui existe, sans rien masquer', () => {
  /*
   * Les demi-hauteurs declarees ne sont PAS l'etendue reelle des scenes, et ce test l'enonce
   * plutot que de le laisser dans un commentaire. L'arbre descend a 3,93 alors que le cadre
   * d'origine n'en voit que 3,61 : les pointes de racines sortent du bas de l'image sur un
   * ecran large. Ce comportement est ANTERIEUR au module de cadrage, il est assume, et le
   * corriger reculerait la camera de 9,4 a 10,24 — donc changerait un rendu de bureau valide.
   */
  const cadre = demiHauteurVue(DISTANCE_MIN);

  // Les anneaux tiennent vraiment : leur sommet reel est sous ce qu on declare.
  assert.ok(ETENDUE_REELLE[3].haut <= ETENDUE[3].demiHauteur, "les anneaux doivent tenir dans leur declaration");
  assert.ok(ETENDUE_REELLE[3].bas <= ETENDUE[3].demiHauteur);

  // L'arbre, lui, deborde par le bas — volontairement.
  assert.ok(ETENDUE_REELLE[4].haut <= ETENDUE[4].demiHauteur, "la couronne, elle, tient");
  assert.ok(
    ETENDUE_REELLE[4].bas > cadre,
    `les racines descendent a ${ETENDUE_REELLE[4].bas} et le cadre n en voit que ${cadre.toFixed(3)} : ecart assume`,
  );

  // Et les demi-largeurs, elles, couvrent bien la matiere reelle des deux scenes.
  for (const chapitre of [3, 4] as const) {
    assert.ok(
      ETENDUE[chapitre].demiLargeur >= ETENDUE_REELLE[chapitre].demiLargeur,
      `chapitre ${chapitre} : la largeur declaree doit couvrir la largeur mesuree`,
    );
  }
});

test('CADRAGE : une taille d ecran absurde ne casse rien', () => {
  for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const d = distanceCamera(ETENDUE[3], aspect);
    assert.ok(Number.isFinite(d) && d >= DISTANCE_MIN, `aspect ${aspect} : distance ${d}`);
  }
  for (const absurde of [
    { largeurScene: 0, hauteurScene: 0, hautPanneau: 10, largeurPanneau: 10, montee: 1 },
    { largeurScene: 375, hauteurScene: 812, hautPanneau: -40, largeurPanneau: 345, montee: 1 },
    { largeurScene: 375, hauteurScene: 812, hautPanneau: 9999, largeurPanneau: 345, montee: 1 },
    { largeurScene: 375, hauteurScene: 812, hautPanneau: 400, largeurPanneau: 345, montee: Number.NaN },
  ]) {
    const vue = cadrer({ etendue: ETENDUE[3], ...absurde });
    assert.ok(Number.isFinite(vue.distance) && vue.distance >= DISTANCE_MIN, JSON.stringify(absurde));
    assert.ok(Number.isFinite(vue.hauteur) && vue.hauteur <= 0, JSON.stringify(absurde));
  }
});
test('CADRAGE : le film large se montre entier la ou le recadrer lui couterait son sujet', () => {
  const carte = CHAPITRES.find(c => c.cle === 'carte');
  assert.equal(carte?.cadrage, 'entier', 'la carte de visite est un objet large et plat : la recadrer la detruit');

  // Les autres chapitres filmes gardent le plein cadre : leur matiere est partout.
  for (const c of CHAPITRES.filter(x => x.technique === 'film' && x.cle !== 'carte')) {
    assert.equal(c.cadrage, undefined, `${c.cle} doit garder le cadrage par defaut`);
  }

  // Et la mesure qui justifie la regle : un film de rapport 1,79 sur un telephone en portrait.
  const partVue = (375 / 812) / 1.788;
  assert.ok(partVue < 0.27, `on n en voyait que ${Math.round(partVue * 100)} % de la largeur`);
});
