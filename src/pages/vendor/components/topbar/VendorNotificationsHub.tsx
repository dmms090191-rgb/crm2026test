import NotifHubShell from '../../../../components/notifications/hub/NotifHubShell';
import VendorNotificationDetail from './VendorNotificationDetail';
import { vendorNotifCards, type VendorNotifData } from './vendorNotifCategories';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

/**
 * Bulle « Notifications » du panel Commercial.
 *
 * Meme coque, meme cloche, meme modal et meme grille que le panel Societe :
 * tout vient de src/components/notifications/hub/. Ce fichier ne fait que
 * declarer les cinq categories du Commercial et le rendu de leur detail.
 *
 * Reorganiser / Masquer suivent la regle de la Sidebar V2 :
 *  - `canReorder` : personnalisation d'interface, ouverte au titulaire du panel.
 *  - `canHide`    : decide de ce qui existe, pilotera les forfaits, Talvex seul.
 */
export interface VendorNotificationsHubProps extends VendorNotifData {
  tokens: ThemeTokens;
  canReorderNotifCards?: boolean;
  canHideNotifCards?: boolean;
  hiddenNotifCards?: Set<string>;
  onToggleNotifCard?: (key: string) => void;
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

export default function VendorNotificationsHub(props: VendorNotificationsHubProps) {
  const {
    tokens, canReorderNotifCards, canHideNotifCards,
    hiddenNotifCards, onToggleNotifCard, notifCardOrder, notifCardLabels,
    notifReordering, onStartNotifReorder, onCancelNotifReorder, onConfirmNotifReorder,
    onMoveNotifDraft, onRenameNotifDraft, onResetNotifDefault,
    ...data
  } = props;

  return (
    <NotifHubShell
      tokens={tokens}
      cards={vendorNotifCards(data)}
      renderDetail={(key, close) => (
        <VendorNotificationDetail category={key} d={data} tokens={tokens} onClose={close} />
      )}
      canReorder={canReorderNotifCards}
      canHide={canHideNotifCards}
      hiddenCards={hiddenNotifCards}
      onToggleCard={onToggleNotifCard}
      cardOrder={notifCardOrder}
      cardLabels={notifCardLabels}
      reordering={notifReordering}
      onStartReorder={onStartNotifReorder}
      onCancelReorder={onCancelNotifReorder}
      onConfirmReorder={onConfirmNotifReorder}
      onMoveDraft={onMoveNotifDraft}
      onRenameDraft={onRenameNotifDraft}
      onResetDefault={onResetNotifDefault}
    />
  );
}
