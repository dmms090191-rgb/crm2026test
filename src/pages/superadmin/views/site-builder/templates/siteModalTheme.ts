import { Zap, Leaf, Crown, UserPlus, Heart, Sparkles, type LucideIcon } from 'lucide-react';

export interface SiteModalTheme {
  primary: string;
  secondary: string;
  primaryRgb: string;
  secondaryRgb: string;
  gradient: string;
  gradientHover: string;
  textGradient: string;
  orbColor1: string;
  orbColor2: string;
  caretColor: string;
  placeholderColor: string;
  /*
   * Le type vient de lucide-react plutot que d un ComponentType reecrit a la main : une
   * icone lucide est une ForwardRefExoticComponent, qu un ComponentType simple n accepte pas.
   * L ecart produisait deux erreurs de compilation par theme, soit douze au total, toutes du
   * meme genre et toutes sans consequence a l execution — mais elles masquaient les vraies.
   */
  loginIcon: LucideIcon;
  registerIcon: LucideIcon;
}

const TALVEX_THEME: SiteModalTheme = {
  primary: '#0ea5e9',
  secondary: '#06b6d4',
  primaryRgb: '14,165,233',
  secondaryRgb: '6,182,212',
  gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  gradientHover: 'linear-gradient(135deg, #0ea5e9, #0891b2)',
  textGradient: 'linear-gradient(to right, #38bdf8, #22d3ee, #60a5fa)',
  orbColor1: '#0ea5e9',
  orbColor2: '#06b6d4',
  caretColor: '#22d3ee',
  placeholderColor: 'rgba(100,116,139,0.8)',
  loginIcon: Zap,
  registerIcon: UserPlus,
};

const RENEWABLE_THEME: SiteModalTheme = {
  primary: '#10b981',
  secondary: '#06b6d4',
  primaryRgb: '16,185,129',
  secondaryRgb: '6,182,212',
  gradient: 'linear-gradient(135deg, #10b981, #059669)',
  gradientHover: 'linear-gradient(135deg, #10b981, #047857)',
  textGradient: 'linear-gradient(to right, #34d399, #22d3ee, #6ee7b7)',
  orbColor1: '#10b981',
  orbColor2: '#06b6d4',
  caretColor: '#34d399',
  placeholderColor: 'rgba(100,116,139,0.8)',
  loginIcon: Leaf,
  registerIcon: UserPlus,
};

const GOLD_BUYING_THEME: SiteModalTheme = {
  primary: '#d4a017',
  secondary: '#b8860b',
  primaryRgb: '212,160,23',
  secondaryRgb: '184,134,11',
  gradient: 'linear-gradient(135deg, #d4a017, #b8860b)',
  gradientHover: 'linear-gradient(135deg, #f5d060, #d4a017)',
  textGradient: 'linear-gradient(to right, #f5d060, #d4a017, #f5d060)',
  orbColor1: '#d4a017',
  orbColor2: '#b8860b',
  caretColor: '#f5d060',
  placeholderColor: 'rgba(120,110,90,0.8)',
  loginIcon: Crown,
  registerIcon: UserPlus,
};

const BUILDER_READY_THEME: SiteModalTheme = {
  primary: '#0ea5e9',
  secondary: '#10b981',
  primaryRgb: '14,165,233',
  secondaryRgb: '16,185,129',
  gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
  gradientHover: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
  textGradient: 'linear-gradient(to right, #38bdf8, #34d399, #0ea5e9)',
  orbColor1: '#0ea5e9',
  orbColor2: '#10b981',
  caretColor: '#38bdf8',
  placeholderColor: 'rgba(100,116,139,0.8)',
  loginIcon: Zap,
  registerIcon: UserPlus,
};

const BARBIE_WELLNESS_THEME: SiteModalTheme = {
  primary: '#38A8B5',
  secondary: '#6F5362',
  primaryRgb: '56,168,181',
  secondaryRgb: '111,83,98',
  gradient: 'linear-gradient(135deg, #38A8B5, #6F5362)',
  gradientHover: 'linear-gradient(135deg, #4abbc8, #7a5d6b)',
  textGradient: 'linear-gradient(to right, #4abbc8, #8e6878, #38A8B5)',
  orbColor1: '#38A8B5',
  orbColor2: '#6F5362',
  caretColor: '#4abbc8',
  placeholderColor: 'rgba(100,116,139,0.8)',
  loginIcon: Heart,
  registerIcon: UserPlus,
};

/**
 * ISRAEL HAYA — or et nuit. Sans cette entree, getSiteModalTheme retombe sur le theme
 * Talvex, et la connexion arriverait en cyan au milieu d un site dont toute la palette est
 * l'or #e8cd93 sur la nuit #070a16.
 */
const ISRAEL_HAYA_THEME: SiteModalTheme = {
  primary: '#e8cd93',
  secondary: '#b8893c',
  primaryRgb: '232,205,147',
  secondaryRgb: '184,137,60',
  gradient: 'linear-gradient(135deg, #e8cd93, #b8893c)',
  gradientHover: 'linear-gradient(135deg, #f0dfae, #a97c33)',
  textGradient: 'linear-gradient(to right, #f0dfae, #e8cd93, #d8bd83)',
  orbColor1: '#e8cd93',
  orbColor2: '#b8893c',
  caretColor: '#e8cd93',
  placeholderColor: 'rgba(238,231,219,0.45)',
  loginIcon: Sparkles,
  registerIcon: UserPlus,
};

const THEME_REGISTRY: Record<string, SiteModalTheme> = {
  talvex_official: TALVEX_THEME,
  renewable_energy: RENEWABLE_THEME,
  gold_buying: GOLD_BUYING_THEME,
  builder_ready: BUILDER_READY_THEME,
  barbie_wellness: BARBIE_WELLNESS_THEME,
  israel_haya: ISRAEL_HAYA_THEME,
};

export function getSiteModalTheme(templateKey?: string | null): SiteModalTheme {
  if (!templateKey) return TALVEX_THEME;
  return THEME_REGISTRY[templateKey] ?? TALVEX_THEME;
}
