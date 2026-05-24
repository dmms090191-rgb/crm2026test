import { Sun, Moon, Monitor, Palette, Heart, Leaf, Crown, Cherry, Flame, Droplets, Zap, Building2 } from 'lucide-react';
import type { Theme } from '../../../../contexts/ThemeContext';

export const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Sombre', icon: <Moon className="w-3.5 h-3.5" /> },
  { value: 'light', label: 'Clair', icon: <Sun className="w-3.5 h-3.5" /> },
  { value: 'graphite', label: 'Graphite', icon: <Monitor className="w-3.5 h-3.5" /> },
  { value: 'beige', label: 'Beige Premium', icon: <Palette className="w-3.5 h-3.5" /> },
  { value: 'rose', label: 'Violet Royal Premium', icon: <Heart className="w-3.5 h-3.5" /> },
  { value: 'emerald', label: 'Vert Émeraude Premium', icon: <Leaf className="w-3.5 h-3.5" /> },
  { value: 'luxury', label: 'Blanc Luxe', icon: <Crown className="w-3.5 h-3.5" /> },
  { value: 'pink', label: 'Rose Premium', icon: <Cherry className="w-3.5 h-3.5" /> },
  { value: 'red', label: 'Rouge Premium', icon: <Droplets className="w-3.5 h-3.5" /> },
  { value: 'orange', label: 'Orange Premium', icon: <Flame className="w-3.5 h-3.5" /> },
  { value: 'yellow', label: 'Jaune Premium', icon: <Zap className="w-3.5 h-3.5" /> },
  { value: 'highlevel_light', label: 'HighLevel Clair', icon: <Building2 className="w-3.5 h-3.5" /> },
];
