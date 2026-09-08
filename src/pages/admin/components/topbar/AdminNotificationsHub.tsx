import type { SuperAdminNotifEntry } from '../../../../hooks/useUnreadFromSuperAdmin';
import { CARDS, type NotifCategory } from './AdminNotificationCards';
import { CATEGORY_LABELS } from './AdminNotificationsHubParts';
import AdminNotificationDetail from './AdminNotificationDetail';
import NotifHubShell from '../../../../components/notifications/hub/NotifHubShell';
import type { HubCardDef } from '../../../../components/notifications/hub/notifHubTypes';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export interface NotificationsHubProps {
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
  canHideNotifCards?: boolean;
  hiddenNotifCards?: Set<string>;
  hiddenNotifCardsLoaded?: boolean;
  onToggleNotifCard?: (key: string) => void;
  canReorderNotifCards?: boolean;
  notifCardOrder?: string[];
  notifCardLabels?: Record<string, string>;
  notifReordering?: boolean;
  onStartNotifReorder?: () => void;
  onCancelNotifReorder?: () => void;
  onConfirmNotifReorder?: () => void;
  onMoveNotifDraft?: (from: number, to: number) => void;
  onRenameNotifDraft?: (key: string, newLabel: string) => void;
  onResetNotifDefault?: () => void;
}

/** Compteur reel de chaque categorie. Aucune valeur fabriquee. */
function countOf(key: NotifCategory, p: NotificationsHubProps): number {
  switch (key) {
    case 'client': return p.unreadClientCount;
    case 'vendeur': return p.unreadVendorCount;
    // Badge = nombre de CONVERSATIONS non lues, jamais de messages.
    // Une seule categorie pour tout ce qui vient du dessus : « Chat Direction ».
    case 'super-admin': return p.unreadSuperAdminCount;
    case 'agenda': return p.agendaPersoCount;
    case 'equipe': return p.agendaEquipeCount;
    case 'propositions': return p.proposalsCount;
    case 'rdv': return p.confirmedCount;
    case 'decalages': return p.rescheduleCount;
    case 'demandes-decalage': return p.rescheduleRequestCount;
  }
}

/**
 * Bulle « Notifications » du panel Societe.
 *
 * La cloche, le modal, l'en-tete, la grille de cartes et le mode Reorganiser
 * viennent de src/components/notifications/hub/ — le meme code que le panel
 * Commercial. Ce fichier ne declare plus que les neuf categories de la Societe
 * et le rendu de leur detail.
 */
export default function AdminNotificationsHub(props: NotificationsHubProps) {
  const cards: HubCardDef[] = CARDS.map(c => ({ ...c, count: countOf(c.key, props) }));

  return (
    <NotifHubShell
      tokens={props.tokens}
      cards={cards}
      // L en-tete du detail garde ses libelles historiques : « Messages clients »
      // la ou la carte dit « Client ».
      headerLabels={CATEGORY_LABELS}
      renderDetail={(key, close) => (
        <AdminNotificationDetail category={key as NotifCategory} {...props} onClose={close} />
      )}
      canReorder={props.canReorderNotifCards}
      canHide={props.canHideNotifCards}
      hiddenCards={props.hiddenNotifCards}
      onToggleCard={props.onToggleNotifCard}
      cardOrder={props.notifCardOrder}
      cardLabels={props.notifCardLabels}
      reordering={props.notifReordering}
      onStartReorder={props.onStartNotifReorder}
      onCancelReorder={props.onCancelNotifReorder}
      onConfirmReorder={props.onConfirmNotifReorder}
      onMoveDraft={props.onMoveNotifDraft}
      onRenameDraft={props.onRenameNotifDraft}
      onResetDefault={props.onResetNotifDefault}
    />
  );
}
