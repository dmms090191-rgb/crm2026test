import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Palette, Bell, Clock } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import ThemeSelectorModal from '../../../components/theme/ThemeSelectorModal';
import PushNotificationSettings from '../../../components/notifications/PushNotificationSettings';
import SessionTimeoutModal from '../../../components/SessionTimeoutModal';
import { useSessionTimeoutConfig } from '../../../contexts/SessionTimeoutContext';
import { supabase } from '../../../lib/supabase';

export default function SAProfileMenu({ tokens, firstName, lastName }: { tokens: ReturnType<typeof useThemeTokens>; firstName?: string; lastName?: string }) {
  const { onTimeoutChanged } = useSessionTimeoutConfig();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (firstName && lastName)
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : firstName ? firstName.charAt(0).toUpperCase()
    : 'SA';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Super Admin';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
            <button
              onClick={() => { setDropdownOpen(false); setThemeModalOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150 hover:opacity-80"
              style={{ color: d.itemText }}
              onMouseEnter={e => { e.currentTarget.style.background = d.itemBgHover; e.currentTarget.style.color = d.itemTextHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = d.itemText; }}
            >
              <Palette className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Themes</span>
                <span className="text-[10px] opacity-60">Personnaliser l'apparence</span>
              </div>
            </button>
            <button
              onClick={() => { setDropdownOpen(false); setPushModalOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150 hover:opacity-80"
              style={{ color: d.itemText }}
              onMouseEnter={e => { e.currentTarget.style.background = d.itemBgHover; e.currentTarget.style.color = d.itemTextHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = d.itemText; }}
            >
              <Bell className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Notifications telephone</span>
                <span className="text-[10px] opacity-60">Alertes push en temps reel</span>
              </div>
            </button>
            <button
              onClick={() => { setDropdownOpen(false); setSessionModalOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150 hover:opacity-80"
              style={{ color: d.itemText }}
              onMouseEnter={e => { e.currentTarget.style.background = d.itemBgHover; e.currentTarget.style.color = d.itemTextHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = d.itemText; }}
            >
              <Clock className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Duree de session</span>
                <span className="text-[10px] opacity-60">Deconnexion automatique</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <ThemeSelectorModal open={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
      <PushNotificationSettings open={pushModalOpen} onClose={() => setPushModalOpen(false)} userId={userId} role="super_admin" companyId={null} tokens={tokens} />
      <SessionTimeoutModal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} tokens={tokens} role="super_admin" companyId={null} onSaved={onTimeoutChanged} />
    </div>
  );
}
