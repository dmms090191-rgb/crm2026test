import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, MessageSquare, CalendarDays, CalendarClock, ChevronRight, Bell } from 'lucide-react';
import { AdminNotifRow, ClientNotifRow, VendorAgendaNotifItem, VendorConfirmedItem, VendorDropdownEmpty } from './index';
import type { VendorClientNotifEntry, ConfirmedProposalEntry } from '../../VendorTopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { formatTodayInTz } from '../../../../lib/timezone';

interface Props {
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  totalNotifCount: number;
  unreadAdminCount: number;
  unreadAdminLatestAt?: string | null;
  onAdminNotifClick?: () => void;
  unreadClientCount: number;
  unreadClientEntries: VendorClientNotifEntry[];
  onClientEntryClick?: (entry: VendorClientNotifEntry) => void;
  agendaCount: number;
  agendaEntries: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  propositionsCount: number;
  propositionsEntries: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
  timezone: string;
  tokens: ThemeTokens;
  containerRef: React.RefObject<HTMLDivElement>;
  panelRef?: React.RefObject<HTMLDivElement>;
}

export default function VendorMobileBellMenu({
  open, setOpen, category, setCategory, totalNotifCount,
  unreadAdminCount, unreadAdminLatestAt, onAdminNotifClick,
  unreadClientCount, unreadClientEntries, onClientEntryClick,
  agendaCount, agendaEntries, onAgendaEntryClick,
  propositionsCount, propositionsEntries, onPropositionEntryClick,
  timezone, tokens, containerRef, panelRef: externalPanelRef,
}: Props) {
  const internalPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalPanelRef;

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        onClick={() => { setOpen((prev: boolean) => !prev); setCategory(null); }}
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
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed right-3 top-[3.75rem] w-[calc(100vw-24px)] max-w-72 rounded-xl overflow-hidden"
          style={{
            zIndex: 99999,
            background: tokens.dropdown.bg,
            border: `1px solid ${tokens.dropdown.border}`,
            boxShadow: `${tokens.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
          }}
        >
          {!category ? (
            <>
              <div className="px-3 py-2 border-b" style={{ borderColor: tokens.dropdown.border }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                  Notifications
                </p>
                <p className="text-[11px] mt-0.5 capitalize" style={{ color: tokens.dropdown.itemText }}>
                  {formatTodayInTz(timezone)}
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
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover-token"
                  style={{ '--hover-bg': tokens.dropdown.itemBgHover } as React.CSSProperties}
                  onClick={() => setCategory(item.key)}
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
                <button onClick={() => setCategory(null)} className="text-xs" style={{ color: tokens.topbar.notifIcon }}>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
                  {category === 'admin' && 'Messages Admin'}
                  {category === 'client' && 'Messages clients'}
                  {category === 'agenda' && 'Agenda'}
                  {category === 'rdv' && 'RDV Confirmes'}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {category === 'admin' && (
                  unreadAdminCount === 0 ? (
                    <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                  ) : (
                    <AdminNotifRow count={unreadAdminCount} latestAt={unreadAdminLatestAt} tokens={tokens.dropdown} onClick={() => { onAdminNotifClick?.(); setOpen(false); setCategory(null); }} />
                  )
                )}
                {category === 'client' && (
                  unreadClientEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
                  ) : (
                    unreadClientEntries.map(entry => (
                      <ClientNotifRow key={entry.clientAuthId} entry={entry} tokens={tokens.dropdown} onClick={() => { onClientEntryClick?.(entry); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'agenda' && (
                  agendaEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucun rendez-vous imminent" tokens={tokens} />
                  ) : (
                    agendaEntries.map(entry => (
                      <VendorAgendaNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={tokens.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId, entry.type); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'rdv' && (
                  propositionsEntries.length === 0 ? (
                    <VendorDropdownEmpty text="Aucune nouvelle confirmation" tokens={tokens} />
                  ) : (
                    propositionsEntries.map(entry => (
                      <VendorConfirmedItem key={entry.id} entry={entry} dropTokens={tokens.dropdown} onClick={() => { setOpen(false); setCategory(null); onPropositionEntryClick?.(entry.id); }} />
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
