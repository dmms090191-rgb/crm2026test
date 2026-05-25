import { MessageCircle, MessageSquare, CalendarDays, CalendarClock, CalendarCheck } from 'lucide-react';
import { VendorBadgeButton, AdminNotifRow, ClientNotifRow, VendorAgendaNotifItem, VendorProposalItem, VendorConfirmedItem, VendorDropdownPanel, VendorDropdownHeader, VendorDropdownEmpty } from './index';
import TopBarOverflowMenu, { type OverflowItem } from '../../../../components/TopBarOverflowMenu';
import type { VendorClientNotifEntry, ConfirmedProposalEntry } from '../../VendorTopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  adminDropdownOpen: boolean;
  setAdminDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  clientDropdownOpen: boolean;
  setClientDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  agendaDropdownOpen: boolean;
  setAgendaDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  proposDropdownOpen: boolean;
  setProposDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  confirmedDropdownOpen: boolean;
  setConfirmedDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  adminDropdownRef: React.RefObject<HTMLDivElement>;
  clientDropdownRef: React.RefObject<HTMLDivElement>;
  agendaDropdownRef: React.RefObject<HTMLDivElement>;
  proposDropdownRef: React.RefObject<HTMLDivElement>;
  confirmedDropdownRef: React.RefObject<HTMLDivElement>;
  unreadAdminCount: number;
  unreadAdminLatestAt?: string | null;
  onAdminNotifClick: () => void;
  unreadClientCount: number;
  unreadClientEntries: VendorClientNotifEntry[];
  onClientEntryClick?: (entry: VendorClientNotifEntry) => void;
  agendaCount: number;
  agendaEntries: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  proposalsCount: number;
  proposalsEntries: ConfirmedProposalEntry[];
  onProposalEntryClick?: (proposalId: string) => void;
  confirmedCount: number;
  confirmedEntries: ConfirmedProposalEntry[];
  onConfirmedEntryClick?: (proposalId: string) => void;
  tokens: ThemeTokens;
  badgeColors: { iconColor: string; iconHoverColor: string; labelColor: string; labelHoverColor: string; hoverBg?: string };
}

export default function VendorDesktopNotifPill({
  adminDropdownOpen, setAdminDropdownOpen,
  clientDropdownOpen, setClientDropdownOpen,
  agendaDropdownOpen, setAgendaDropdownOpen,
  proposDropdownOpen, setProposDropdownOpen,
  confirmedDropdownOpen, setConfirmedDropdownOpen,
  adminDropdownRef, clientDropdownRef, agendaDropdownRef, proposDropdownRef, confirmedDropdownRef,
  unreadAdminCount, unreadAdminLatestAt, onAdminNotifClick,
  unreadClientCount, unreadClientEntries, onClientEntryClick,
  agendaCount, agendaEntries, onAgendaEntryClick,
  proposalsCount, proposalsEntries, onProposalEntryClick,
  confirmedCount, confirmedEntries, onConfirmedEntryClick,
  tokens, badgeColors,
}: Props) {
  const div = <div className="w-px h-5" style={{ background: tokens.topbar.notifDivider }} />;

  const overflowItems: OverflowItem[] = [
    { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions RDV', count: proposalsCount, onClick: () => setProposDropdownOpen((p: boolean) => !p) },
    { key: 'confirmed', icon: <CalendarCheck className="w-4 h-4" />, label: 'RDV Confirmes', count: confirmedCount, onClick: () => setConfirmedDropdownOpen((p: boolean) => !p) },
  ];

  return (
    <div
      className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
      style={{ background: tokens.topbar.notifPillBg, border: `1px solid ${tokens.topbar.notifPillBorder}` }}
    >
      {/* PRIMARY: always visible */}
      <div className="relative" ref={adminDropdownRef}>
        <VendorBadgeButton icon={<MessageSquare className="w-[15px] h-[15px]" />} label="Chat Admin" count={unreadAdminCount} {...badgeColors} onClick={() => setAdminDropdownOpen((prev: boolean) => !prev)} />
        {adminDropdownOpen && (
          <VendorDropdownPanel tokens={tokens} width="w-72" align="left">
            <VendorDropdownHeader label="Messages Admin" tokens={tokens} />
            <div className="max-h-64 overflow-y-auto">
              {unreadAdminCount === 0 ? (
                <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
              ) : (
                <AdminNotifRow count={unreadAdminCount} latestAt={unreadAdminLatestAt} tokens={tokens.dropdown} onClick={onAdminNotifClick} />
              )}
            </div>
          </VendorDropdownPanel>
        )}
      </div>
      {div}
      <div className="relative" ref={clientDropdownRef}>
        <VendorBadgeButton icon={<MessageCircle className="w-[15px] h-[15px]" />} label="Chat Client" count={unreadClientCount} {...badgeColors} onClick={() => setClientDropdownOpen((prev: boolean) => !prev)} />
        {clientDropdownOpen && (
          <VendorDropdownPanel tokens={tokens} width="w-72" align="right">
            <VendorDropdownHeader label="Messages clients" tokens={tokens} />
            <div className="max-h-64 overflow-y-auto">
              {unreadClientEntries.length === 0 ? (
                <VendorDropdownEmpty text="Aucun nouveau message" tokens={tokens} />
              ) : (
                unreadClientEntries.map(entry => (
                  <ClientNotifRow key={entry.clientAuthId} entry={entry} tokens={tokens.dropdown} onClick={() => { onClientEntryClick?.(entry); setClientDropdownOpen(false); }} />
                ))
              )}
            </div>
          </VendorDropdownPanel>
        )}
      </div>
      {div}
      <div className="relative" ref={agendaDropdownRef}>
        <VendorBadgeButton icon={<CalendarDays className="w-[15px] h-[15px]" />} label="Agenda" count={agendaCount} {...badgeColors} onClick={() => setAgendaDropdownOpen((prev: boolean) => !prev)} />
        {agendaDropdownOpen && (
          <VendorDropdownPanel tokens={tokens} width="w-72" align="right">
            <VendorDropdownHeader label="Agenda" tokens={tokens} />
            <div className="max-h-64 overflow-y-auto">
              {agendaEntries.length === 0 ? (
                <VendorDropdownEmpty text="Aucun rendez-vous imminent" tokens={tokens} />
              ) : (
                agendaEntries.map(entry => (
                  <VendorAgendaNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={tokens.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId, entry.type); setAgendaDropdownOpen(false); }} />
                ))
              )}
            </div>
          </VendorDropdownPanel>
        )}
      </div>

      {/* SECONDARY: visible only on xl+ */}
      <div className="hidden xl:contents">
        {div}
        <div className="relative" ref={proposDropdownRef}>
          <VendorBadgeButton icon={<CalendarClock className="w-[15px] h-[15px]" />} label="Propositions RDV" count={proposalsCount} {...badgeColors} onClick={() => setProposDropdownOpen((prev: boolean) => !prev)} />
          {proposDropdownOpen && (
            <VendorDropdownPanel tokens={tokens} width="w-80" align="right">
              <VendorDropdownHeader label="Propositions RDV" tokens={tokens} />
              <div className="max-h-64 overflow-y-auto">
                {proposalsEntries.length === 0 ? (
                  <VendorDropdownEmpty text="Aucune nouvelle proposition" tokens={tokens} />
                ) : (
                  proposalsEntries.map(entry => (
                    <VendorProposalItem key={entry.id} entry={entry} dropTokens={tokens.dropdown} onClick={() => { setProposDropdownOpen(false); onProposalEntryClick?.(entry.id); }} />
                  ))
                )}
              </div>
            </VendorDropdownPanel>
          )}
        </div>
        {div}
        <div className="relative" ref={confirmedDropdownRef}>
          <VendorBadgeButton icon={<CalendarCheck className="w-[15px] h-[15px]" />} label="RDV Confirmes" count={confirmedCount} {...badgeColors} onClick={() => setConfirmedDropdownOpen((prev: boolean) => !prev)} />
          {confirmedDropdownOpen && (
            <VendorDropdownPanel tokens={tokens} width="w-80" align="right">
              <VendorDropdownHeader label="RDV Confirmes" tokens={tokens} />
              <div className="max-h-64 overflow-y-auto">
                {confirmedEntries.length === 0 ? (
                  <VendorDropdownEmpty text="Aucune nouvelle confirmation" tokens={tokens} />
                ) : (
                  confirmedEntries.map(entry => (
                    <VendorConfirmedItem key={entry.id} entry={entry} dropTokens={tokens.dropdown} onClick={() => { setConfirmedDropdownOpen(false); onConfirmedEntryClick?.(entry.id); }} />
                  ))
                )}
              </div>
            </VendorDropdownPanel>
          )}
        </div>
      </div>

      {/* OVERFLOW "Plus" menu: visible only on md-xl */}
      <div className="xl:hidden flex items-center">
        {div}
        <TopBarOverflowMenu items={overflowItems} tokens={tokens} />
      </div>
    </div>
  );
}
