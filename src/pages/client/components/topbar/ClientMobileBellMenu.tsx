import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, CalendarCheck, CalendarClock, ChevronRight, Bell } from 'lucide-react';
import { ClientDropdownEmpty, NotifRow, ClientAgendaNotifItem, PropositionNotifItem } from './index';
import type { PropositionNotifEntry } from '../../ClientTopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { formatTodayInTz } from '../../../../lib/timezone';

interface Props {
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  totalNotifCount: number;
  unreadMessageCount: number;
  unreadLatestAt?: string | null;
  onMessageNotifClick: () => void;
  agendaCount: number;
  agendaEntries: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string) => void;
  propositionsCount: number;
  propositionsEntries: PropositionNotifEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
  timezone: string;
  tokens: ThemeTokens;
  containerRef: React.RefObject<HTMLDivElement>;
  panelRef?: React.RefObject<HTMLDivElement>;
}

export default function ClientMobileBellMenu({
  open, setOpen, category, setCategory, totalNotifCount,
  unreadMessageCount, unreadLatestAt, onMessageNotifClick,
  agendaCount, agendaEntries, onAgendaEntryClick,
  propositionsCount, propositionsEntries, onPropositionEntryClick,
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
                { key: 'messages', icon: <MessageCircle className="w-4 h-4" />, label: 'Messages', count: unreadMessageCount },
                { key: 'agenda', icon: <CalendarCheck className="w-4 h-4" />, label: 'Rendez-vous', count: agendaCount },
                { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions RDV', count: propositionsCount },
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
                  {category === 'messages' && 'Messages'}
                  {category === 'agenda' && 'Rendez-vous'}
                  {category === 'propositions' && 'Propositions RDV'}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {category === 'messages' && (
                  unreadMessageCount === 0 ? (
                    <ClientDropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    <NotifRow count={unreadMessageCount} latestAt={unreadLatestAt} tokens={t.dropdown} onClick={() => { onMessageNotifClick(); setOpen(false); setCategory(null); }} />
                  )
                )}
                {category === 'agenda' && (
                  agendaEntries.length === 0 ? (
                    <ClientDropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                  ) : (
                    agendaEntries.map(entry => (
                      <ClientAgendaNotifItem key={entry.rdvId} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId); setOpen(false); setCategory(null); }} />
                    ))
                  )
                )}
                {category === 'propositions' && (
                  propositionsEntries.length === 0 ? (
                    <ClientDropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
                  ) : (
                    propositionsEntries.map(entry => (
                      <PropositionNotifItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setOpen(false); setCategory(null); onPropositionEntryClick?.(entry.id); }} />
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
