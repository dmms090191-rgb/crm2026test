/**
 * ISRAEL HAYA — la timeline du voyage, et rien d'autre.
 *
 * Ce module est PUR : aucun import de valeur, aucun React, aucun DOM. C'est ce qui le rend
 * verifiable sans navigateur, et c'est volontaire — toute la coherence du site repose sur ces
 * quelques fonctions, et une erreur ici se verrait partout a la fois.
 *
 * ---------- LE PRINCIPE QUI TIENT TOUT ----------
 *
 * Chaque chapitre est une FONCTION PURE DE SA PROGRESSION. On ne cumule jamais de temps, on ne
 * garde jamais d'etat d'animation. On lit ou en est le defilement, on en deduit une progression
 * de 0 a 1, et on dessine cet instant-la.
 *
 * Consequence directe, et c'est elle qu'on cherche : remonter la page rejoue le voyage a
 * l'envers, exactement, gratuitement. Une animation qui avance toute seule ne saurait pas
 * revenir en arriere ; celle-ci n'a rien a defaire.
 *
 * ---------- LES HAUTEURS ----------
 *
 * Elles sont en vh et dimensionnees par le temps de LECTURE, pas par la duree du film : un
 * chapitre doit laisser le temps de lire ses legendes a vitesse de defilement normale. Les
 * valeurs ci-dessous sont des points de depart a valider au test de molette.
 */

export type Technique = 'film' | 'temps-reel';

/** Une legende, posee sur une plage de progression du chapitre. */
export interface Bande {
  /** Debut et fin dans la progression du chapitre, de 0 a 1. */
  de: number;
  a: number;
  /** Texte hebreu. */
  titre: string;
  sous?: string;
  /**
   * Bande d OUVERTURE : posee des le chargement, sans attendre le defilement.
   * Sans elle le visiteur arrive sur une image muette et doit deviner qu il faut
   * descendre pour voir le nom du site. Une page qui ne se nomme pas a rate son entree.
   */
  posee?: boolean;
}

export interface Chapitre {
  numero: number;
  cle: string;
  technique: Technique;
  /** Hauteur de defilement allouee, en vh. */
  vh: number;
  /** Fichier du film, pour les chapitres filmes. */
  film?: string;
  poster?: string;
  bandes: Bande[];
}

export const CHAPITRES: readonly Chapitre[] = [
  {
    numero: 1,
    cle: 'naissance',
    technique: 'film',
    vh: 450,
    film: '/israel-haya/ch01.mp4',
    poster: '/israel-haya/ch01-poster.jpg',
    bandes: [
      { de: 0, a: 0.52, titre: 'ישראל חיה', sous: 'מסע הנשמה', posee: true },
      { de: 0.60, a: 0.97, titre: 'כל התחלה היא אור קטן' },
    ],
  },
  {
    numero: 2,
    cle: 'jerusalem',
    technique: 'film',
    vh: 550,
    film: '/israel-haya/ch02.mp4',
    poster: '/israel-haya/ch02-poster.jpg',
    bandes: [
      { de: 0.05, a: 0.45, titre: 'שערי ירושלים', sous: 'אבן, אור ואבק' },
      { de: 0.55, a: 0.95, titre: 'האותיות מתעוררות' },
    ],
  },
  {
    numero: 3,
    cle: 'anneaux',
    technique: 'temps-reel',
    vh: 700,
    bandes: [
      { de: 0.03, a: 0.30, titre: 'מפת המספרים', sous: 'סובבו את הטבעות' },
      { de: 0.38, a: 0.95, titre: 'הזינו שם ותאריך לידה' },
    ],
  },
  {
    numero: 4,
    cle: 'arbre',
    technique: 'temps-reel',
    vh: 600,
    bandes: [
      { de: 0.05, a: 0.40, titre: 'עץ החיים', sous: 'מהשורש אל הענף' },
      { de: 0.52, a: 0.96, titre: 'מה שנזרע, גדל' },
    ],
  },
  {
    numero: 5,
    cle: 'cabinet',
    technique: 'film',
    vh: 500,
    film: '/israel-haya/ch05.mp4',
    poster: '/israel-haya/ch05-poster.jpg',
    bandes: [
      { de: 0.05, a: 0.45, titre: 'מקום להקשיב', sous: 'פגישה אישית, בשקט' },
      { de: 0.55, a: 0.95, titre: 'לקביעת פגישה' },
    ],
  },
  {
    numero: 6,
    cle: 'carte',
    technique: 'film',
    vh: 400,
    film: '/israel-haya/ch06.mp4',
    poster: '/israel-haya/ch06-poster.jpg',
    bandes: [{ de: 0.10, a: 0.95, titre: 'ישראל חיה', sous: 'ייעוץ אישי' }],
  },
];

/** Hauteur totale du voyage, en vh. */
export function hauteurTotale(chapitres: readonly Chapitre[] = CHAPITRES): number {
  return chapitres.reduce((somme, c) => somme + c.vh, 0);
}

/** Bornes de chaque chapitre dans la progression GLOBALE, de 0 a 1. */
export function bornes(chapitres: readonly Chapitre[] = CHAPITRES): Array<{ de: number; a: number }> {
  const total = hauteurTotale(chapitres);
  let curseur = 0;
  return chapitres.map(c => {
    const de = curseur / total;
    curseur += c.vh;
    return { de, a: curseur / total };
  });
}

/**
 * Progression DANS un chapitre, de 0 a 1, a partir de la progression globale.
 *
 * Rend 0 avant le chapitre et 1 apres : un chapitre deja traverse reste a son etat final, il
 * ne se reinitialise jamais. C'est ce qui permet de remonter sans que rien ne clignote.
 */
export function progressionDe(
  progressionGlobale: number,
  index: number,
  chapitres: readonly Chapitre[] = CHAPITRES,
): number {
  const b = bornes(chapitres)[index];
  if (!b) return 0;
  const largeur = b.a - b.de;
  if (largeur <= 0) return 0;
  return Math.min(1, Math.max(0, (progressionGlobale - b.de) / largeur));
}

/** Le chapitre actif, celui que la camera traverse en ce moment. */
export function chapitreActif(progressionGlobale: number, chapitres: readonly Chapitre[] = CHAPITRES): number {
  const liste = bornes(chapitres);
  for (let i = 0; i < liste.length; i++) {
    if (progressionGlobale < liste[i].a) return i;
  }
  return liste.length - 1;
}

/**
 * Opacite d'une legende, en fonction de la progression du chapitre.
 *
 * Un plateau pleinement visible au milieu, et des rampes douces aux deux bords. Le plateau
 * compte plus que les rampes : c'est lui qui donne le temps de lire, et un texte qui n'a pas
 * eu le temps d'etre lu n'a pas ete ecrit.
 */
export function opaciteBande(progression: number, bande: Bande, rampe = 0.08): number {
  const { de, a } = bande;
  if (progression >= a || progression < de) return 0;
  const r = Math.min(rampe, (a - de) / 2);
  // Une bande d ouverture entre deja pleine : aucune rampe au debut, seulement a la sortie.
  if (progression < de + r) return bande.posee ? 1 : lissage((progression - de) / r);
  if (progression > a - r) return lissage((a - progression) / r);
  return 1;
}

/** Lissage en S : une rampe lineaire se voit, celle-ci non. */
function lissage(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Temps video correspondant a une progression de chapitre, pour un film de duree donnee. */
export function tempsFilm(progression: number, duree: number): number {
  // On s'arrete juste avant la fin : chercher la toute derniere image fait parfois caler le
  // decodeur sur un seek, et l'ecart est invisible.
  return Math.min(duree - 0.05, Math.max(0, progression * duree));
}
