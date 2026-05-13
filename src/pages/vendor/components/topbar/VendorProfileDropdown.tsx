import { RefObject } from 'react';
import { ChevronDown, Sun, Moon, Monitor, Palette, Heart, Leaf, Crown, Cherry, Flame, Droplets, Zap } from 'lucide-react';
import type { Theme } from '../../../../contexts/ThemeContext';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import VendorThemeOption from './VendorThemeOption';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
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
];

interface Props {
  vendorName: string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  tokens: ThemeTokens;
  open: boolean;
  setOpen: (fn: (prev: boolean) => boolean) => void;
  dropdownRef: RefObject<HTMLDivElement>;
}

export default function VendorProfileDropdown({ vendorName, theme, setTheme, tokens, open, setOpen, dropdownRef }: Props) {
  return (
    <div
      className="relative ml-2 pl-4"
      style={{ borderLeft: `1px solid ${tokens.surface.borderLight}` }}
      ref={dropdownRef}
    >
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200"
        style={{
          background: open ? tokens.topbar.profileBtnBgOpen : tokens.topbar.profileBtnBg,
          border: `1px solid ${tokens.topbar.profileBtnBorder}`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = tokens.topbar.profileBtnBgHover; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = tokens.topbar.profileBtnBg; }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            boxShadow: '0 0 16px rgba(14,165,233,0.35)',
          }}
        >
          {vendorName.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2) || 'V'}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-semibold leading-tight" style={{ color: tokens.topbar.profileName }}>{vendorName}</p>
          <p className="text-[9px] tracking-wider uppercase" style={{ color: tokens.topbar.profileRole }}>Vendeur</p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 hidden lg:block ${open ? 'rotate-180' : ''}`}
          style={{ color: tokens.topbar.chevron }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
          style={{
            background: tokens.dropdown.bg,
            border: `1px solid ${tokens.dropdown.border}`,
            boxShadow: tokens.dropdown.shadow,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="py-1">
            {themeOptions.map(opt => (
              <VendorThemeOption
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                active={theme === opt.value}
                onClick={() => setTheme(opt.value)}
                tokens={tokens.dropdown}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
