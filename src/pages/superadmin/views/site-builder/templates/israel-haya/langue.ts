import { useCallback, useState } from 'react';

/**
 * LES DEUX LANGUES DU SITE : francais et hebreu.
 *
 * ---------- POURQUOI PAS UNE BIBLIOTHEQUE D'INTERNATIONALISATION ----------
 *
 * Le site compte environ quatre-vingts chaines, sans pluriel a accorder, sans date a formater,
 * sans genre a resoudre et sans interpolation. Une bibliotheque apporterait ici un format de
 * fichier, un chargeur, un contexte et des dependances — pour remplacer une recherche dans un
 * objet. Et rien de tout cela n'existe ailleurs dans Talvex : ce template serait le seul usage.
 *
 * On ecrit donc le dictionnaire a la main, mais TYPE : `textes.ts` declare une interface, et
 * les deux langues doivent la remplir entierement. Oublier une traduction n'est pas un trou qui
 * se decouvre a l'ecran, c'est une erreur de compilation. C'est la seule garantie qui compte.
 *
 * ---------- LA DIRECTION N'EST PAS UNE TRADUCTION ----------
 *
 * Passer en hebreu ne consiste pas a remplacer des mots : la page entiere se retourne. Tout le
 * template est deja ecrit en proprietes LOGIQUES — insetInlineStart, paddingInline, marginInline
 * — et jamais en left/right. Changer `dir` sur la racine suffit donc, et le navigateur fait le
 * reste. Ne JAMAIS introduire de left/right en ajoutant du code : ce serait la seule chose
 * capable de casser le francais ou l'hebreu.
 */

export type Langue = 'fr' | 'he';

/** Les deux langues, dans l'ordre ou le selecteur les presente. */
export const LANGUES: readonly Langue[] = ['he', 'fr'];

/**
 * L'hebreu reste la langue d'ouverture.
 *
 * Ce n'est pas un detail d'implementation : le site est celui d'une praticienne en Israel, et
 * la suite de tests exige qu'il s'ouvre en hebreu RTL et se nomme des la premiere image. Le
 * francais est un choix explicite du visiteur, jamais un defaut qui s'installerait tout seul.
 */
export const LANGUE_DEFAUT: Langue = 'he';

/** Une chaine dans les deux langues. Le type force a ne jamais en oublier une. */
export interface Paire {
  fr: string;
  he: string;
}

/** Rend la chaine de la langue demandee. */
export function dit(paire: Paire, langue: Langue): string {
  return paire[langue];
}

export function directionDe(langue: Langue): 'rtl' | 'ltr' {
  return langue === 'he' ? 'rtl' : 'ltr';
}

/** Le code de langue a poser sur l'attribut lang. */
export function etiquetteLangue(langue: Langue): string {
  return langue === 'he' ? 'he' : 'fr';
}

/**
 * Le choix du visiteur, garde d'une visite a l'autre.
 *
 * La convention du depot est suivie telle quelle : localStorage, cle prefixee `crm_`, lecture
 * et ecriture TOUJOURS sous try/catch — en navigation privee, avec les cookies tiers bloques
 * ou dans une iframe restreinte, l'acces leve au lieu de rendre null, et une page qui s'effondre
 * sur un choix de langue serait absurde.
 */
const CLE = 'crm_ih_langue';

export function lireLangue(): Langue {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (brut === 'fr' || brut === 'he') return brut;
  } catch { /* stockage indisponible */ }
  return LANGUE_DEFAUT;
}

export function ecrireLangue(langue: Langue): void {
  try {
    window.localStorage.setItem(CLE, langue);
  } catch { /* stockage indisponible : le choix vaut pour cette visite seulement */ }
}

/** L'etat de langue du site, et le moyen d'en changer. */
export function useLangue(): [Langue, (l: Langue) => void] {
  const [langue, poser] = useState<Langue>(() => lireLangue());

  const changer = useCallback((l: Langue) => {
    poser(l);
    ecrireLangue(l);
  }, []);

  return [langue, changer];
}
