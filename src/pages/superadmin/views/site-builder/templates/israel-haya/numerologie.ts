/**
 * LE MOTEUR DE NOMBRES — configurable, et honnete sur ce qu'il est.
 *
 * ---------- CE QUE CE FICHIER N'EST PAS ----------
 *
 * Ce n'est pas la methode de la praticienne. Elle n'a pas ete fournie. Tant qu'elle ne l'est
 * pas, ce module applique la REDUCTION THEOSOPHIQUE, qui est de la numerologie moderne
 * d'origine pythagoricienne, et l'interface le dit au visiteur en toutes lettres.
 *
 * Il ne faut surtout pas confondre deux choses que le projet touche de pres :
 *   - la GUEMATRIA est une tradition juive documentee, qui attribue des valeurs numeriques aux
 *     lettres hebraiques ;
 *   - la numerologie du chemin de vie, calculee a partir d'une date de naissance, est moderne
 *     et n'appartient pas a cette tradition.
 * Ce module ne fait QUE la seconde, et ne pretend rien d'autre.
 *
 * ---------- COMMENT ON BRANCHERA LA VRAIE METHODE ----------
 *
 * Toute la methode tient dans UNE fonction, `METHODE`. Quand la praticienne fournira la sienne,
 * on remplace cette fonction et on passe `estDemonstration` a false. Rien d'autre ne bouge :
 * ni l'interface, ni la scene, ni les textes. C'est la seule raison pour laquelle ce fichier
 * existe separement.
 *
 * Module PUR : aucun import, donc verifiable sans navigateur.
 */

import type { Paire } from './langue';

/** Raccourci : hebreu d abord, langue d origine du site. */
const P = (he: string, fr: string): Paire => ({ he, fr });

export interface Resultat {
  /** Le nombre obtenu, de 1 a 9, ou un nombre maitre si la methode en produit. */
  nombre: number;
  /** Les etapes du calcul, pour pouvoir les montrer. Un resultat qu'on ne peut pas expliquer
   *  ne vaut rien sur un sujet pareil. */
  etapes: string[];
  /** Vrai tant que la methode de la praticienne n'est pas branchee. */
  estDemonstration: boolean;
}

/** Nombres qu'on ne reduit pas, par convention de la numerologie moderne. */
const MAITRES = new Set([11, 22, 33]);

/** Somme des chiffres d'un entier. */
function sommeChiffres(n: number): number {
  let s = 0;
  let reste = Math.abs(Math.trunc(n));
  while (reste > 0) {
    s += reste % 10;
    reste = Math.floor(reste / 10);
  }
  return s;
}

/**
 * Reduction theosophique : on additionne les chiffres jusqu'a obtenir un seul chiffre, en
 * s'arretant sur les nombres maitres.
 */
export function reduire(n: number): number {
  let courant = Math.abs(Math.trunc(n));
  while (courant > 9 && !MAITRES.has(courant)) {
    courant = sommeChiffres(courant);
  }
  return courant;
}

/** Une date, telle que le formulaire la donne. */
export interface DateNaissance {
  jour: number;
  mois: number;
  annee: number;
}

/** La date est-elle reelle ? On refuse le 31 novembre comme le 30 fevrier. */
export function dateValide(d: DateNaissance): boolean {
  const { jour, mois, annee } = d;
  if (!Number.isInteger(jour) || !Number.isInteger(mois) || !Number.isInteger(annee)) return false;
  if (annee < 1900 || annee > 2100 || mois < 1 || mois > 12 || jour < 1) return false;
  const joursDuMois = new Date(annee, mois, 0).getDate();
  return jour <= joursDuMois;
}

/**
 * LA METHODE. C'est elle, et elle seule, qu'on remplacera.
 *
 * Par defaut : reduction de chaque partie de la date, puis reduction de leur somme. C'est la
 * forme la plus repandue du « chemin de vie » moderne, et elle est reproductible : quiconque
 * refait le calcul a la main retrouve le meme nombre.
 */
function METHODE(d: DateNaissance): { nombre: number; etapes: string[] } {
  const rJour = reduire(d.jour);
  const rMois = reduire(d.mois);
  const rAnnee = reduire(d.annee);
  const somme = rJour + rMois + rAnnee;
  const nombre = reduire(somme);
  return {
    nombre,
    etapes: [
      `${d.jour} → ${rJour}`,
      `${d.mois} → ${rMois}`,
      `${d.annee} → ${rAnnee}`,
      `${rJour} + ${rMois} + ${rAnnee} = ${somme}`,
      `${somme} → ${nombre}`,
    ],
  };
}

/** Vrai tant que la praticienne n'a pas fourni sa methode. A passer a false ce jour-la. */
export const METHODE_FOURNIE = false;

/**
 * Calcule le nombre a partir d'une date. Rend null si la date n'est pas valide : on prefere
 * ne rien afficher plutot qu'afficher un nombre faux.
 */
export function calculer(d: DateNaissance): Resultat | null {
  if (!dateValide(d)) return null;
  const { nombre, etapes } = METHODE(d);
  return { nombre, etapes, estDemonstration: !METHODE_FOURNIE };
}

/**
 * Le prenom ne sert QU'A la personnalisation de l'affichage. Il n'entre dans aucun calcul.
 *
 * C'est une decision, pas un oubli : calculer sur les lettres d'un prenom serait de la
 * guematria, et le projet a explicitement demande de ne pas confondre les deux.
 */
export function salutation(prenom: string): string {
  const p = prenom.trim();
  return p.length > 0 ? p : '';
}

/**
 * Themes associes aux neuf nombres. Formulations VOLONTAIREMENT SOBRES : ce sont des pistes
 * de reflexion, pas des predictions, et aucune ne se reclame d'une source religieuse.
 * Elles seront remplacees par les interpretations de la praticienne.
 */
export const THEMES: Record<number, { titre: Paire; texte: Paire }> = {
  1: { titre: P('התחלה', 'Commencement'), texte: P('כוח של פתיחה, יוזמה ועמידה עצמאית.', 'Une force d’ouverture, d’initiative et d’autonomie.') },
  2: { titre: P('קשב', 'Écoute'), texte: P('רגישות לזולת, שיתוף פעולה ואיזון.', 'Sensibilité à l’autre, coopération et équilibre.') },
  3: { titre: P('ביטוי', 'Expression'), texte: P('יצירתיות, מילים ושמחה שמדבקת.', 'Créativité, mots, et une joie qui se communique.') },
  4: { titre: P('יסוד', 'Fondation'), texte: P('סדר, התמדה ובנייה לאורך זמן.', 'Ordre, constance et construction dans la durée.') },
  5: { titre: P('תנועה', 'Mouvement'), texte: P('שינוי, סקרנות וחופש פעולה.', 'Changement, curiosité et liberté d’action.') },
  6: { titre: P('אחריות', 'Responsabilité'), texte: P('משפחה, נתינה ודאגה לסובבים.', 'Famille, don de soi et attention aux proches.') },
  7: { titre: P('עומק', 'Profondeur'), texte: P('התבוננות, לימוד ושקט פנימי.', 'Observation, étude et calme intérieur.') },
  8: { titre: P('מימוש', 'Réalisation'), texte: P('כוח מעשי, ניהול ותוצאה בעולם.', 'Force pratique, conduite et résultat concret.') },
  9: { titre: P('מסירה', 'Transmission'), texte: P('ראייה רחבה, חמלה וסגירת מעגל.', 'Vue d’ensemble, compassion, et un cercle qui se referme.') },
  11: { titre: P('השראה', 'Inspiration'), texte: P('רגישות גבוהה וחיבור לאינטואיציה.', 'Grande sensibilité et lien à l’intuition.') },
  22: { titre: P('בנייה', 'Édification'), texte: P('חזון גדול שמבקש להיעשות מעשי.', 'Une vision large qui demande à devenir concrète.') },
  33: { titre: P('הוראה', 'Enseignement'), texte: P('נתינה רחבה דרך לימוד וליווי.', 'Un don de soi large, par l’étude et l’accompagnement.') },
};

/** Le theme d'un nombre, ou celui de 9 si la methode produit un nombre inattendu. */
export function themeDe(nombre: number) {
  return THEMES[nombre] ?? THEMES[9];
}
