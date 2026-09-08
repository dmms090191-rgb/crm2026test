import type { SuperAdminNotifEntry } from '../../../../hooks/useUnreadFromSuperAdmin';
import { ClientNotifItem, AgendaNotifItem, AgendaEquipeNotifItem, ProposalNotifItem, ConfirmedProposalItem, DropdownEmpty } from './index';
import { RescheduleResponseItem, RescheduleRequestItem, SuperAdminNotifItem } from './NotificationItems';
import { BubbleRow } from '../../../../components/notifications/MessageBubblePopover';
import type { NotifCategory } from './AdminNotificationCards';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  category: NotifCategory;
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
  rescheduleRequestCount: number;
  rescheduleRequestEntries: ProposalNotifEntry[];
  onRescheduleRequestEntryClick?: (proposalId: string) => void;
  superAdminName?: string;
  /** Ligne secondaire, ex. « Groupe : Willness ». */
  superAdminSubtitle?: string;
  superAdminPreview?: string;
  superAdminAt?: string;
  unreadSuperAdminCount: number;
  unreadSuperAdminMessages?: number;
  onSuperAdminClick?: (superAdminId?: string) => void;
  superAdminEntries?: SuperAdminNotifEntry[];
  tokens: ThemeTokens;
  onClose: () => void;
}

export default function AdminNotificationDetail({ category, tokens: t, onClose, ...p }: Props) {
  const d = t.dropdown;

  switch (category) {
    case 'client':
      return p.unreadClientEntries.length === 0
        ? <DropdownEmpty text="Aucun nouveau message" tokens={t} />
        : <>{p.unreadClientEntries.map(e => (
            <ClientNotifItem key={e.clientAuthId} entry={e} tokens={d} onClick={() => { p.onClientEntryClick?.(e); onClose(); }} />
          ))}</>;

    case 'vendeur':
      return p.unreadVendorEntries.length === 0
        ? <DropdownEmpty text="Aucun nouveau message" tokens={t} />
        // Une ligne par COMMERCIAL : lire l un ne touche jamais les autres.
        : <>{p.unreadVendorEntries.map(e => (
            <BubbleRow
              key={e.vendorId}
              name={[e.firstName, e.lastName].filter(Boolean).join(' ') || e.email || 'Commercial'}
              preview={e.preview}
              at={e.latestAt}
              unread={e.count}
              d={d}
              onClick={() => { p.onVendorEntryClick?.(e); onClose(); }}
            />
          ))}</>;

    // Tout ce qui vient du dessus de la Societe : Groupe parent, et le cas
    // echeant Talvex. Une ligne par CONVERSATION, chacune nommant deja son
    // expediteur reel — le panel Societe n affiche qu une categorie.
    case 'super-admin':
      return p.unreadSuperAdminCount === 0
        ? <DropdownEmpty text="Aucun nouveau message de votre Direction" tokens={t} />
        : (p.superAdminEntries && p.superAdminEntries.length > 0
            ? <>{p.superAdminEntries.map(e => (
                <SuperAdminNotifItem key={e.superAdminId} count={e.count} name={e.name}
                  subtitle={e.subtitle} preview={e.preview} at={e.latestAt} tokens={d}
                  onClick={() => { p.onSuperAdminClick?.(e.superAdminId); onClose(); }} />
              ))}</>
            : <SuperAdminNotifItem count={p.unreadSuperAdminMessages ?? p.unreadSuperAdminCount}
                name={p.superAdminName ?? ''} subtitle={p.superAdminSubtitle}
                preview={p.superAdminPreview ?? ''} at={p.superAdminAt ?? ''} tokens={d}
                onClick={() => { p.onSuperAdminClick?.(); onClose(); }} />);

    case 'agenda':
      return p.agendaPersoEntries.length === 0
        ? <DropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
        : <>{p.agendaPersoEntries.map(e => (
            <AgendaNotifItem key={`${e.rdvId}-${e.type}`} entry={e} tokens={d} onClick={() => { p.onAgendaPersoEntryClick?.(e.rdvId, e.type); onClose(); }} />
          ))}</>;

    case 'equipe':
      return p.agendaEquipeEntries.length === 0
        ? <DropdownEmpty text="Aucun rendez-vous d'equipe imminent" tokens={t} />
        : <>{p.agendaEquipeEntries.map(e => (
            <AgendaEquipeNotifItem key={`${e.rdvId}-${e.type}`} entry={e} tokens={d} onClick={() => { p.onAgendaEquipeEntryClick?.(e.rdvId, e.type); onClose(); }} />
          ))}</>;

    case 'propositions':
      return p.proposalsEntries.length === 0
        ? <DropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
        : <>{p.proposalsEntries.map(e => (
            <ProposalNotifItem key={e.id} entry={e} tokens={d} onClick={() => { p.onProposalEntryClick?.(e.id); onClose(); }} />
          ))}</>;

    case 'rdv':
      return p.confirmedEntries.length === 0
        ? <DropdownEmpty text="Aucune nouvelle confirmation" tokens={t} />
        : <>{p.confirmedEntries.map(e => (
            <ConfirmedProposalItem key={e.id} entry={e} tokens={d} onClick={() => { p.onConfirmedEntryClick?.(e.id); onClose(); }} />
          ))}</>;

    case 'decalages':
      return p.rescheduleEntries.length === 0
        ? <DropdownEmpty text="Aucune reponse de decalage" tokens={t} />
        : <>{p.rescheduleEntries.map(e => (
            <RescheduleResponseItem key={e.id} entry={e} tokens={d} onClick={() => { p.onRescheduleEntryClick?.(e.id); onClose(); }} />
          ))}</>;

    case 'demandes-decalage':
      return p.rescheduleRequestEntries.length === 0
        ? <DropdownEmpty text="Aucune demande de decalage" tokens={t} />
        : <>{p.rescheduleRequestEntries.map(e => (
            <RescheduleRequestItem key={e.id} entry={e} tokens={d} onClick={() => { p.onRescheduleRequestEntryClick?.(e.id); onClose(); }} />
          ))}</>;
  }
}
