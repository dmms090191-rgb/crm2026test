import { useState } from 'react';
import { CalendarClock, Coins } from 'lucide-react';
import { detailAlerte, titreAlerte, type Alerte as AlerteImmo } from '../../../../lib/crmImmoAlertes';
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
  /* CRM Immo : les alertes viennent de la SOURCE UNIQUE, partagee avec la cloche du
     module. Elles ne sont presentes que si la Societe possede le module. */
  crmImmoEntries?: AlerteImmo[];
  onCrmImmoEntryClick?: (dossierId: string) => void;
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

    /*
     * CRM Immo. Ce `case` n est atteint que si la carte existe, et la carte n est emise
     * que pour une Societe qui possede le module (AdminNotificationsHub). Aucun controle
     * de droit a refaire ici : deux verites du droit, c est une panne intermittente.
     *
     * La cle d une ligne reprend la cle d unicite de la base —
     * (dossier_id, genre, periode) — pour qu une alerte ne puisse pas apparaitre deux fois.
     */
    case 'crm-immo':
      return (p.crmImmoEntries ?? []).length === 0
        ? <DropdownEmpty text="Aucune echeance immobiliere" tokens={t} />
        : <>{(p.crmImmoEntries ?? []).map(a => (
            <CrmImmoNotifItem
              key={`${a.dossier_id}|${a.genre}|${a.periode}`}
              alerte={a}
              tokens={d}
              onClick={() => { p.onCrmImmoEntryClick?.(a.dossier_id); onClose(); }}
            />
          ))}</>;
  }
}

/**
 * Une ligne d alerte CRM Immo dans le hub general.
 *
 * Elle est LOCALE a ce fichier, et volontairement : les composants de ligne de
 * src/pages/admin/components/topbar/ sont partages avec le panel Commercial, et en
 * elargir un pour un besoin propre a la Societe toucherait les deux.
 *
 * Le texte vient de libelleAlerte(), dans le modele pur : la cloche du module affiche
 * exactement la meme phrase. Deux formulations pour un meme evenement, et l utilisateur
 * se demanderait s il s agit de deux alertes.
 */
export function CrmImmoNotifItem(
  { alerte, tokens, onClick }: { alerte: AlerteImmo; tokens: ThemeTokens['dropdown']; onClick: () => void },
) {
  const [hovered, setHovered] = useState(false);
  const enRetard = alerte.joursRestants < 0;
  const quand = enRetard
    ? `en retard de ${Math.abs(alerte.joursRestants)} j`
    : alerte.joursRestants === 0 ? "aujourd'hui" : `dans ${alerte.joursRestants} j`;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`notif-crm-immo-${alerte.genre}-${alerte.dossier_id}`}
      className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors duration-150 text-left"
      style={{ background: hovered ? tokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: alerte.genre === 'fin_contrat'
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        }}
      >
        {alerte.genre === 'fin_contrat'
          ? <CalendarClock className="w-4 h-4 text-white" />
          : <Coins className="w-4 h-4 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold leading-tight" style={{ color: tokens.itemTextHover }}>
          {titreAlerte(alerte)}
        </p>
        {/*
          detailAlerte, et non libelleAlerte : la phrase entiere REPETERAIT le titre
          affiche juste au-dessus. Les deux moities mises bout a bout redonnent
          exactement la phrase de la cloche du module.

          break-words : mesure a 375 px, un nom sans espace de 38 caracteres passe a
          la ligne au lieu d elargir le panneau.
        */}
        <p className="text-[11px] mt-0.5 break-words" style={{ color: tokens.itemText }}>
          {detailAlerte(alerte)}
        </p>
        <p className="text-[10px] mt-1" style={{ color: enRetard ? '#ef4444' : tokens.itemText }}>
          {quand}
        </p>
      </div>
    </button>
  );
}
