/*
 * TALIXY — palette « Gris bleuté » : la référence absolue est la maquette (image 3, 1672x941),
 * chaque valeur ci-dessous a été MESURÉE dans l'image (voir scripts/talixy/talixyClair.test.ts).
 * Aucun import : module pur, testable avec node --test.
 *
 * L'ancienne palette « Nuit indigo » (talixyPalette.ts) est conservée intacte, non branchée
 * (masquer, jamais supprimer).
 *
 * Toutes les valeurs sont des hexadécimaux 6 chiffres : l'opacité s'applique au moment de
 * construire les tokens (talixyAlpha), et certains tokens sont concaténés `${token}80` dans
 * l'application, ce qui exige un hexa pur.
 */

export const TALIXY_CLAIR = {
  /* Fond vignetté : du bord vers le centre lumineux (mesures : coins -> horizon). */
  edge: '#737C8C',
  dusk: '#8C95A4',
  mist: '#AEB8C7',
  plume: '#C5CEDB',
  card: '#D6DDE8',
  veil: '#E1E8F2',
  horizon: '#E8EEF7',
  floor: '#EDF3F8',
  white: '#F7F9FC',
  pure: '#FFFFFF',

  /* Encres (texte sombre des zones claires — titre mesuré #101929..#2F3A4C). */
  inkDeep: '#141C27',
  ink: '#1F2937',
  inkSoft: '#3A444C',
  inkMuted: '#616A7A',
  inkFaint: '#8A93A3',

  /* Lumières (texte clair des zones sombres du vignettage : logo, menus, slogans). */
  lumen: '#F5FBFF',
  lumenSoft: '#D8DFEA',
  lumenMuted: '#B9C2D0',

  /* Accent bleu froid, très discret (maquette : #DCEBFF) et sa version lisible en texte. */
  ice: '#DCEBFF',
  steel: '#33567A',
  steelDeep: '#24425E',

  /* États — assombris pour rester lisibles sur les surfaces claires. */
  danger: '#A83149',
  success: '#136A4A',
  warning: '#7A5600',
} as const;

export type TalixyClairPalette = typeof TALIXY_CLAIR;
export type TalixyClairColor = keyof TalixyClairPalette;
