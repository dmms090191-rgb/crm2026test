import { MessageSquareText, CalendarDays, CalendarClock, CalendarCheck, Shield, RefreshCw } from 'lucide-react';
import { ClientNotifItem, VendorNotifItem, AgendaNotifItem, AgendaEquipeNotifItem, ProposalNotifItem, ConfirmedProposalItem } from './index';
import { NotifDropdownSection, SuperAdminNotifItem, RescheduleResponseItem, RescheduleRequestItem } from './NotificationItems';
import TopBarOverflowMenu, { type OverflowItem } from '../../../../components/TopBarOverflowMenu';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  clientDropdownOpen: boolean;
  setClientDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  vendorDropdownOpen: boolean;
  setVendorDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  superAdminDropdownOpen: boolean;
  setSuperAdminDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  agendaDropdownOpen: boolean;
  setAgendaDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  equipeDropdownOpen: boolean;
  setEquipeDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  proposDropdownOpen: boolean;
  setProposDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  confirmedDropdownOpen: boolean;
  setConfirmedDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  rescheduleDropdownOpen: boolean;
  setRescheduleDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  rescheduleReqDropdownOpen: boolean;
  setRescheduleReqDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  clientDropdownRef: React.RefObject<HTMLDivElement>;
  vendorDropdownRef: React.RefObject<HTMLDivElement>;
  superAdminDropdownRef: React.RefObject<HTMLDivElement>;
  agendaDropdownRef: React.RefObject<HTMLDivElement>;
  equipeDropdownRef: React.RefObject<HTMLDivElement>;
  proposDropdownRef: React.RefObject<HTMLDivElement>;
  confirmedDropdownRef: React.RefObject<HTMLDivElement>;
  rescheduleDropdownRef: React.RefObject<HTMLDivElement>;
  rescheduleReqDropdownRef: React.RefObject<HTMLDivElement>;
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
  tokens: ThemeTokens;
}

export default function AdminDesktopNotifPill({
  clientDropdownOpen, setClientDropdownOpen,
  vendorDropdownOpen, setVendorDropdownOpen,
  superAdminDropdownOpen, setSuperAdminDropdownOpen,
  agendaDropdownOpen, setAgendaDropdownOpen,
  equipeDropdownOpen, setEquipeDropdownOpen,
  proposDropdownOpen, setProposDropdownOpen,
  confirmedDropdownOpen, setConfirmedDropdownOpen,
  rescheduleDropdownOpen, setRescheduleDropdownOpen,
  rescheduleReqDropdownOpen, setRescheduleReqDropdownOpen,
  clientDropdownRef, vendorDropdownRef, superAdminDropdownRef, agendaDropdownRef, equipeDropdownRef, proposDropdownRef, confirmedDropdownRef, rescheduleDropdownRef, rescheduleReqDropdownRef,
  unreadClientCount, unreadClientEntries, onClientEntryClick,
  unreadVendorCount, unreadVendorEntries, onVendorEntryClick,
  agendaPersoCount, agendaPersoEntries, onAgendaPersoEntryClick,
  agendaEquipeCount, agendaEquipeEntries, onAgendaEquipeEntryClick,
  proposalsCount, proposalsEntries, onProposalEntryClick,
  confirmedCount, confirmedEntries, onConfirmedEntryClick,
  rescheduleCount, rescheduleEntries, onRescheduleEntryClick,
  rescheduleRequestCount = 0, rescheduleRequestEntries = [], onRescheduleRequestEntryClick,
  unreadSuperAdminCount = 0, onSuperAdminClick,
  tokens: t,
}: Props) {
  const ic = t.topbar.notifIcon;
  const ih = t.topbar.notifIconHover;
  const lc = t.topbar.notifLabel;
  const lh = t.topbar.notifLabelHover;
  const hb = t.surface.hover;
  const div = <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />;

  const overflowItems: OverflowItem[] = [
    { key: 'super-admin', icon: <Shield className="w-4 h-4" />, label: 'Super Admin', count: unreadSuperAdminCount, onClick: () => { onSuperAdminClick?.(); setSuperAdminDropdownOpen(false); } },
    { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', count: agendaEquipeCount, onClick: () => setEquipeDropdownOpen((p: boolean) => !p) },
    { key: 'decalages', icon: <RefreshCw className="w-4 h-4" />, label: 'Decalages', count: rescheduleCount, onClick: () => setRescheduleDropdownOpen((p: boolean) => !p) },
    { key: 'demandes-decalage', icon: <RefreshCw className="w-4 h-4" />, label: 'Demandes decalage', count: rescheduleRequestCount, onClick: () => setRescheduleReqDropdownOpen((p: boolean) => !p) },
  ];

  return (
    <div
      className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
      style={{ background: t.topbar.notifPillBg, border: `1px solid ${t.topbar.notifPillBorder}` }}
    >
      {/* PRIMARY: always visible on md+ */}
      <NotifDropdownSection dropdownRef={clientDropdownRef} open={clientDropdownOpen} setOpen={setClientDropdownOpen} icon={<MessageSquareText className="w-[15px] h-[15px]" />} label="Client" count={unreadClientCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} headerLabel="Messages clients" emptyText="Aucun nouveau message" tokens={t}>
        {unreadClientEntries.map(entry => (
          <ClientNotifItem key={entry.clientAuthId} entry={entry} tokens={t.dropdown} onClick={() => { onClientEntryClick?.(entry); setClientDropdownOpen(false); }} />
        ))}
      </NotifDropdownSection>

      {div}

      <NotifDropdownSection dropdownRef={vendorDropdownRef} open={vendorDropdownOpen} setOpen={setVendorDropdownOpen} icon={<MessageSquareText className="w-[15px] h-[15px]" />} label="Vendeur" count={unreadVendorCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} headerLabel="Messages vendeurs" emptyText="Aucun nouveau message" tokens={t}>
        {unreadVendorEntries.map(entry => (
          <VendorNotifItem key={entry.vendorId} entry={entry} tokens={t.dropdown} onClick={() => { onVendorEntryClick?.(entry); setVendorDropdownOpen(false); }} />
        ))}
      </NotifDropdownSection>

      {div}

      <NotifDropdownSection dropdownRef={agendaDropdownRef} open={agendaDropdownOpen} setOpen={setAgendaDropdownOpen} icon={<CalendarDays className="w-[15px] h-[15px]" />} label="Agenda perso" count={agendaPersoCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} dropdownAlign="right" headerLabel="Agenda perso" emptyText="Aucun rendez-vous imminent" tokens={t}>
        {agendaPersoEntries.map(entry => (
          <AgendaNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaPersoEntryClick?.(entry.rdvId, entry.type); setAgendaDropdownOpen(false); }} />
        ))}
      </NotifDropdownSection>

      {div}

      <NotifDropdownSection dropdownRef={proposDropdownRef} open={proposDropdownOpen} setOpen={setProposDropdownOpen} icon={<CalendarClock className="w-[15px] h-[15px]" />} label="Propositions RDV" count={proposalsCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} dropdownWidth="w-80" dropdownAlign="right" headerLabel="Propositions RDV" emptyText="Aucune nouvelle proposition" tokens={t}>
        {proposalsEntries.map(entry => (
          <ProposalNotifItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setProposDropdownOpen(false); onProposalEntryClick?.(entry.id); }} />
        ))}
      </NotifDropdownSection>

      {div}

      <NotifDropdownSection dropdownRef={confirmedDropdownRef} open={confirmedDropdownOpen} setOpen={setConfirmedDropdownOpen} icon={<CalendarCheck className="w-[15px] h-[15px]" />} label="RDV Confirmes" count={confirmedCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} dropdownWidth="w-80" dropdownAlign="right" headerLabel="RDV Confirmes" emptyText="Aucune nouvelle confirmation" tokens={t}>
        {confirmedEntries.map(entry => (
          <ConfirmedProposalItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setConfirmedDropdownOpen(false); onConfirmedEntryClick?.(entry.id); }} />
        ))}
      </NotifDropdownSection>

      {/* SECONDARY: visible only on xl+, otherwise in overflow menu */}
      <div className="hidden xl:contents">
        {div}
        <NotifDropdownSection dropdownRef={superAdminDropdownRef} open={superAdminDropdownOpen} setOpen={setSuperAdminDropdownOpen} icon={<Shield className="w-[15px] h-[15px]" />} label="Super Admin" count={unreadSuperAdminCount} iconColor={ic} iconHoverColor="#f59e0b" labelColor={lc} labelHoverColor="#f59e0b" hoverBg={hb} headerLabel="Notifications Super Admin" emptyText="Aucun nouveau message du Super Admin." tokens={t}>
          <SuperAdminNotifItem count={unreadSuperAdminCount} tokens={t.dropdown} onClick={() => { setSuperAdminDropdownOpen(false); onSuperAdminClick?.(); }} />
        </NotifDropdownSection>

        {div}
        <NotifDropdownSection dropdownRef={equipeDropdownRef} open={equipeDropdownOpen} setOpen={setEquipeDropdownOpen} icon={<CalendarDays className="w-[15px] h-[15px]" />} label="Agenda equipe" count={agendaEquipeCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} dropdownWidth="w-80" dropdownAlign="right" headerLabel="Agenda equipe" emptyText="Aucun rendez-vous d'equipe imminent" tokens={t}>
          {agendaEquipeEntries.map(entry => (
            <AgendaEquipeNotifItem key={`${entry.rdvId}-${entry.type}`} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEquipeEntryClick?.(entry.rdvId, entry.type); setEquipeDropdownOpen(false); }} />
          ))}
        </NotifDropdownSection>

        {div}
        <NotifDropdownSection dropdownRef={rescheduleDropdownRef} open={rescheduleDropdownOpen} setOpen={setRescheduleDropdownOpen} icon={<RefreshCw className="w-[15px] h-[15px]" />} label="Decalages" count={rescheduleCount} iconColor={ic} iconHoverColor={ih} labelColor={lc} labelHoverColor={lh} hoverBg={hb} dropdownWidth="w-80" dropdownAlign="right" headerLabel="Reponses decalages" emptyText="Aucune reponse de decalage" tokens={t}>
          {rescheduleEntries.map(entry => (
            <RescheduleResponseItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setRescheduleDropdownOpen(false); onRescheduleEntryClick?.(entry.id); }} />
          ))}
        </NotifDropdownSection>

        {div}
        <NotifDropdownSection dropdownRef={rescheduleReqDropdownRef} open={rescheduleReqDropdownOpen} setOpen={setRescheduleReqDropdownOpen} icon={<RefreshCw className="w-[15px] h-[15px]" />} label="Demandes decalage" count={rescheduleRequestCount} iconColor={ic} iconHoverColor="#f59e0b" labelColor={lc} labelHoverColor="#f59e0b" hoverBg={hb} dropdownWidth="w-80" dropdownAlign="right" headerLabel="Demandes de decalage" emptyText="Aucune demande de decalage" tokens={t}>
          {rescheduleRequestEntries.map(entry => (
            <RescheduleRequestItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setRescheduleReqDropdownOpen(false); onRescheduleRequestEntryClick?.(entry.id); }} />
          ))}
        </NotifDropdownSection>
      </div>

      {/* OVERFLOW "Plus" menu: visible only on md-xl */}
      <div className="xl:hidden flex items-center">
        {div}
        <TopBarOverflowMenu items={overflowItems} tokens={t} />
      </div>
    </div>
  );
}
