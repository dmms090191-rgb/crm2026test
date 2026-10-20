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
import type { Alerte as AlerteImmo } from '../../../../lib/crmImmoAlertes';

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
  /*
   * ---------- CRM IMMO, DIXIEME CATEGORIE ----------
   *
   * `crmImmoActif` est le DROIT, pas un reglage d affichage : il vient de
   * has_crm_immo_access(company_id), via l unique appel de useCrmImmoAccess dans
   * AdminDashboard. Quand il est faux, la carte n est pas masquee — elle n est pas
   * EMISE. Meme principe que l onglet de la barre laterale, et pour la meme raison :
   * un droit n a rien a faire dans un reglage de visibilite que l utilisateur peut
   * remettre a zero.
   *
   * Les alertes viennent de la SOURCE UNIQUE (useCrmImmoAlertes, appele une seule fois
   * dans AdminDashboard) : le hub et la cloche du module montrent exactement la meme
   * chose, et un traitement d un cote se voit immediatement de l autre.
   */
  crmImmoActif?: boolean;
  crmImmoCount?: number;
  crmImmoEntries?: AlerteImmo[];
  onCrmImmoEntryClick?: (dossierId: string) => void;
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
    // Alertes CRM Immo non lues ET non traitees — le predicat du badge, fige dans
    // src/lib/crmImmoAlertes.ts et documente en base sur crm_immo_etats.
    case 'crm-immo': return p.crmImmoCount ?? 0;
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
  /*
   * Pas de carte fantome, pas de carte desactivee : sans le droit, l entree ne sort
   * pas de ce filtre. Les neuf autres categories ne sont jamais filtrees — elles
   * existent pour toutes les Societes.
   */
  const cards: HubCardDef[] = CARDS
    .filter(c => c.key !== 'crm-immo' || props.crmImmoActif === true)
    .map(c => ({ ...c, count: countOf(c.key, props) }));

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
