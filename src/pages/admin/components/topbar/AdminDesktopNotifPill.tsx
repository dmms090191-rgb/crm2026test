import { MessageSquareText, CalendarDays, CalendarClock } from 'lucide-react';
import { NotificationButton, ClientNotifItem, VendorNotifItem, AgendaNotifItem, AgendaEquipeNotifItem, ConfirmedProposalItem, DropdownPanel, DropdownHeader, DropdownEmpty } from './index';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  clientDropdownOpen: boolean;
  setClientDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  vendorDropdownOpen: boolean;
  setVendorDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  agendaDropdownOpen: boolean;
  setAgendaDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  equipeDropdownOpen: boolean;
  setEquipeDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  proposDropdownOpen: boolean;
  setProposDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  clientDropdownRef: React.RefObject<HTMLDivElement>;
  vendorDropdownRef: React.RefObject<HTMLDivElement>;
  agendaDropdownRef: React.RefObject<HTMLDivElement>;
  equipeDropdownRef: React.RefObject<HTMLDivElement>;
  proposDropdownRef: React.RefObject<HTMLDivElement>;
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
  propositionsCount: number;
  propositionsEntries: ConfirmedProposalEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
  tokens: ThemeTokens;
}

export default function AdminDesktopNotifPill({
  clientDropdownOpen, setClientDropdownOpen,
  vendorDropdownOpen, setVendorDropdownOpen,
  agendaDropdownOpen, setAgendaDropdownOpen,
  equipeDropdownOpen, setEquipeDropdownOpen,
  proposDropdownOpen, setProposDropdownOpen,
  clientDropdownRef, vendorDropdownRef, agendaDropdownRef, equipeDropdownRef, proposDropdownRef,
  unreadClientCount, unreadClientEntries, onClientEntryClick,
  unreadVendorCount, unreadVendorEntries, onVendorEntryClick,
  agendaPersoCount, agendaPersoEntries, onAgendaPersoEntryClick,
  agendaEquipeCount, agendaEquipeEntries, onAgendaEquipeEntryClick,
  propositionsCount, propositionsEntries, onPropositionEntryClick,
  tokens: t,
}: Props) {
  return (
    <div
      className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
      style={{
        background: t.topbar.notifPillBg,
        border: `1px solid ${t.topbar.notifPillBorder}`,
      }}
    >
      <div className="relative" ref={clientDropdownRef}>
        <NotificationButton
          icon={<MessageSquareText className="w-[15px] h-[15px]" />}
          label="Client"
          count={unreadClientCount}
          iconColor={t.topbar.notifIcon}
          iconHoverColor={t.topbar.notifIconHover}
          labelColor={t.topbar.notifLabel}
          labelHoverColor={t.topbar.notifLabelHover}
          hoverBg={t.surface.hover}
          onClick={() => setClientDropdownOpen((prev: boolean) => !prev)}
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

      <div className="relative" ref={vendorDropdownRef}>
        <NotificationButton
          icon={<MessageSquareText className="w-[15px] h-[15px]" />}
          label="Vendeur"
          count={unreadVendorCount}
          iconColor={t.topbar.notifIcon}
          iconHoverColor={t.topbar.notifIconHover}
          labelColor={t.topbar.notifLabel}
          labelHoverColor={t.topbar.notifLabelHover}
          hoverBg={t.surface.hover}
          onClick={() => setVendorDropdownOpen((prev: boolean) => !prev)}
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

      <div className="relative" ref={agendaDropdownRef}>
        <NotificationButton
          icon={<CalendarDays className="w-[15px] h-[15px]" />}
          label="Agenda perso"
          count={agendaPersoCount}
          iconColor={t.topbar.notifIcon}
          iconHoverColor={t.topbar.notifIconHover}
          labelColor={t.topbar.notifLabel}
          labelHoverColor={t.topbar.notifLabelHover}
          hoverBg={t.surface.hover}
          onClick={() => setAgendaDropdownOpen((prev: boolean) => !prev)}
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
                    key={`${entry.rdvId}-${entry.type}`}
                    entry={entry}
                    tokens={t.dropdown}
                    onClick={() => { onAgendaPersoEntryClick?.(entry.rdvId, entry.type); setAgendaDropdownOpen(false); }}
                  />
                ))
              )}
            </div>
          </DropdownPanel>
        )}
      </div>

      <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

      <div className="relative" ref={equipeDropdownRef}>
        <NotificationButton
          icon={<CalendarDays className="w-[15px] h-[15px]" />}
          label="Agenda equipe"
          count={agendaEquipeCount}
          iconColor={t.topbar.notifIcon}
          iconHoverColor={t.topbar.notifIconHover}
          labelColor={t.topbar.notifLabel}
          labelHoverColor={t.topbar.notifLabelHover}
          hoverBg={t.surface.hover}
          onClick={() => setEquipeDropdownOpen((prev: boolean) => !prev)}
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
                    key={`${entry.rdvId}-${entry.type}`}
                    entry={entry}
                    tokens={t.dropdown}
                    onClick={() => { onAgendaEquipeEntryClick?.(entry.rdvId, entry.type); setEquipeDropdownOpen(false); }}
                  />
                ))
              )}
            </div>
          </DropdownPanel>
        )}
      </div>

      <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />

      <div className="relative" ref={proposDropdownRef}>
        <NotificationButton
          icon={<CalendarClock className="w-[15px] h-[15px]" />}
          label="RDV Confirmés"
          count={propositionsCount}
          iconColor={t.topbar.notifIcon}
          iconHoverColor={t.topbar.notifIconHover}
          labelColor={t.topbar.notifLabel}
          labelHoverColor={t.topbar.notifLabelHover}
          hoverBg={t.surface.hover}
          onClick={() => setProposDropdownOpen((prev: boolean) => !prev)}
        />
        {proposDropdownOpen && (
          <DropdownPanel tokens={t} width="w-80" align="right">
            <DropdownHeader label="RDV Confirmés" tokens={t} />
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
  );
}
