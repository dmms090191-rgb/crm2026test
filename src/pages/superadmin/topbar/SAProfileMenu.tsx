import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Sun, Moon, Monitor, Palette, Heart, Leaf, Crown, Cherry, Flame, Droplets, Zap } from 'lucide-react';
import { useTheme, type Theme } from '../../../contexts/ThemeContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Sombre', icon: <Moon className="w-3.5 h-3.5" /> },
  { value: 'light', label: 'Clair', icon: <Sun className="w-3.5 h-3.5" /> },
  { value: 'graphite', label: 'Graphite', icon: <Monitor className="w-3.5 h-3.5" /> },
  { value: 'beige', label: 'Beige Premium', icon: <Palette className="w-3.5 h-3.5" /> },
  { value: 'rose', label: 'Violet Royal Premium', icon: <Heart className="w-3.5 h-3.5" /> },
  { value: 'emerald', label: 'Vert Emeraude Premium', icon: <Leaf className="w-3.5 h-3.5" /> },
  { value: 'luxury', label: 'Blanc Luxe', icon: <Crown className="w-3.5 h-3.5" /> },
  { value: 'pink', label: 'Rose Premium', icon: <Cherry className="w-3.5 h-3.5" /> },
  { value: 'red', label: 'Rouge Premium', icon: <Droplets className="w-3.5 h-3.5" /> },
  { value: 'orange', label: 'Orange Premium', icon: <Flame className="w-3.5 h-3.5" /> },
  { value: 'yellow', label: 'Jaune Premium', icon: <Zap className="w-3.5 h-3.5" /> },
];

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
  tokens: ReturnType<typeof useThemeTokens>['dropdown'];
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

export default function SAProfileMenu({ tokens, firstName, lastName }: { tokens: ReturnType<typeof useThemeTokens>; firstName?: string; lastName?: string }) {
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (firstName && lastName)
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : firstName ? firstName.charAt(0).toUpperCase()
    : 'SA';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Super Admin';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tTopbar = tokens.topbar;
  const d = tokens.dropdown;

  return (
    <div
      className="relative ml-2 pl-4"
      style={{ borderLeft: `1px solid ${tTopbar.notifDivider}` }}
      ref={dropdownRef}
    >
      <button
        onClick={() => setDropdownOpen(prev => !prev)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200"
        style={{
          background: dropdownOpen ? tTopbar.profileBtnBgOpen : tTopbar.profileBtnBg,
          border: `1px solid ${tTopbar.profileBtnBorder}`,
        }}
        onMouseEnter={e => {
          if (!dropdownOpen) e.currentTarget.style.background = tTopbar.profileBtnBgHover;
        }}
        onMouseLeave={e => {
          if (!dropdownOpen) e.currentTarget.style.background = tTopbar.profileBtnBg;
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            boxShadow: '0 0 12px rgba(245,158,11,0.3)',
          }}
        >
          {initials}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-semibold leading-tight" style={{ color: tTopbar.profileName }}>{displayName}</p>
          <p className="text-[9px] tracking-wider uppercase" style={{ color: tTopbar.profileRole }}>Super Admin</p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 hidden lg:block ${dropdownOpen ? 'rotate-180' : ''}`}
          style={{ color: tTopbar.chevron }}
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
                onClick={() => setTheme(opt.value)}
                tokens={d}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
