import type { ComponentType } from 'react';
import { Zap, Leaf, Crown, UserPlus } from 'lucide-react';

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
  loginIcon: ComponentType<{ className?: string; strokeWidth?: number }>;
  registerIcon: ComponentType<{ className?: string; strokeWidth?: number }>;
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

const THEME_REGISTRY: Record<string, SiteModalTheme> = {
  talvex_official: TALVEX_THEME,
  renewable_energy: RENEWABLE_THEME,
  gold_buying: GOLD_BUYING_THEME,
  builder_ready: BUILDER_READY_THEME,
};

export function getSiteModalTheme(templateKey?: string | null): SiteModalTheme {
  if (!templateKey) return TALVEX_THEME;
  return THEME_REGISTRY[templateKey] ?? TALVEX_THEME;
}
