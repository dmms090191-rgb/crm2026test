import { useState } from 'react';
import { Eye, LogIn, MessageSquare } from 'lucide-react';
import PremiumActionsModal from '../../components/action-menu/premium/PremiumActionsModal';
import PremiumHiddenActionsModal from '../../components/action-menu/premium/PremiumHiddenActionsModal';
import type { ActionDef } from '../../components/action-menu/ActionModal';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useActionOrder } from '../../hooks/useActionOrder';
import { useActionVisibility } from '../../hooks/useActionVisibility';
import type { CSAAdminUser } from './CSAAdminsList';

/**
 * Deux concepts, deux cles, sur la ligne `user_preferences` du GROUPE.
 *   ORDER_KEY  -> preference UX du Groupe (il la choisit lui-meme)
 *   HIDDEN_KEY -> controle fonctionnel de Talvex (le Groupe la subit)
 * Elles ne se croisent jamais : masquer ne reordonne rien, et inversement.
 */
const ORDER_KEY = 'csa_societe_actions';
const HIDDEN_KEY = 'csa_societe_actions_hidden';

interface Props {
  admin: CSAAdminUser;
  onClose: () => void;
  onDetail: (admin: CSAAdminUser) => void;
  onConnect: (admin: CSAAdminUser) => void;
  onMessage: (admin: CSAAdminUser) => void;
  /** Id Auth du GROUPE proprietaire des reglages — le Groupe VISUALISE en Visu. */
  csaAuthId?: string | null;
  /**
   * Vrai uniquement quand Talvex Administrateur visualise ce Groupe.
   * Meme signal que le masquage d'onglets de la sidebar, calcule dans le
   * routeur : `role === 'super_admin' || visu.originalRole === 'super_admin'`.
   */
  canManageVisibility?: boolean;
}

export default function CSAAdminActionsModal({
  admin, onClose, onDetail, onConnect, onMessage,
  csaAuthId = null, canManageVisibility = false,
}: Props) {
  const tokens = useThemeTokens();
  const [hiddenListOpen, setHiddenListOpen] = useState(false);
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email;

  // Les actions telles que le CODE les definit : c'est la reference.
  // Leur comportement n'est jamais touche, ni par l'ordre ni par le masquage.
  const actions: ActionDef[] = [
    {
      id: 'detail',
      label: 'Detail',
      description: 'Voir les informations',
      icon: <Eye className="w-4 h-4" />,
      color: tokens.accent.text,
      colorBg: tokens.accent.bg,
      colorBorder: tokens.accent.border,
      onClick: () => { onClose(); onDetail(admin); },
    },
    {
      id: 'connecter',
      label: 'Connecter',
      description: 'Se connecter en tant que',
      icon: <LogIn className="w-4 h-4" />,
      color: tokens.success.text,
      colorBg: tokens.success.bg,
      colorBorder: tokens.success.border,
      onClick: () => { onClose(); onConnect(admin); },
    },
    {
      id: 'message',
      label: 'Message',
      description: 'Ouvrir la conversation',
      icon: <MessageSquare className="w-4 h-4" />,
      color: '#f59e0b',
      colorBg: 'rgba(245,158,11,0.08)',
      colorBorder: 'rgba(245,158,11,0.2)',
      onClick: () => { onClose(); onMessage(admin); },
    },
  ];

  const ids = actions.map(a => a.id);
  const order = useActionOrder(csaAuthId, ORDER_KEY, ids);
  const vis = useActionVisibility(csaAuthId, HIDDEN_KEY, ids, canManageVisibility);

  const byId = new Map(actions.map(a => [a.id, a]));
  // L'ordre s'applique d'abord, le masquage filtre ensuite : une action
  // reaffichee retrouve donc exactement sa place d'origine.
  const ordered = order.order.map(id => byId.get(id)).filter((a): a is ActionDef => !!a);
  // En mode Masquer on montre les visibles ; les masques vivent dans le second modal.
  const shown = ordered.filter(a => !vis.hidden.includes(a.id));
  const hiddenActions = ordered.filter(a => vis.hidden.includes(a.id));

  return (
    <>
      <PremiumActionsModal
        title="Actions société"
        identity={{ name, email: admin.email ?? '', detail: { label: 'Société', value: admin.company ?? '' } }}
        actions={shown}
        t={tokens}
        onClose={onClose}
        reorder={{
          active: order.reordering,
          onStart: order.startReorder,
          onCancel: order.cancelReorder,
          onConfirm: order.confirmReorder,
          onMove: order.move,
        }}
        // Absent = pas de bouton « Masquer » du tout.
        visibility={vis.canEdit ? {
          active: vis.editing,
          hiddenCount: hiddenActions.length,
          onStart: vis.startEdit,
          onCancel: () => { setHiddenListOpen(false); vis.cancelEdit(); },
          onConfirm: () => { setHiddenListOpen(false); vis.confirmEdit(); },
          onHide: vis.toggle,
          onOpenHiddenList: () => setHiddenListOpen(true),
        } : undefined}
      />

      {hiddenListOpen && vis.canEdit && (
        <PremiumHiddenActionsModal
          actions={hiddenActions}
          t={tokens}
          onShow={vis.toggle}
          onClose={() => setHiddenListOpen(false)}
        />
      )}
    </>
  );
}
