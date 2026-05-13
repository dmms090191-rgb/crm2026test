import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ArrowLeft, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import { VendorClockButton, VendorProfileDropdown } from './components/topbar';
import VendorMobileBellMenu from './components/topbar/VendorMobileBellMenu';
import VendorDesktopNotifPill from './components/topbar/VendorDesktopNotifPill';

export interface VendorClientNotifEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
}

export interface ConfirmedProposalEntry {
  id: string;
  lead_name: string;
  created_at: string;
}

interface VendorTopBarProps {
  breadcrumb: string;
  onMobileMenuToggle?: () => void;
  vendorName?: string;
  isImpersonating?: boolean;
  onBackToAdmin?: () => void;
  unreadAdminCount?: number;
  unreadAdminLatestAt?: string | null;
  onAdminNotifClick?: () => void;
  unreadClientCount?: number;
  unreadClientEntries?: VendorClientNotifEntry[];
  onClientEntryClick?: (entry: VendorClientNotifEntry) => void;
  agendaCount?: number;
  agendaEntries?: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  propositionsCount?: number;
  propositionsEntries?: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
}

export default function VendorTopBar({ breadcrumb, onMobileMenuToggle, vendorName = 'Vendeur', isImpersonating, onBackToAdmin, unreadAdminCount = 0, unreadAdminLatestAt, onAdminNotifClick, unreadClientCount = 0, unreadClientEntries = [], onClientEntryClick, agendaCount = 0, agendaEntries = [], onAgendaEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: VendorTopBarProps) {
  const { theme, setTheme } = useTheme();
  const tokens = useThemeTokens();
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [agendaDropdownOpen, setAgendaDropdownOpen] = useState(false);
  const [proposDropdownOpen, setProposDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifCategory, setMobileNotifCategory] = useState<string | null>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const agendaDropdownRef = useRef<HTMLDivElement>(null);
  const proposDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifPanelRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        setAdminDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
      if (agendaDropdownRef.current && !agendaDropdownRef.current.contains(e.target as Node)) {
        setAgendaDropdownOpen(false);
      }
      if (proposDropdownRef.current && !proposDropdownRef.current.contains(e.target as Node)) {
        setProposDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(e.target as Node) && (!mobileNotifPanelRef.current || !mobileNotifPanelRef.current.contains(e.target as Node))) {
        setMobileNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clock = getCurrentTime(timezone);
  const totalNotifCount = unreadAdminCount + unreadClientCount + agendaCount + propositionsCount;
  const badgeColors = { iconColor: tokens.topbar.notifIcon, iconHoverColor: tokens.topbar.notifIconHover, labelColor: tokens.topbar.notifLabel, labelHoverColor: tokens.topbar.notifLabelHover, hoverBg: tokens.surface.hover };

  function handleNotifItemClick() {
    setAdminDropdownOpen(false);
    onAdminNotifClick?.();
  }

  return (
    <div className="flex-shrink-0">
      {isImpersonating && (
        <div
          className="flex items-center justify-between px-6 py-2"
          style={{ background: 'rgba(52,211,153,0.08)', borderBottom: '1px solid rgba(52,211,153,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Mode admin — vous visualisez le panel de <span className="font-bold">{vendorName}</span></span>
          </div>
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-400 transition-all hover:scale-105"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <ArrowLeft className="w-3 h-3" />
            Retour admin
          </button>
        </div>
      )}
    <header
      className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16"
      style={{
        background: tokens.topbar.bg,
        borderBottom: `1px solid ${tokens.topbar.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: tokens.topbar.breadcrumbText }}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-xs hidden md:inline" style={{ color: tokens.topbar.breadcrumbPrefix }}>Principal</span>
        <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: tokens.topbar.chevron }} />
        <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: tokens.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <VendorMobileBellMenu
          open={mobileNotifOpen}
          setOpen={setMobileNotifOpen}
          category={mobileNotifCategory}
          setCategory={setMobileNotifCategory}
          totalNotifCount={totalNotifCount}
          unreadAdminCount={unreadAdminCount}
          unreadAdminLatestAt={unreadAdminLatestAt}
          onAdminNotifClick={() => { handleNotifItemClick(); }}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadClientEntries}
          onClientEntryClick={onClientEntryClick}
          agendaCount={agendaCount}
          agendaEntries={agendaEntries}
          onAgendaEntryClick={onAgendaEntryClick}
          propositionsCount={propositionsCount}
          propositionsEntries={propositionsEntries}
          onPropositionEntryClick={onPropositionEntryClick}
          timezone={timezone}
          tokens={tokens}
          containerRef={mobileNotifRef}
          panelRef={mobileNotifPanelRef}
        />

        <VendorDesktopNotifPill
          adminDropdownOpen={adminDropdownOpen}
          setAdminDropdownOpen={setAdminDropdownOpen}
          clientDropdownOpen={clientDropdownOpen}
          setClientDropdownOpen={setClientDropdownOpen}
          agendaDropdownOpen={agendaDropdownOpen}
          setAgendaDropdownOpen={setAgendaDropdownOpen}
          proposDropdownOpen={proposDropdownOpen}
          setProposDropdownOpen={setProposDropdownOpen}
          adminDropdownRef={adminDropdownRef}
          clientDropdownRef={clientDropdownRef}
          agendaDropdownRef={agendaDropdownRef}
          proposDropdownRef={proposDropdownRef}
          unreadAdminCount={unreadAdminCount}
          unreadAdminLatestAt={unreadAdminLatestAt}
          onAdminNotifClick={handleNotifItemClick}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadClientEntries}
          onClientEntryClick={onClientEntryClick}
          agendaCount={agendaCount}
          agendaEntries={agendaEntries}
          onAgendaEntryClick={onAgendaEntryClick}
          propositionsCount={propositionsCount}
          propositionsEntries={propositionsEntries}
          onPropositionEntryClick={onPropositionEntryClick}
          tokens={tokens}
          badgeColors={badgeColors}
        />

        <VendorClockButton tzLabel={tzLabel} tzCode={tzCode} clock={clock} onClick={() => setTzModalOpen(true)} />

        <VendorProfileDropdown
          vendorName={vendorName}
          theme={theme}
          setTheme={setTheme}
          tokens={tokens}
          open={profileDropdownOpen}
          setOpen={setProfileDropdownOpen}
          dropdownRef={profileDropdownRef}
        />
      </div>
    </header>

    <TimezoneModal
      open={tzModalOpen}
      currentTimezone={timezone}
      onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
      onClose={() => setTzModalOpen(false)}
    />
    </div>
  );
}
