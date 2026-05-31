import {
  Type, Hexagon, Smartphone, CaseUpper, Palette,
} from 'lucide-react';
import { createElement } from 'react';

export type Preset = 'typographic' | 'abstract_symbol' | 'app_icon' | 'monogram' | 'color_variant';
export type NumProposals = 1 | 2 | 4;
export type ColorPaletteId = 'single' | 'custom' | 'none';

export const MAX_SELECTED_PRESETS = 2;

export const PRESETS: { id: Preset; label: string; desc: string; icon: React.ReactNode; needsBrand: boolean }[] = [
  { id: 'typographic', label: 'Logo typographique', desc: 'Nom de marque en belle typographie', icon: createElement(Type, { className: 'w-4 h-4' }), needsBrand: true },
  { id: 'abstract_symbol', label: 'Symbole abstrait', desc: 'Symbole geometrique sans texte', icon: createElement(Hexagon, { className: 'w-4 h-4' }), needsBrand: false },
  { id: 'app_icon', label: 'Icone application', desc: 'Icone simple pour app', icon: createElement(Smartphone, { className: 'w-4 h-4' }), needsBrand: false },
  { id: 'monogram', label: 'Monogramme lettre', desc: "Monogramme a partir d'une initiale", icon: createElement(CaseUpper, { className: 'w-4 h-4' }), needsBrand: true },
  { id: 'color_variant', label: 'Variante couleur', desc: 'Wordmark avec palette de couleurs', icon: createElement(Palette, { className: 'w-4 h-4' }), needsBrand: true },
];

export const UNIT_COST_PER_IMAGE = 80;
export const TRANSPARENT_COST_PER_IMAGE = 10;
export const COST_WARNING_THRESHOLD = 400;
