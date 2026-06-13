import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Menu, Clock } from 'lucide-react';
import { getUserTimezone, setUserTimezone, getTzCountryLabel, getTzCountryCode, getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { EditorButton } from '../admin/components/topbar/TopBarActionButtons';
import type { CSAView } from './CSASidebar';
import CSAProfileMenu from './CSAProfileMenu';

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
}

const VIEW_TITLES: Record<CSAView, string> = {
  overview: 'Dashboard',
  admins: 'Liste des admins',
  info: 'Info Super Admin',
  application: 'Application',
};

export default function CSATopBar({ activeView, csaUserId, companyId, companyName, firstName, lastName, onMobileMenu, topbarRef, editorZone3Bg }: Props) {
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
