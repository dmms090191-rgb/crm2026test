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

import type { Paire } from './langue';

/** Raccourci d ecriture : l hebreu d abord, puisque c est la langue d origine du site. */
const P = (he: string, fr: string): Paire => ({ he, fr });

export type Technique = 'film' | 'temps-reel';

/**
 * CE QU'UN FILM DOIT MONTRER QUAND L'ECRAN EST PLUS ETROIT QUE LUI.
 *
 * Les six films sont tournes en 1920 x 1074, soit un rapport de 1,79. Sur un telephone en
 * portrait (0,46), remplir l'ecran revient a n'en montrer que 26 % de la largeur — mesure,
 * pas estimee. Pour la plupart des chapitres, ce recadrage est une AUBAINE : une ruelle de
 * Jerusalem ou un cabinet aux bougies ont de la matiere partout, et la version telephone est
 * une belle image serree.
 *
 * Pour la carte de visite, non : le sujet est un objet LARGE ET PLAT, pose a plat. En garder
 * le quart central ne laisse qu'une bande beige, et le visiteur ne voit plus que c'est une
 * carte. Ce chapitre demande donc a etre vu ENTIER, quitte a ne pas remplir la hauteur — le
 * reste du cadre etant tenu par son propre poster, agrandi et floute, pour que l'image ne
 * flotte pas sur deux bandes noires.
 */
export type Cadrage = 'couvrir' | 'entier';

/** Une legende, posee sur une plage de progression du chapitre. */
export interface Bande {
  /** Debut et fin dans la progression du chapitre, de 0 a 1. */
  de: number;
  a: number;
  /** La legende, dans les deux langues. */
  titre: Paire;
  sous?: Paire;
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
  /** Cadrage du film sur un ecran plus etroit que lui. Par defaut : 'couvrir'. */
  cadrage?: Cadrage;
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
      { de: 0, a: 0.52, titre: P('ישראל חיה', 'Israel Haya'), sous: P('מסע הנשמה', 'Le voyage de l’âme'), posee: true },
      { de: 0.60, a: 0.97, titre: P('כל התחלה היא אור קטן', 'Tout commencement est une petite lumière') },
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
      { de: 0.05, a: 0.45, titre: P('שערי ירושלים', 'Les portes de Jérusalem'), sous: P('אבן, אור ואבק', 'Pierre, lumière et poussière') },
      { de: 0.55, a: 0.95, titre: P('האותיות מתעוררות', 'Les lettres s’éveillent') },
    ],
  },
  {
    numero: 3,
    cle: 'anneaux',
    /*
     * ---------- LE DECOR EST FILME, L'OUTIL RESTE EN REACT ----------
     *
     * C'etait le dernier chapitre calcule en temps reel. Sur telephone, un mecanisme fait
     * d'anneaux de geometrie et de chiffres en texture lisait comme une interface au milieu de
     * cinq chapitres photorealistes : il cassait le niveau de tout le voyage.
     *
     * Le DECOR devient donc un film, au gabarit de ses voisins. Mais rien de ce qui FONCTIONNE
     * n'a bouge : le prenom, la date de naissance, le bouton, le calcul, ses etapes, le
     * resultat, son theme, le bandeau de demonstration, les deux langues et le RTL vivent
     * toujours dans SaisieNombres, pose PAR-DESSUS la video. Un film ne remplace pas un outil.
     *
     * Le nombre revele s'affiche au centre du mecanisme — la ou le film laisse un disque noir
     * volontairement degage. La scene 3D y allumait une sphere de lumiere ; cette lueur est
     * reconstruite en DOM (NombreRevele). Le chiffre, lui, a TOUJOURS ete ecrit en HTML : un
     * glyphe rendu dans une texture se lit moins bien que le meme glyphe rendu par le navigateur.
     *
     * AnneauxCelestes.tsx, SceneTempsReel.tsx et cadrage.ts restent entiers sur disque, avec
     * leurs tests : rendre cette ligne a 'temps-reel' suffit a les rallumer.
     */
    technique: 'film',
    vh: 700,
    film: '/israel-haya/ch03.mp4',
    poster: '/israel-haya/ch03-poster.jpg',
    bandes: [
      { de: 0.03, a: 0.30, titre: P('מפת המספרים', 'La carte des nombres'), sous: P('סובבו את הטבעות', 'Faites tourner les anneaux') },
      { de: 0.38, a: 0.95, titre: P('הזינו שם ותאריך לידה', 'Entrez un prénom et une date de naissance') },
    ],
  },
  {
    numero: 4,
    cle: 'arbre',
    /*
     * ---------- POURQUOI CE CHAPITRE EST PASSE D'UNE SCENE 3D A UN FILM ----------
     *
     * Il etait le SEUL des six a etre calcule en temps reel, et cela se voyait : a cote de la
     * ruelle de Jerusalem et du cabinet aux bougies, un olivier fait de cylindres et de points
     * lit comme une maquette. Le propriétaire l'a dit sans detour, et il avait raison —
     * aucun reglage de shader ne rattrape cet ecart de nature.
     *
     * Le film est donc produit comme ses cinq voisins et encode comme eux : 1920 x 1074,
     * 24 images par seconde, 145 images, 6,041 s, une image cle TOUTES LES HUIT IMAGES pour
     * que le defilement reste net. Master 4K (3840 x 2160) conserve hors depot.
     *
     * Le theme ne change pas : c'est toujours עץ החיים, l'arbre de vie. Un olivier ancien qui
     * brule sans se consumer — ecorce intacte, feuillage vert argent toujours lisible — porte
     * la reference a l'Exode sans qu'on ait eu a renommer le chapitre.
     *
     * La scene 3D n'est pas supprimee : ArbreDeVie.tsx et arbre.ts restent entiers sur disque,
     * avec leur cadrage dans cadrage.ts. Il suffit de rendre ces deux lignes a temps-reel.
     */
    technique: 'film',
    vh: 600,
    film: '/israel-haya/ch04.mp4',
    poster: '/israel-haya/ch04-poster.jpg',
    bandes: [
      { de: 0.05, a: 0.40, titre: P('עץ החיים', 'L’arbre de vie'), sous: P('מהשורש אל הענף', 'De la racine à la branche') },
      { de: 0.52, a: 0.96, titre: P('מה שנזרע, גדל', 'Ce qui est semé grandit') },
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
      { de: 0.05, a: 0.45, titre: P('מקום להקשיב', 'Un lieu pour écouter'), sous: P('פגישה אישית, בשקט', 'Une rencontre personnelle, au calme') },
      { de: 0.55, a: 0.95, titre: P('לקביעת פגישה', 'Prendre rendez-vous') },
    ],
  },
  {
    numero: 6,
    cle: 'carte',
    technique: 'film',
    cadrage: 'entier',
    vh: 400,
    film: '/israel-haya/ch06.mp4',
    poster: '/israel-haya/ch06-poster.jpg',
    bandes: [{ de: 0.10, a: 0.95, titre: P('ישראל חיה', 'Israel Haya'), sous: P('ייעוץ אישי', 'Consultation individuelle') }],
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
