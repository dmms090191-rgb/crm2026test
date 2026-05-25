import { RefObject, useState, useEffect } from 'react';
import { ChevronDown, Palette, Bell } from 'lucide-react';
import type { Theme } from '../../../../contexts/ThemeContext';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import ThemeSelectorModal from '../../../../components/theme/ThemeSelectorModal';
import PushNotificationSettings from '../../../../components/notifications/PushNotificationSettings';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { supabase } from '../../../../lib/supabase';

interface Props {
  vendorName: string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  tokens: ThemeTokens;
  open: boolean;
  setOpen: (fn: (prev: boolean) => boolean) => void;
  dropdownRef: RefObject<HTMLDivElement>;
}

export default function VendorProfileDropdown({ vendorName, tokens, open, setOpen, dropdownRef }: Props) {
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const companyId = useCompanyId();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
            <button
              onClick={() => { setOpen(() => false); setThemeModalOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150"
              style={{ color: tokens.dropdown.itemText }}
              onMouseEnter={e => { e.currentTarget.style.background = tokens.dropdown.itemBgHover; e.currentTarget.style.color = tokens.dropdown.itemTextHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.dropdown.itemText; }}
            >
              <Palette className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Themes</span>
                <span className="text-[10px] opacity-60">Personnaliser l'apparence</span>
              </div>
            </button>
            <button
              onClick={() => { setOpen(() => false); setPushModalOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150"
              style={{ color: tokens.dropdown.itemText }}
              onMouseEnter={e => { e.currentTarget.style.background = tokens.dropdown.itemBgHover; e.currentTarget.style.color = tokens.dropdown.itemTextHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.dropdown.itemText; }}
            >
              <Bell className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Notifications telephone</span>
                <span className="text-[10px] opacity-60">Alertes push en temps reel</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <ThemeSelectorModal open={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
      <PushNotificationSettings open={pushModalOpen} onClose={() => setPushModalOpen(false)} userId={userId} role="vendor" companyId={companyId} tokens={tokens} />
    </div>
  );
}
