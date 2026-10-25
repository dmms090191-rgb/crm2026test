/**
 * LA PALETTE DU LAUNCHER DE BUREAU, en un seul endroit.
 *
 * Elle derive de Talixy (src/talixy/talixy.css), assombrie pour la profondeur. Le launcher
 * est rendu SANS ThemeProvider — c'est volontaire, il porte ses couleurs en propre — donc
 * ces valeurs ne passent par aucun moteur de themes et ne doivent pas y passer.
 *
 * Elle est extraite ici, et non laissee dans le composant du launcher, parce que les
 * panneaux des emails rapides vivent dans un fichier voisin : deux jeux de constantes
 * auraient diverge a la premiere retouche, et un panneau d'une autre couleur que la fenetre
 * qui l'ouvre se voit immediatement.
 */

export const CYAN = '#00BCD4';
export const CYAN_CLAIR = '#4DD6E8';
export const BLANC = '#FFFFFF';
export const MIST = '#AEB8C7';
export const DUSK = '#8C95A4';
export const EDGE = '#737C8C';

/** MIST a 26 % : la seule « bordure » du launcher. */
export const TRAIT = 'rgba(174,184,199,0.26)';

/** Encre assombrie, pour la profondeur. */
export const ABYSSE = '#0B1118';
/** Entre --tx-ink-deep et l'encre. */
export const NUIT = '#131C27';
/** --tx-danger eclairci, pour rester lisible sur fond profond. */
export const DANGER = '#E06A80';
