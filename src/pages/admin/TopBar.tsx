import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { useTimezone } from '../../hooks/useTimezone';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import { ClockButton, ProfileMenu } from './components/topbar';
import AdminMobileBellMenu from './components/topbar/AdminMobileBellMenu';
import AdminDesktopNotifPill from './components/topbar/AdminDesktopNotifPill';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../hooks/useAgendaEquipeNotifications';

export interface ClientNotifEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
}

export interface VendorNotifEntry {
  vendorId: string;
  firstName: string;
  lastName: string;
  email: string;
  count: number;
  latestAt: string;
}

export interface ConfirmedProposalEntry {
  id: string;
  lead_name: string;
  created_at: string;
}

interface TopBarProps {
  breadcrumb: string;
  onMobileMenuToggle?: () => void;
  adminName?: string;
  unreadClientCount?: number;
  unreadClientEntries?: ClientNotifEntry[];
  onClientEntryClick?: (entry: ClientNotifEntry) => void;
  unreadVendorCount?: number;
  unreadVendorEntries?: VendorNotifEntry[];
  onVendorEntryClick?: (entry: VendorNotifEntry) => void;
  agendaPersoCount?: number;
  agendaPersoEntries?: AgendaNotifEntry[];
  onAgendaPersoEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  agendaEquipeCount?: number;
  agendaEquipeEntries?: AgendaEquipeNotifEntry[];
  onAgendaEquipeEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  propositionsCount?: number;
  propositionsEntries?: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
}

export default function TopBar({ breadcrumb, onMobileMenuToggle, adminName = 'Administrateur', unreadClientCount = 0, unreadClientEntries = [], onClientEntryClick, unreadVendorCount = 0, unreadVendorEntries = [], onVendorEntryClick, agendaPersoCount = 0, agendaPersoEntries = [], onAgendaPersoEntryClick, agendaEquipeCount = 0, agendaEquipeEntries = [], onAgendaEquipeEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: TopBarProps) {
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const t = useThemeTokens();
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [agendaDropdownOpen, setAgendaDropdownOpen] = useState(false);
  const [equipeDropdownOpen, setEquipeDropdownOpen] = useState(false);
  const [proposDropdownOpen, setProposDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifCategory, setMobileNotifCategory] = useState<string | null>(null);
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const agendaDropdownRef = useRef<HTMLDivElement>(null);
  const equipeDropdownRef = useRef<HTMLDivElement>(null);
  const proposDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifPanelRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(v => v + 1), 60_000); return () => clearInterval(id); }, []);
  const clock = getCurrentTime(timezone);

  const totalNotifCount = unreadClientCount + unreadVendorCount + agendaPersoCount + agendaEquipeCount + propositionsCount;

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(tgt)) setClientDropdownOpen(false);
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(tgt)) setVendorDropdownOpen(false);
      if (agendaDropdownRef.current && !agendaDropdownRef.current.contains(tgt)) setAgendaDropdownOpen(false);
      if (equipeDropdownRef.current && !equipeDropdownRef.current.contains(tgt)) setEquipeDropdownOpen(false);
      if (proposDropdownRef.current && !proposDropdownRef.current.contains(tgt)) setProposDropdownOpen(false);
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(tgt) && (!mobileNotifPanelRef.current || !mobileNotifPanelRef.current.contains(tgt))) setMobileNotifOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

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
        <span className="text-xs hidden md:inline" style={{ color: t.topbar.breadcrumbPrefix }}>Principal</span>
        <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: t.topbar.border }} />
        <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: t.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <AdminMobileBellMenu
          open={mobileNotifOpen}
          setOpen={setMobileNotifOpen}
          category={mobileNotifCategory}
          setCategory={setMobileNotifCategory}
          totalNotifCount={totalNotifCount}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadClientEntries}
          onClientEntryClick={onClientEntryClick}
          unreadVendorCount={unreadVendorCount}
          unreadVendorEntries={unreadVendorEntries}
          onVendorEntryClick={onVendorEntryClick}
          agendaPersoCount={agendaPersoCount}
          agendaPersoEntries={agendaPersoEntries}
          onAgendaPersoEntryClick={onAgendaPersoEntryClick}
          agendaEquipeCount={agendaEquipeCount}
          agendaEquipeEntries={agendaEquipeEntries}
          onAgendaEquipeEntryClick={onAgendaEquipeEntryClick}
          propositionsCount={propositionsCount}
          propositionsEntries={propositionsEntries}
          onPropositionEntryClick={onPropositionEntryClick}
          timezone={timezone}
          tokens={t}
          containerRef={mobileNotifRef}
          panelRef={mobileNotifPanelRef}
        />

        <AdminDesktopNotifPill
          clientDropdownOpen={clientDropdownOpen}
          setClientDropdownOpen={setClientDropdownOpen}
          vendorDropdownOpen={vendorDropdownOpen}
          setVendorDropdownOpen={setVendorDropdownOpen}
          agendaDropdownOpen={agendaDropdownOpen}
          setAgendaDropdownOpen={setAgendaDropdownOpen}
          equipeDropdownOpen={equipeDropdownOpen}
          setEquipeDropdownOpen={setEquipeDropdownOpen}
          proposDropdownOpen={proposDropdownOpen}
          setProposDropdownOpen={setProposDropdownOpen}
          clientDropdownRef={clientDropdownRef}
          vendorDropdownRef={vendorDropdownRef}
          agendaDropdownRef={agendaDropdownRef}
          equipeDropdownRef={equipeDropdownRef}
          proposDropdownRef={proposDropdownRef}
          unreadClientCount={unreadClientCount}
          unreadClientEntries={unreadClientEntries}
          onClientEntryClick={onClientEntryClick}
          unreadVendorCount={unreadVendorCount}
          unreadVendorEntries={unreadVendorEntries}
          onVendorEntryClick={onVendorEntryClick}
          agendaPersoCount={agendaPersoCount}
          agendaPersoEntries={agendaPersoEntries}
          onAgendaPersoEntryClick={onAgendaPersoEntryClick}
          agendaEquipeCount={agendaEquipeCount}
          agendaEquipeEntries={agendaEquipeEntries}
          onAgendaEquipeEntryClick={onAgendaEquipeEntryClick}
          propositionsCount={propositionsCount}
          propositionsEntries={propositionsEntries}
          onPropositionEntryClick={onPropositionEntryClick}
          tokens={t}
        />

        <ClockButton tzLabel={tzLabel} tzCode={tzCode} clock={clock} onClick={() => setTzModalOpen(true)} />
        <ProfileMenu adminName={adminName} tokens={t} />
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
