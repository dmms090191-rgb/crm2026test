/*
 * TALIXY — systeme de couleurs officiel, direction V1 « Nuit indigo ».
 *
 * Seule source des couleurs Talixy :
 *   - les tokens de theme (src/lib/themeTokensTalixy.ts) sont construits a partir d'elle ;
 *   - les variables CSS (src/talixy/talixy.css) la recopient, et un test verifie qu'elles sont identiques.
 * Une base sombre indigo fait ressortir violet, cyan, turquoise, rose, magenta et les lumieres ;
 * les neons structurent l'interface (actif, modules, etats), l'ensemble ne doit jamais etre monotone.
 *
 * Module pur, sans aucun import : testable avec node --test.
 */
export const TALIXY_PALETTE = {
  // Base nuit indigo
  void: '#07071A',
  night: '#0B0B1F',
  deep: '#121036',
  indigo: '#1A1446',
  panel: '#141238',
  lift: '#1E1A4E',
  /** Ombres profondes (toujours avec une opacite). */
  shade: '#03020E',
  // Neons et lumieres
  violet: '#7C5CFF',
  violetLight: '#A28BFF',
  lavender: '#8A80D8',
  cyan: '#3DE8FF',
  cyanLight: '#8CF1FF',
  turquoise: '#2EE6C5',
  rose: '#FF6FAE',
  magenta: '#FF4FD8',
  warm: '#FFB45A',
  // Texte
  text: '#F4F2FF',
  textSoft: '#D9D4FF',
  textMuted: '#ACA6DA',
  textFaint: '#8A84BE',
  // Etats
  danger: '#FF5A7A',
  success: '#34E3A4',
  warning: '#FFC24D',
} as const;

export type TalixyPalette = typeof TALIXY_PALETTE;
export type TalixyColor = keyof TalixyPalette;

/* Roles officiels : Talixy Primary, Secondary, Accent, Glow, Surface, Surface Active, Text, Text Muted, etats. */
export const TALIXY_ROLES: Readonly<Record<string, TalixyColor>> = {
  primary: 'violet',
  secondary: 'turquoise',
  accent: 'magenta',
  glow: 'violet',
  surface: 'panel',
  surfaceActive: 'lift',
  text: 'text',
  textMuted: 'textMuted',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
};

/* Couleur de structure par grande fonction : la couleur sert a se reperer, pas a decorer. */
export const TALIXY_MODULE_HUES: Readonly<Record<string, TalixyColor>> = {
  navigation: 'violet',
  crm: 'violet',
  agenda: 'turquoise',
  chat: 'magenta',
  boutique: 'warm',
  site: 'cyan',
  alertes: 'rose',
};

/* Intensite de la lueur Talixy (halo de l'element actif). */
export const TALIXY_GLOW_ALPHA = 0.55;
