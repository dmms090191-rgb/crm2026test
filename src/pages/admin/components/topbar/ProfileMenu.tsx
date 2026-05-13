import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sun, Moon, Monitor, Palette, Heart, Leaf, Crown, Cherry, Flame, Droplets, Zap } from 'lucide-react';
import { useTheme, type Theme } from '../../../../contexts/ThemeContext';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

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

interface ProfileMenuProps {
  adminName: string;
  tokens: ThemeTokens;
}

export default function ProfileMenu({ adminName, tokens }: ProfileMenuProps) {
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = adminName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const t = tokens.topbar;
  const d = tokens.dropdown;

  return (
    <div
      className="relative ml-2 pl-4"
      style={{ borderLeft: `1px solid ${t.notifDivider}` }}
      ref={dropdownRef}
    >
      <button
        onClick={() => setDropdownOpen(prev => !prev)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200"
        style={{
          background: dropdownOpen ? t.profileBtnBgOpen : t.profileBtnBg,
          border: `1px solid ${t.profileBtnBorder}`,
        }}
        onMouseEnter={e => {
          if (!dropdownOpen) e.currentTarget.style.background = t.profileBtnBgHover;
        }}
        onMouseLeave={e => {
          if (!dropdownOpen) e.currentTarget.style.background = t.profileBtnBg;
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            boxShadow: '0 0 12px rgba(14,165,233,0.3)',
          }}
        >
          {initials}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-semibold leading-tight" style={{ color: t.profileName }}>{adminName}</p>
          <p className="text-[9px] tracking-wider uppercase" style={{ color: t.profileRole }}>Super Admin</p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 hidden lg:block ${dropdownOpen ? 'rotate-180' : ''}`}
          style={{ color: t.chevron }}
        />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
          style={{
            background: d.bg,
            border: `1px solid ${d.border}`,
            boxShadow: d.shadow,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="py-1">
            {themeOptions.map(opt => (
              <ThemeOption
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                active={theme === opt.value}
                onClick={() => { setTheme(opt.value); }}
                tokens={d}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeOption({
  icon,
  label,
  active,
  onClick,
  tokens,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ThemeTokens['dropdown'];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors duration-150"
      style={{
        color: active ? tokens.activeCheck : (hovered ? tokens.itemTextHover : tokens.itemText),
        background: hovered ? tokens.itemBgHover : 'transparent',
      }}
    >
      {icon}
      <span className="font-medium flex-1 text-left">{label}</span>
      {active && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.activeCheck, boxShadow: `0 0 6px ${tokens.activeCheck}` }} />
      )}
    </button>
  );
}
