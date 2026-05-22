import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, CalendarDays, CalendarClock, CalendarCheck, ChevronRight, Bell, Shield, RefreshCw } from 'lucide-react';
import { ClientNotifItem, VendorNotifItem, AgendaNotifItem, AgendaEquipeNotifItem, ProposalNotifItem, ConfirmedProposalItem, DropdownEmpty } from './index';
import { RescheduleResponseItem, RescheduleRequestItem } from './NotificationItems';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { formatTodayInTz } from '../../../../lib/timezone';

interface Props {
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  totalNotifCount: number;
  unreadClientCount: number;
  unreadClientEntries: ClientNotifEntry[];
  onClientEntryClick?: (entry: ClientNotifEntry) => void;
  unreadVendorCount: number;
  unreadVendorEntries: VendorNotifEntry[];
  onVendorEntryClick?: (entry: VendorNotifEntry) => void;
  agendaPersoCount: number;
  agendaPersoEntries: AgendaNotifEntry[];
  onAgendaPersoEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  agendaEquipeCount: number;
  agendaEquipeEntries: AgendaEquipeNotifEntry[];
  onAgendaEquipeEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  proposalsCount: number;
  proposalsEntries: ConfirmedProposalEntry[];
  onProposalEntryClick?: (proposalId: string) => void;
  confirmedCount: number;
  confirmedEntries: ConfirmedProposalEntry[];
  onConfirmedEntryClick?: (proposalId: string) => void;
  rescheduleCount: number;
  rescheduleEntries: ProposalNotifEntry[];
  onRescheduleEntryClick?: (proposalId: string) => void;
  rescheduleRequestCount?: number;
  rescheduleRequestEntries?: ProposalNotifEntry[];
  onRescheduleRequestEntryClick?: (proposalId: string) => void;
  unreadSuperAdminCount?: number;
  onSuperAdminClick?: () => void;
  timezone: string;
  tokens: ThemeTokens;
  containerRef: React.RefObject<HTMLDivElement>;
  panelRef?: React.RefObject<HTMLDivElement>;
}

export default function AdminMobileBellMenu({
  open, setOpen, category, setCategory, totalNotifCount,
  unreadClientCount, unreadClientEntries, onClientEntryClick,
  unreadVendorCount, unreadVendorEntries, onVendorEntryClick,
  agendaPersoCount, agendaPersoEntries, onAgendaPersoEntryClick,
  agendaEquipeCount, agendaEquipeEntries, onAgendaEquipeEntryClick,
  proposalsCount, proposalsEntries, onProposalEntryClick,
  confirmedCount, confirmedEntries, onConfirmedEntryClick,
  rescheduleCount, rescheduleEntries, onRescheduleEntryClick,
  rescheduleRequestCount = 0, rescheduleRequestEntries = [], onRescheduleRequestEntryClick,
  unreadSuperAdminCount = 0, onSuperAdminClick,
  timezone, tokens: t, containerRef, panelRef: externalPanelRef,
}: Props) {
  const internalPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalPanelRef;

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        onClick={() => { setOpen((prev: boolean) => !prev); setCategory(null); }}
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
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed right-3 top-[3.75rem] w-[calc(100vw-24px)] max-w-72 rounded-xl overflow-hidden"
          style={{
            zIndex: 99999,
            background: t.dropdown.bg,
            border: `1px solid ${t.dropdown.border}`,
            boxShadow: `${t.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
          }}
        >
          {!category ? (
            <>
              <div className="px-3 py-2 border-b" style={{ borderColor: t.dropdown.border }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                  Notifications
                </p>
                <p className="text-[11px] mt-0.5 capitalize" style={{ color: t.dropdown.itemText }}>
                  {formatTodayInTz(timezone)}
                </p>
              </div>
              {([
                { key: 'client', icon: <MessageSquareText className="w-4 h-4" />, label: 'Client', count: unreadClientCount },
                { key: 'vendeur', icon: <MessageSquareText className="w-4 h-4" />, label: 'Vendeur', count: unreadVendorCount },
                { key: 'super-admin', icon: <Shield className="w-4 h-4" />, label: 'Super Admin', count: unreadSuperAdminCount },
                { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda perso', count: agendaPersoCount },
                { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', count: agendaEquipeCount },
                { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions RDV', count: proposalsCount },
                { key: 'rdv', icon: <CalendarCheck className="w-4 h-4" />, label: 'RDV Confirmes', count: confirmedCount },
                { key: 'decalages', icon: <RefreshCw className="w-4 h-4" />, label: 'Decalages', count: rescheduleCount },
                { key: 'demandes-decalage', icon: <RefreshCw className="w-4 h-4" />, label: 'Demandes decalage', count: rescheduleRequestCount },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover-token"
                  style={{ '--hover-bg': t.dropdown.itemBgHover } as React.CSSProperties}
                  onClick={() => setCategory(item.key)}
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
                <button onClick={() => setCategory(null)} className="text-xs" style={{ color: t.topbar.notifIcon }}>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                  {category === 'client' && 'Messages clients'}
                  {category === 'vendeur' && 'Messages vendeurs'}
                  {category === 'super-admin' && 'Notifications Super Admin'}
                  {category === 'agenda' && 'Agenda perso'}
                  {category === 'equipe' && 'Agenda equipe'}
                  {category === 'propositions' && 'Propositions RDV'}
                  {category === 'rdv' && 'RDV Confirmes'}
                  {category === 'decalages' && 'Reponses decalages'}
                  {category === 'demandes-decalage' && 'Demandes de decalage'}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {category === 'client' && (
                  unreadClientEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    unreadClientEntries.map(entry => (
                      <ClientNotifItem key={entry.clientAuthId} entry={entry} tokens={t.dropdown} onClick={() => { onClientEntryClick?.(entry); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'vendeur' && (
                  unreadVendorEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    unreadVendorEntries.map(entry => (
                      <VendorNotifItem key={entry.vendorId} entry={entry} tokens={t.dropdown} onClick={() => { onVendorEntryClick?.(entry); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'super-admin' && (
                  unreadSuperAdminCount === 0 ? (
                    <DropdownEmpty text="Aucun nouveau message du Super Admin." tokens={t} />
                  ) : (
                    <button
                      className="flex items-center gap-3 w-full px-3 py-3 text-left transition-colors"
                      style={{ color: t.dropdown.itemText }}
                      onClick={() => { onSuperAdminClick?.(); setOpen(false); setCategory(null); }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>S</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: t.dropdown.itemText }}>Vous avez reçu un message du Super Admin.</p>
                        <p className="text-[10px] mt-0.5" style={{ color: t.dropdown.itemTextHover }}>{unreadSuperAdminCount} message{unreadSuperAdminCount > 1 ? 's' : ''} non lu{unreadSuperAdminCount > 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  )
                )}
                {category === 'agenda' && (
                  agendaPersoEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                  ) : (
                    agendaPersoEntries.map(entry => (
                      <AgendaNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaPersoEntryClick?.(entry.rdvId, entry.type); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'equipe' && (
                  agendaEquipeEntries.length === 0 ? (
                    <DropdownEmpty text="Aucun rendez-vous d'equipe imminent" tokens={t} />
                  ) : (
                    agendaEquipeEntries.map(entry => (
                      <AgendaEquipeNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEquipeEntryClick?.(entry.rdvId, entry.type); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'propositions' && (
                  proposalsEntries.length === 0 ? (
                    <DropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
                  ) : (
                    proposalsEntries.map(entry => (
                      <ProposalNotifItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { onProposalEntryClick?.(entry.id); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'rdv' && (
                  confirmedEntries.length === 0 ? (
                    <DropdownEmpty text="Aucune nouvelle confirmation" tokens={t} />
                  ) : (
                    confirmedEntries.map(entry => (
                      <ConfirmedProposalItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { onConfirmedEntryClick?.(entry.id); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'decalages' && (
                  rescheduleEntries.length === 0 ? (
                    <DropdownEmpty text="Aucune reponse de decalage" tokens={t} />
                  ) : (
                    rescheduleEntries.map(entry => (
                      <RescheduleResponseItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { onRescheduleEntryClick?.(entry.id); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'demandes-decalage' && (
                  rescheduleRequestEntries.length === 0 ? (
                    <DropdownEmpty text="Aucune demande de decalage" tokens={t} />
                  ) : (
                    rescheduleRequestEntries.map(entry => (
                      <RescheduleRequestItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { onRescheduleRequestEntryClick?.(entry.id); setOpen(false); setCategory(null); }} />
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
  );
}
