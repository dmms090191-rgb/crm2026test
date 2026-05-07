import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, CalendarDays, CalendarClock, ChevronRight, Menu, Bell } from 'lucide-react';
import { useTimezone } from '../../hooks/useTimezone';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import { NotificationButton, ClientNotifItem, VendorNotifItem, AgendaNotifItem, AgendaEquipeNotifItem, ConfirmedProposalItem, ClockButton, ProfileMenu, DropdownPanel, DropdownHeader, DropdownEmpty } from './components/topbar';
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
  onAgendaPersoEntryClick?: (rdvId: string) => void;
  agendaEquipeCount?: number;
  agendaEquipeEntries?: AgendaEquipeNotifEntry[];
  onAgendaEquipeEntryClick?: (rdvId: string) => void;
  propositionsCount?: number;
  propositionsEntries?: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
}

export default function TopBar({ breadcrumb, onMobileMenuToggle, adminName = 'Administrateur', unreadClientCount = 0, unreadClientEntries = [], onClientEntryClick, unreadVendorCount = 0, unreadVendorEntries = [], onVendorEntryClick, agendaPersoCount = 0, agendaPersoEntries = [], onAgendaPersoEntryClick, agendaEquipeCount = 0, agendaEquipeEntries = [], onAgendaEquipeEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: TopBarProps) {
  const { timezone, tzLabel, setTimezone } = useTimezone();
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
      className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0 transition-colors duration-300"
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
        <span className="text-xs hidden sm:inline" style={{ color: t.topbar.breadcrumbPrefix }}>Principal</span>
        <ChevronRight className="w-3 h-3 hidden sm:block" style={{ color: t.topbar.border }} />
        <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: t.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {/* Mobile bell button */}
        <div className="relative md:hidden" ref={mobileNotifRef}>
          <button
            onClick={() => { setMobileNotifOpen(prev => !prev); setMobileNotifCategory(null); }}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: t.topbar.notifIcon }}
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
                background: t.dropdown.bg,
                border: `1px solid ${t.dropdown.border}`,
                boxShadow: `${t.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
              }}
            >
              {!mobileNotifCategory ? (
                <>
                  <div className="px-3 py-2 border-b" style={{ borderColor: t.dropdown.border }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                      Notifications
                    </p>
                  </div>
                  {([
                    { key: 'client', icon: <MessageSquareText className="w-4 h-4" />, label: 'Client', count: unreadClientCount },
                    { key: 'vendeur', icon: <MessageSquareText className="w-4 h-4" />, label: 'Vendeur', count: unreadVendorCount },
                    { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda perso', count: agendaPersoCount },
                    { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', count: agendaEquipeCount },
                    { key: 'rdv', icon: <CalendarClock className="w-4 h-4" />, label: 'RDV Confirmes', count: propositionsCount },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      onClick={() => setMobileNotifCategory(item.key)}
                    >
                      <span style={{ color: t.topbar.notifIcon }}>{item.icon}</span>
                      <span className="text-sm flex-1" style={{ color: t.dropdown.itemText }}>{item.label}</span>
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
                  <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: t.dropdown.border }}>
                    <button onClick={() => setMobileNotifCategory(null)} className="text-xs" style={{ color: t.topbar.notifIcon }}>
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                      {mobileNotifCategory === 'client' && 'Messages clients'}
                      {mobileNotifCategory === 'vendeur' && 'Messages vendeurs'}
                      {mobileNotifCategory === 'agenda' && 'Agenda perso'}
                      {mobileNotifCategory === 'equipe' && 'Agenda equipe'}
                      {mobileNotifCategory === 'rdv' && 'RDV Confirmes'}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {mobileNotifCategory === 'client' && (
                      unreadClientEntries.length === 0 ? (
                        <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                      ) : (
                        unreadClientEntries.map(entry => (
                          <ClientNotifItem key={entry.clientAuthId} entry={entry} tokens={t.dropdown} onClick={() => { onClientEntryClick?.(entry); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'vendeur' && (
                      unreadVendorEntries.length === 0 ? (
                        <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                      ) : (
                        unreadVendorEntries.map(entry => (
                          <VendorNotifItem key={entry.vendorId} entry={entry} tokens={t.dropdown} onClick={() => { onVendorEntryClick?.(entry); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'agenda' && (
                      agendaPersoEntries.length === 0 ? (
                        <DropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                      ) : (
                        agendaPersoEntries.map(entry => (
                          <AgendaNotifItem key={entry.rdvId} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaPersoEntryClick?.(entry.rdvId); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'equipe' && (
                      agendaEquipeEntries.length === 0 ? (
                        <DropdownEmpty text="Aucun rendez-vous d'equipe imminent" tokens={t} />
                      ) : (
                        agendaEquipeEntries.map(entry => (
                          <AgendaEquipeNotifItem key={entry.rdvId} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEquipeEntryClick?.(entry.rdvId); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'rdv' && (
                      propositionsEntries.length === 0 ? (
                        <DropdownEmpty text="Aucune nouvelle confirmation" tokens={t} />
                      ) : (
                        propositionsEntries.map(entry => (
                          <ConfirmedProposalItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { onPropositionEntryClick?.(entry.id); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
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
            background: t.topbar.notifPillBg,
            border: `1px solid ${t.topbar.notifPillBorder}`,
          }}
        >
          {/* Client messages */}
          <div className="relative" ref={clientDropdownRef}>
            <NotificationButton
              icon={<MessageSquareText className="w-[15px] h-[15px]" />}
              label="Client"
              count={unreadClientCount}
              iconColor={t.topbar.notifIcon}
              iconHoverColor={t.topbar.notifIconHover}
              labelColor={t.topbar.notifLabel}
              labelHoverColor={t.topbar.notifLabelHover}
              onClick={() => setClientDropdownOpen(prev => !prev)}
            />
            {clientDropdownOpen && (
              <DropdownPanel tokens={t} width="w-72" align="left">
                <DropdownHeader label="Messages clients" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadClientEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    unreadClientEntries.map(entry => (
                      <ClientNotifItem
                        key={entry.clientAuthId}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => { onClientEntryClick?.(entry); setClientDropdownOpen(false); }}
                      />
                    ))
                  )}
                </div>
              </DropdownPanel>
            )}
          </div>

          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

          {/* Vendor messages */}
          <div className="relative" ref={vendorDropdownRef}>
            <NotificationButton
              icon={<MessageSquareText className="w-[15px] h-[15px]" />}
              label="Vendeur"
              count={unreadVendorCount}
              iconColor={t.topbar.notifIcon}
              iconHoverColor={t.topbar.notifIconHover}
              labelColor={t.topbar.notifLabel}
              labelHoverColor={t.topbar.notifLabelHover}
              onClick={() => setVendorDropdownOpen(prev => !prev)}
            />
            {vendorDropdownOpen && (
              <DropdownPanel tokens={t} width="w-72" align="left">
                <DropdownHeader label="Messages vendeurs" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadVendorEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    unreadVendorEntries.map(entry => (
                      <VendorNotifItem
                        key={entry.vendorId}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => { onVendorEntryClick?.(entry); setVendorDropdownOpen(false); }}
                      />
                    ))
                  )}
                </div>
              </DropdownPanel>
            )}
          </div>

          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

          {/* Agenda perso */}
          <div className="relative" ref={agendaDropdownRef}>
            <NotificationButton
              icon={<CalendarDays className="w-[15px] h-[15px]" />}
              label="Agenda perso"
              count={agendaPersoCount}
              iconColor={t.topbar.notifIcon}
              iconHoverColor={t.topbar.notifIconHover}
              labelColor={t.topbar.notifLabel}
              labelHoverColor={t.topbar.notifLabelHover}
              onClick={() => setAgendaDropdownOpen(prev => !prev)}
            />
            {agendaDropdownOpen && (
              <DropdownPanel tokens={t} width="w-72" align="right">
                <DropdownHeader label="Agenda perso" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {agendaPersoEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                  ) : (
                    agendaPersoEntries.map(entry => (
                      <AgendaNotifItem
                        key={entry.rdvId}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => { onAgendaPersoEntryClick?.(entry.rdvId); setAgendaDropdownOpen(false); }}
                      />
                    ))
                  )}
                </div>
              </DropdownPanel>
            )}
          </div>

          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

          {/* Agenda equipe */}
          <div className="relative" ref={equipeDropdownRef}>
            <NotificationButton
              icon={<CalendarDays className="w-[15px] h-[15px]" />}
              label="Agenda equipe"
              count={agendaEquipeCount}
              iconColor={t.topbar.notifIcon}
              iconHoverColor={t.topbar.notifIconHover}
              labelColor={t.topbar.notifLabel}
              labelHoverColor={t.topbar.notifLabelHover}
              onClick={() => setEquipeDropdownOpen(prev => !prev)}
            />
            {equipeDropdownOpen && (
              <DropdownPanel tokens={t} width="w-80" align="right">
                <DropdownHeader label="Agenda \u00e9quipe" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {agendaEquipeEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun rendez-vous d'\u00e9quipe imminent" tokens={t} />
                  ) : (
                    agendaEquipeEntries.map(entry => (
                      <AgendaEquipeNotifItem
                        key={entry.rdvId}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => { onAgendaEquipeEntryClick?.(entry.rdvId); setEquipeDropdownOpen(false); }}
                      />
                    ))
                  )}
                </div>
              </DropdownPanel>
            )}
          </div>

          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

          {/* RDV Confirmes */}
          <div className="relative" ref={proposDropdownRef}>
            <NotificationButton
              icon={<CalendarClock className="w-[15px] h-[15px]" />}
              label="RDV Confirmés"
              count={propositionsCount}
              iconColor={t.topbar.notifIcon}
              iconHoverColor={t.topbar.notifIconHover}
              labelColor={t.topbar.notifLabel}
              labelHoverColor={t.topbar.notifLabelHover}
              onClick={() => setProposDropdownOpen(prev => !prev)}
            />
            {proposDropdownOpen && (
              <DropdownPanel tokens={t} width="w-80" align="right">
                <DropdownHeader label="RDV Confirmes" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {propositionsEntries.length === 0 ? (
                    <DropdownEmpty text="Aucune nouvelle confirmation" tokens={t} />
                  ) : (
                    propositionsEntries.map(entry => (
                      <ConfirmedProposalItem
                        key={entry.id}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => { setProposDropdownOpen(false); onPropositionEntryClick?.(entry.id); }}
                      />
                    ))
                  )}
                </div>
              </DropdownPanel>
            )}
          </div>
        </div>

        <ClockButton tzLabel={tzLabel} clock={clock} onClick={() => setTzModalOpen(true)} />
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
