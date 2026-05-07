import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, MessageSquare, CalendarDays, CalendarClock, ChevronRight, ArrowLeft, Menu, Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import {
  VendorBadgeButton,
  VendorClockButton,
  VendorProfileDropdown,
  VendorDropdownPanel,
  VendorDropdownHeader,
  VendorDropdownEmpty,
  AdminNotifRow,
  ClientNotifRow,
  VendorAgendaNotifItem,
  VendorConfirmedItem,
} from './components/topbar';

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
  onAgendaEntryClick?: (rdvId: string) => void;
  propositionsCount?: number;
  propositionsEntries?: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
}

export default function VendorTopBar({ breadcrumb, onMobileMenuToggle, vendorName = 'Vendeur', isImpersonating, onBackToAdmin, unreadAdminCount = 0, unreadAdminLatestAt, onAdminNotifClick, unreadClientCount = 0, unreadClientEntries = [], onClientEntryClick, agendaCount = 0, agendaEntries = [], onAgendaEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: VendorTopBarProps) {
  const { theme, setTheme } = useTheme();
  const tokens = useThemeTokens();
  const { timezone, tzLabel, setTimezone } = useTimezone();
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
  const badgeColors = { iconColor: tokens.topbar.notifIcon, iconHoverColor: tokens.topbar.notifIconHover, labelColor: tokens.topbar.notifLabel, labelHoverColor: tokens.topbar.notifLabelHover };

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
      className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16"
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
        <span className="text-xs hidden sm:inline" style={{ color: tokens.topbar.breadcrumbPrefix }}>Principal</span>
        <ChevronRight className="w-3 h-3 hidden sm:block" style={{ color: tokens.topbar.chevron }} />
        <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: tokens.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1 min-w-0">
        {/* Mobile bell button */}
        <div className="relative md:hidden" ref={mobileNotifRef}>
          <button
            onClick={() => { setMobileNotifOpen(prev => !prev); setMobileNotifCategory(null); }}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: tokens.topbar.notifIcon }}
          >
            <Bell className="w-5 h-5" />
            {totalNotifCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                }}
              />
            )}
          </button>
          {mobileNotifOpen && createPortal(
            <div
              ref={mobileNotifPanelRef}
              className="fixed right-3 top-[3.75rem] w-[calc(100vw-24px)] max-w-72 rounded-xl overflow-hidden"
              style={{
                zIndex: 99999,
                background: tokens.dropdown.bg,
                border: `1px solid ${tokens.dropdown.border}`,
                boxShadow: `${tokens.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
              }}
            >
              {!mobileNotifCategory ? (
                <>
                  <div className="px-3 py-2 border-b" style={{ borderColor: tokens.dropdown.border }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                      Notifications
                    </p>
                  </div>
                  {([
                    { key: 'admin', icon: <MessageSquare className="w-4 h-4" />, label: 'Chat Admin', count: unreadAdminCount },
                    { key: 'client', icon: <MessageCircle className="w-4 h-4" />, label: 'Chat Client', count: unreadClientCount },
                    { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda', count: agendaCount },
                    { key: 'rdv', icon: <CalendarClock className="w-4 h-4" />, label: 'RDV Confirmes', count: propositionsCount },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      onClick={() => setMobileNotifCategory(item.key)}
                    >
                      <span style={{ color: tokens.topbar.notifIcon }}>{item.icon}</span>
                      <span className="text-sm flex-1" style={{ color: tokens.dropdown.itemText }}>{item.label}</span>
                      {item.count > 0 && (
                        <span
                          className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                          }}
                        >
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: tokens.dropdown.border }}>
                    <button onClick={() => setMobileNotifCategory(null)} className="text-xs" style={{ color: tokens.topbar.notifIcon }}>
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                      {mobileNotifCategory === 'admin' && 'Messages Admin'}
                      {mobileNotifCategory === 'client' && 'Messages clients'}
                      {mobileNotifCategory === 'agenda' && 'Agenda'}
                      {mobileNotifCategory === 'rdv' && 'RDV Confirmes'}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {mobileNotifCategory === 'admin' && (
                      unreadAdminCount === 0 ? (
                        <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                      ) : (
                        <AdminNotifRow count={unreadAdminCount} latestAt={unreadAdminLatestAt} tokens={tokens.dropdown} onClick={() => { handleNotifItemClick(); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                      )
                    )}
                    {mobileNotifCategory === 'client' && (
                      unreadClientEntries.length === 0 ? (
                        <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                      ) : (
                        unreadClientEntries.map(entry => (
                          <ClientNotifRow key={entry.clientAuthId} entry={entry} tokens={tokens.dropdown} onClick={() => { onClientEntryClick?.(entry); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'agenda' && (
                      agendaEntries.length === 0 ? (
                        <VendorDropdownEmpty text="Aucun rendez-vous imminent" tokens={tokens} />
                      ) : (
                        agendaEntries.map(entry => (
                          <VendorAgendaNotifItem key={entry.rdvId} entry={entry} tokens={tokens.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'rdv' && (
                      propositionsEntries.length === 0 ? (
                        <VendorDropdownEmpty text="Aucune nouvelle confirmation" tokens={tokens} />
                      ) : (
                        propositionsEntries.map(entry => (
                          <VendorConfirmedItem key={entry.id} entry={entry} dropTokens={tokens.dropdown} onClick={() => { setMobileNotifOpen(false); setMobileNotifCategory(null); onPropositionEntryClick?.(entry.id); }} />
                        ))
                      )
                    )}
                  </div>
                </>
              )}
            </div>,
            document.body
          )}
        </div>

        {/* Desktop notification pill */}
        <div
          className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
          style={{
            background: tokens.topbar.notifPillBg,
            border: `1px solid ${tokens.topbar.notifPillBorder}`,
          }}
        >
          <div className="relative" ref={adminDropdownRef}>
            <VendorBadgeButton icon={<MessageSquare className="w-[15px] h-[15px]" />} label="Chat Admin" count={unreadAdminCount} {...badgeColors} onClick={() => setAdminDropdownOpen(prev => !prev)} />
            {adminDropdownOpen && (
              <VendorDropdownPanel tokens={tokens} width="w-72" align="left">
                <VendorDropdownHeader label="Messages Admin" tokens={tokens} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadAdminCount === 0 ? (
                    <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                  ) : (
                    <AdminNotifRow
                      count={unreadAdminCount}
                      latestAt={unreadAdminLatestAt}
                      tokens={tokens.dropdown}
                      onClick={handleNotifItemClick}
                    />
                  )}
                </div>
              </VendorDropdownPanel>
            )}
          </div>
          <div className="w-px h-5" style={{ background: tokens.topbar.notifDivider }} />
          <div className="relative" ref={clientDropdownRef}>
            <VendorBadgeButton icon={<MessageCircle className="w-[15px] h-[15px]" />} label="Chat Client" count={unreadClientCount} {...badgeColors} onClick={() => setClientDropdownOpen(prev => !prev)} />
            {clientDropdownOpen && (
              <VendorDropdownPanel tokens={tokens} width="w-72" align="right">
                <VendorDropdownHeader label="Messages clients" tokens={tokens} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadClientEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                  ) : (
                    unreadClientEntries.map(entry => (
                      <ClientNotifRow
                        key={entry.clientAuthId}
                        entry={entry}
                        tokens={tokens.dropdown}
                        onClick={() => {
                          onClientEntryClick?.(entry);
                          setClientDropdownOpen(false);
                        }}
                      />
                    ))
                  )}
                </div>
              </VendorDropdownPanel>
            )}
          </div>
          <div className="w-px h-5" style={{ background: tokens.topbar.notifDivider }} />
          <div className="relative" ref={agendaDropdownRef}>
            <VendorBadgeButton icon={<CalendarDays className="w-[15px] h-[15px]" />} label="Agenda" count={agendaCount} {...badgeColors} onClick={() => setAgendaDropdownOpen(prev => !prev)} />
            {agendaDropdownOpen && (
              <VendorDropdownPanel tokens={tokens} width="w-72" align="right">
                <VendorDropdownHeader label="Agenda" tokens={tokens} />
                <div className="max-h-64 overflow-y-auto">
                  {agendaEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucun rendez-vous imminent" tokens={tokens} />
                  ) : (
                    agendaEntries.map(entry => (
                      <VendorAgendaNotifItem
                        key={entry.rdvId}
                        entry={entry}
                        tokens={tokens.dropdown}
                        onClick={() => {
                          onAgendaEntryClick?.(entry.rdvId);
                          setAgendaDropdownOpen(false);
                        }}
                      />
                    ))
                  )}
                </div>
              </VendorDropdownPanel>
            )}
          </div>
          <div className="w-px h-5" style={{ background: tokens.topbar.notifDivider }} />
          <div className="relative" ref={proposDropdownRef}>
            <VendorBadgeButton icon={<CalendarClock className="w-[15px] h-[15px]" />} label="RDV Confirmes" count={propositionsCount} {...badgeColors} onClick={() => setProposDropdownOpen(prev => !prev)} />
            {proposDropdownOpen && (
              <VendorDropdownPanel tokens={tokens} width="w-80" align="right">
                <VendorDropdownHeader label="RDV Confirmes" tokens={tokens} />
                <div className="max-h-64 overflow-y-auto">
                  {propositionsEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucune nouvelle confirmation" tokens={tokens} />
                  ) : (
                    propositionsEntries.map(entry => (
                      <VendorConfirmedItem
                        key={entry.id}
                        entry={entry}
                        dropTokens={tokens.dropdown}
                        onClick={() => {
                          setProposDropdownOpen(false);
                          onPropositionEntryClick?.(entry.id);
                        }}
                      />
                    ))
                  )}
                </div>
              </VendorDropdownPanel>
            )}
          </div>
        </div>

        <VendorClockButton tzLabel={tzLabel} clock={clock} onClick={() => setTzModalOpen(true)} />

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

