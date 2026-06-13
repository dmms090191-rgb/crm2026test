export type Theme =
  | 'dark' | 'light' | 'graphite' | 'beige' | 'rose' | 'emerald' | 'luxury'
  | 'pink' | 'red' | 'orange' | 'yellow'
  | 'highlevel_light' | 'highlevel_dark' | 'highlevel_emerald' | 'glass';

export interface GlassConfig {
  imageUrl: string;
  blur: 'low' | 'medium' | 'high';
  cardTransparency: 'low' | 'medium' | 'high';
  overlayMode: 'dark' | 'light';
  accentColor: string;
  overlayOpacity: number;
  brightness: number;
  saturation: number;
  backgroundBlur: number;
}

export const DEFAULT_GLASS_CONFIG: GlassConfig = {
  imageUrl: '',
  blur: 'medium',
  cardTransparency: 'medium',
  overlayMode: 'dark',
  accentColor: '#f97316',
  overlayOpacity: 0.65,
  brightness: 0.55,
  saturation: 0.6,
  backgroundBlur: 3,
};

export interface CustomThemeOverrides {
  zone_overrides?: Record<string, unknown>;
  zone_css?: Record<string, string | null>;
  text_overrides?: Record<string, string>;
  background_image?: string | null;
  typography_overrides?: Record<string, string | null> | null;
}

export const THEME_BG: Record<Theme, string> = {
  dark: '#050810',
  light: '#080C16',
  graphite: '#1e2024',
  beige: '#14100A',
  rose: '#120A16',
  emerald: '#06130D',
  luxury: '#12100B',
  pink: '#120810',
  red: '#100808',
  orange: '#100A06',
  yellow: '#0E0C06',
  highlevel_light: '#f4f7fb',
  highlevel_dark: '#f3f6fb',
  highlevel_emerald: '#f8fafc',
  glass: '#0a0a14',
};
