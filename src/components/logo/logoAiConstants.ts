import {
  Type, Hexagon, Smartphone, CaseUpper, Palette,
  Pen, Circle, Heart, Layers, Hash, Brush,
} from 'lucide-react';
import { createElement } from 'react';

export type Engine = 'v4_1' | 'v3';
export type Preset = 'typographic' | 'abstract_symbol' | 'app_icon' | 'monogram' | 'color_variant';
export type LogoType = 'symbol_and_text' | 'symbol_only';
export type RecraftStyle = 'Vector art' | 'Line art' | 'Bold stroke' | 'Roundish flat' | 'Emotional flat' | 'Engraving';
export type NumProposals = 1 | 2 | 4;
export type ColorPaletteId = 'custom' | 'black_white' | 'none';

export const PRESETS: { id: Preset; label: string; desc: string; icon: React.ReactNode; needsBrand: boolean }[] = [
  { id: 'typographic', label: 'Logo typographique', desc: 'Nom de marque en belle typographie', icon: createElement(Type, { className: 'w-4 h-4' }), needsBrand: true },
  { id: 'abstract_symbol', label: 'Symbole abstrait', desc: 'Symbole geometrique sans texte', icon: createElement(Hexagon, { className: 'w-4 h-4' }), needsBrand: false },
  { id: 'app_icon', label: 'Icone application', desc: 'Icone simple pour app', icon: createElement(Smartphone, { className: 'w-4 h-4' }), needsBrand: false },
  { id: 'monogram', label: 'Monogramme lettre', desc: "Monogramme a partir d'une initiale", icon: createElement(CaseUpper, { className: 'w-4 h-4' }), needsBrand: true },
  { id: 'color_variant', label: 'Variante couleur', desc: 'Wordmark avec palette de couleurs', icon: createElement(Palette, { className: 'w-4 h-4' }), needsBrand: true },
];

export const V3_STYLES: { id: RecraftStyle; label: string; icon: React.ReactNode }[] = [
  { id: 'Vector art', label: 'Vector art', icon: createElement(Layers, { className: 'w-3.5 h-3.5' }) },
  { id: 'Line art', label: 'Line art', icon: createElement(Pen, { className: 'w-3.5 h-3.5' }) },
  { id: 'Bold stroke', label: 'Bold stroke', icon: createElement(Brush, { className: 'w-3.5 h-3.5' }) },
  { id: 'Roundish flat', label: 'Roundish flat', icon: createElement(Circle, { className: 'w-3.5 h-3.5' }) },
  { id: 'Emotional flat', label: 'Emotional flat', icon: createElement(Heart, { className: 'w-3.5 h-3.5' }) },
  { id: 'Engraving', label: 'Engraving', icon: createElement(Hash, { className: 'w-3.5 h-3.5' }) },
];

export const UNIT_COST_PER_IMAGE = 80;
export const TRANSPARENT_COST_PER_IMAGE = 10;
