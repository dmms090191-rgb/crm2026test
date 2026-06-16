import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Menu, Clock, MessageSquare } from 'lucide-react';
import { getUserTimezone, setUserTimezone, getTzCountryLabel, getTzCountryCode, getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { EditorButton } from '../admin/components/topbar/TopBarActionButtons';
import type { CSAView } from './CSASidebar';
import CSAProfileMenu from './CSAProfileMenu';
import type { AdminNotifEntry } from '../../hooks/useUnreadCSAAdminMessages';

interface Props {
  activeView: CSAView;
  csaUserId: string;
  companyId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  onMobileMenu: () => void;
  topbarRef?: React.RefObject<HTMLElement | null>;
  editorZone3Bg?: string;
  unreadAdminMsgCount?: number;
  unreadAdminMsgEntries?: AdminNotifEntry[];
  onAdminMsgEntryClick?: (adminId: string) => void;
}

const VIEW_TITLES: Record<CSAView, string> = {
  overview: 'Dashboard',
  admins: 'Liste des distributeurs',
  info: 'Info Super Admin',
  'chat-admin': 'Chat Admin',
  application: 'Application',
  site: 'Site',
};

export default function CSATopBar({ activeView, csaUserId, companyId, companyName, firstName, lastName, onMobileMenu, topbarRef, editorZone3Bg, unreadAdminMsgCount = 0, unreadAdminMsgEntries = [], onAdminMsgEntryClick }: Props) {
  const t = useThemeTokens();
  const editor = useEditorModeSafe();
  const tzStorageKey = `csa_timezone_${csaUserId}`;
  const [timezone, setTimezoneState] = useState(() => localStorage.getItem(tzStorageKey) || getUserTimezone('company_super_admin', csaUserId));
  const [clock, setClock] = useState(() => getCurrentTime(timezone));
  const [showTzModal, setShowTzModal] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(getCurrentTime(timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const handleTzSelect = useCallback((tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem(tzStorageKey, tz);
    setUserTimezone(tz, 'company_super_admin', csaUserId);
    setClock(getCurrentTime(tz));
    setShowTzModal(false);
  }, [tzStorageKey, csaUserId]);

  const tTopbar = t.topbar;
  const [clockHovered, setClockHovered] = useState(false);
  const [msgDropOpen, setMsgDropOpen] = useState(false);
  const msgDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!msgDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (msgDropRef.current && !msgDropRef.current.contains(e.target as Node)) setMsgDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [msgDropOpen]);

  return (
    <>
      <header
        ref={topbarRef}
        className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0"
        style={{ background: editorZone3Bg || tTopbar.bg, borderBottom: `1px solid ${tTopbar.border}`, backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button onClick={onMobileMenu} className="md:hidden p-1.5 rounded-lg transition-colors" style={{ color: tTopbar.breadcrumbText }}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs hidden md:inline" style={{ color: tTopbar.breadcrumbPrefix || tTopbar.breadcrumbSep }}>SUPER ADMIN</span>
          <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: tTopbar.border }} />
          <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: tTopbar.breadcrumbText }}>{VIEW_TITLES[activeView]}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {editor && (
            <EditorButton editorOpen={editor.editorOpen} onToggle={editor.editorOpen ? editor.closeEditor : editor.openEditor} />
          )}

          <div className="relative" ref={msgDropRef}>
            <button
              onClick={() => setMsgDropOpen(prev => !prev)}
              className="relative p-2 rounded-xl transition-all duration-200"
              style={{
                background: msgDropOpen ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: unreadAdminMsgCount > 0 ? '#f59e0b' : tTopbar.breadcrumbText,
              }}
              title="Messages admin"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              {unreadAdminMsgCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500 shadow-sm">
                  {unreadAdminMsgCount > 99 ? '99+' : unreadAdminMsgCount}
                </span>
              )}
            </button>
            {msgDropOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl border overflow-hidden z-50"
                style={{ background: t.card.bg, borderColor: t.card.border }}
              >
                <div className="px-4 py-2.5 border-b" style={{ borderColor: t.card.border }}>
                  <p className="text-xs font-semibold" style={{ color: t.card.foreground }}>Messages non lus</p>
                </div>
                {unreadAdminMsgEntries.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs" style={{ color: t.card.mutedForeground }}>Aucun message non lu</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {unreadAdminMsgEntries.map(entry => (
                      <button
                        key={entry.adminId}
                        onClick={() => { onAdminMsgEntryClick?.(entry.adminId); setMsgDropOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/5"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                          {(entry.firstName?.[0] || entry.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: t.card.foreground }}>
                            {entry.firstName || entry.lastName ? `${entry.firstName} ${entry.lastName}`.trim() : entry.email}
                          </p>
                          <p className="text-[10px]" style={{ color: t.card.mutedForeground }}>
                            {entry.count} message{entry.count > 1 ? 's' : ''} non lu{entry.count > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500">{entry.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowTzModal(true)}
            onMouseEnter={() => setClockHovered(true)}
            onMouseLeave={() => setClockHovered(false)}
            className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{
              background: clockHovered ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${clockHovered ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)'}`,
            }}
          >
            <Clock className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-medium hidden sm:block" style={{ color: '#64748b' }}>{getTzCountryLabel(timezone)}</span>
            <span className="text-xs font-medium sm:hidden" style={{ color: '#64748b' }}>{getTzCountryCode(timezone)}</span>
            <span className="text-xs font-semibold font-mono" style={{ color: '#f59e0b' }}>{clock}</span>
          </button>

          <CSAProfileMenu
            csaUserId={csaUserId}
            companyId={companyId}
            firstName={firstName}
            lastName={lastName}
            companyName={companyName}
          />
        </div>
      </header>

      <TimezoneModal open={showTzModal} currentTimezone={timezone} onSelect={handleTzSelect} onClose={() => setShowTzModal(false)} />
    </>
  );
}
