import { VendorAgendaNotifItem, VendorProposalItem, VendorConfirmedItem, VendorDropdownEmpty } from './index';
import { BubbleRow } from '../../../../components/notifications/MessageBubblePopover';
import type { VendorNotifData } from './vendorNotifCategories';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

/**
 * Contenu d'une categorie du hub Notifications du Commercial.
 *
 * Les deux categories de messagerie utilisent BubbleRow — la meme ligne que les
 * panels Talvex, Groupe et Societe : identite reelle, apercu du vrai dernier
 * message, heure, compteur de non-lus.
 *
 * Les trois categories de rendez-vous conservent leurs lignes existantes : la
 * donnee disponible y est un nom de lead et une date, pas une conversation.
 * On n'invente aucun apercu qui n'existe pas en base.
 */
export default function VendorNotificationDetail({ category, d, tokens: t, onClose }: {
  category: string;
  d: VendorNotifData;
  tokens: ThemeTokens;
  onClose: () => void;
}) {
  const drop = t.dropdown;

  switch (category) {
    case 'admin':
      return d.unreadAdminCount === 0
        ? <VendorDropdownEmpty text="Aucun nouveau message" tokens={t} />
        : (
          <BubbleRow
            name={d.adminName}
            subtitle={d.adminSubtitle}
            preview={d.unreadAdminPreview ?? ''}
            at={d.unreadAdminLatestAt ?? ''}
            unread={d.unreadAdminCount}
            d={drop}
            onClick={() => { d.onAdminNotifClick?.(); onClose(); }}
          />
        );

    case 'client':
      return d.unreadClientEntries.length === 0
        ? <VendorDropdownEmpty text="Aucun nouveau message" tokens={t} />
        : <>{d.unreadClientEntries.map(e => (
            <BubbleRow
              key={e.clientAuthId}
              name={[e.prenom, e.nom].filter(Boolean).join(' ') || e.email || 'Client'}
              preview={e.preview}
              at={e.latestAt}
              unread={e.count}
              d={drop}
              onClick={() => { d.onClientEntryClick?.(e); onClose(); }}
            />
          ))}</>;

    case 'agenda':
      return d.agendaEntries.length === 0
        ? <VendorDropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
        : <>{d.agendaEntries.map(e => (
            <VendorAgendaNotifItem
              key={`${e.rdvId}-${e.type}`}
              entry={e}
              tokens={drop}
              onClick={() => { d.onAgendaEntryClick?.(e.rdvId, e.type); onClose(); }}
            />
          ))}</>;

    case 'propositions':
      return d.proposalsEntries.length === 0
        ? <VendorDropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
        : <>{d.proposalsEntries.map(e => (
            <VendorProposalItem
              key={e.id}
              entry={e}
              dropTokens={drop}
              onClick={() => { d.onProposalEntryClick?.(e.id); onClose(); }}
            />
          ))}</>;

    case 'rdv':
      return d.confirmedEntries.length === 0
        ? <VendorDropdownEmpty text="Aucune nouvelle confirmation" tokens={t} />
        : <>{d.confirmedEntries.map(e => (
            <VendorConfirmedItem
              key={e.id}
              entry={e}
              dropTokens={drop}
              onClick={() => { d.onConfirmedEntryClick?.(e.id); onClose(); }}
            />
          ))}</>;

    default:
      return null;
  }
}
