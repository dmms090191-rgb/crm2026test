import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu, Clock, MessageSquare } from 'lucide-react';
import { useTimezone } from '../../hooks/useTimezone';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import SAProfileMenu from './topbar/SAProfileMenu';

import type { AdminNotifEntry } from '../../hooks/useUnreadSuperAdminMessages';

const viewLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  admins: 'Liste admins',
  'chat-admin': 'Chat Admin',
  'documentation-crm': 'Documentation CRM',
  system: 'System',
  sauvegarde: 'Sauvegarde & restauration',
  'mon-compte': 'Mon compte',
  'tests-systeme': 'Tests Système',
};

interface SuperAdminTopBarProps {
  activeView: string;
  onMobileMenuToggle?: () => void;
  unreadAdminMsgCount?: number;
  unreadAdminMsgEntries?: AdminNotifEntry[];
  onAdminMsgEntryClick?: (entry: AdminNotifEntry) => void;
  saFirstName?: string;
  saLastName?: string;
}

export default function SuperAdminTopBar({ activeView, onMobileMenuToggle, unreadAdminMsgCount = 0, unreadAdminMsgEntries = [], onAdminMsgEntryClick, saFirstName = '', saLastName = '' }: SuperAdminTopBarProps) {
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const t = useThemeTokens();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const msgDropdownRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (msgDropdownRef.current && !msgDropdownRef.current.contains(e.target as Node)) {
        setMsgDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clock = getCurrentTime(timezone);

  return (
    <>
      <header
        className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0"
        style={{
          background: t.topbar.bg,
          borderBottom: `1px solid ${t.topbar.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: t.topbar.breadcrumbText }}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="text-xs hidden md:inline" style={{ color: t.topbar.breadcrumbPrefix }}>Super Admin</span>
          <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: t.topbar.border }} />
          <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: t.topbar.breadcrumbText }}>
            {viewLabels[activeView] || 'Dashboard'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={msgDropdownRef}>
            <button
              onClick={() => setMsgDropdownOpen(prev => !prev)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: unreadAdminMsgCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.04)',
                border: `1px solid ${unreadAdminMsgCount > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)'}`,
              }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: unreadAdminMsgCount > 0 ? '#f59e0b' : t.topbar.breadcrumbPrefix }} />
              <span className="text-[11px] font-medium" style={{ color: unreadAdminMsgCount > 0 ? '#f59e0b' : t.topbar.breadcrumbPrefix }}>Admin</span>
              {unreadAdminMsgCount > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }}>
                  {unreadAdminMsgCount > 99 ? '99+' : unreadAdminMsgCount}
                </span>
              )}
            </button>
            {msgDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50"
                style={{ background: t.dropdown.bg, border: `1px solid ${t.dropdown.border}`, boxShadow: t.dropdown.shadow, backdropFilter: 'blur(16px)' }}
              >
                <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
                  <p className="text-xs font-semibold" style={{ color: t.dropdown.itemText }}>Messages Admin</p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {unreadAdminMsgEntries.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-center" style={{ color: t.dropdown.itemText }}>Aucun message non lu</p>
                  ) : (
                    unreadAdminMsgEntries.map(entry => (
                      <button
                        key={entry.adminId}
                        onClick={() => { onAdminMsgEntryClick?.(entry); setMsgDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:opacity-80"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.background = t.dropdown.itemBgHover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                          {(entry.firstName || entry.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium whitespace-normal break-words" style={{ color: t.dropdown.itemText }}>
                            {(() => {
                              const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ');
                              return name ? `L'admin ${name} vous a envoyé un message.` : 'Un admin vous a envoyé un message.';
                            })()}
                          </p>
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: t.dropdown.itemTextHover }}>{entry.count} message{entry.count > 1 ? 's' : ''} non lu{entry.count > 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <ClockButton
            tzLabel={tzLabel}
            tzCode={tzCode}
            clock={clock}
            onClick={() => setTzModalOpen(true)}
          />
          <SAProfileMenu tokens={t} firstName={saFirstName} lastName={saLastName} />
        </div>
      </header>

      <TimezoneModal
        open={tzModalOpen}
        currentTimezone={timezone}
        onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
        onClose={() => setTzModalOpen(false)}
      />
    </>
  );
}

function ClockButton({ tzLabel, tzCode, clock, onClick }: { tzLabel: string; tzCode?: string; clock: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.15)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'; }}
    >
      <Clock className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
      <span className="text-xs font-medium hidden sm:block" style={{ color: '#94a3b8' }}>{tzLabel}</span>
      {tzCode && <span className="text-xs font-medium sm:hidden" style={{ color: '#94a3b8' }}>{tzCode}</span>}
      <span className="text-xs font-semibold font-mono" style={{ color: '#f59e0b' }}>{clock}</span>
    </button>
  );
}
