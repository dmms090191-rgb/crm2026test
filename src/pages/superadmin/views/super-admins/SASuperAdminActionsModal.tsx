import { useState } from 'react';
import { Eye, LogIn, MessageSquare, Globe, LayoutTemplate } from 'lucide-react';
import PremiumActionsModal from '../../../../components/action-menu/premium/PremiumActionsModal';
import PremiumHiddenActionsModal from '../../../../components/action-menu/premium/PremiumHiddenActionsModal';
import type { ActionDef } from '../../../../components/action-menu/ActionModal';
import { useActionOrder } from '../../../../hooks/useActionOrder';
import { useActionVisibility } from '../../../../hooks/useActionVisibility';
import { useAuthUserId } from '../../../../hooks/useAuthUserId';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

/**
 * Reglage d'INTERFACE de Talvex Administrateur, pas d'un Groupe.
 *
 * Le proprietaire est donc le compte Talvex connecte : la configuration vaut
 * pour les Actions de TOUS les Groupes, comme demande. Cles dediees, sans
 * aucun rapport avec `csa_societe_actions*` (qui appartiennent aux Groupes)
 * ni avec les cles `v2:` de la Sidebar V2.
 */
const ORDER_KEY = 'sa_group_actions';
const HIDDEN_KEY = 'sa_group_actions_hidden';

interface Props {
  sa: CompanySuperAdmin;
  tokens: ThemeTokens;
  onClose: () => void;
  onConnect: (sa: CompanySuperAdmin) => void;
  onChat: (sa: CompanySuperAdmin) => void;
  onDomain: (sa: CompanySuperAdmin) => void;
  onSite: (sa: CompanySuperAdmin) => void;
  onDetail: (sa: CompanySuperAdmin) => void;
}

function SASuperAdminActionsModal({ sa, tokens, onClose, onConnect, onChat, onDomain, onSite, onDetail }: Props) {
  const talvexUserId = useAuthUserId();
  const [hiddenListOpen, setHiddenListOpen] = useState(false);
  const name = [sa.first_name, sa.last_name].filter(Boolean).join(' ') || sa.email;

  // Les actions telles que le CODE les definit. Ids stables, deja existants :
  // ni les ids, ni les onClick, ni les roles techniques ne changent ici.
  const actions: ActionDef[] = [
    {
      id: 'connecter', label: 'Connecter', description: 'Se connecter en tant que Super Admin',
      icon: <LogIn className="w-4 h-4" />,
      color: tokens.success.text, colorBg: tokens.success.bg, colorBorder: tokens.success.border,
      onClick: () => { onClose(); onConnect(sa); },
    },
    {
      id: 'message', label: 'Message', description: 'Ouvrir la conversation avec ce groupe',
      icon: <MessageSquare className="w-4 h-4" />,
      color: '#f59e0b', colorBg: 'rgba(245,158,11,0.08)', colorBorder: 'rgba(245,158,11,0.2)',
      onClick: () => { onClose(); onChat(sa); },
    },
    {
      id: 'domaine', label: 'Domaine', description: 'Gestion DNS et domaine',
      icon: <Globe className="w-4 h-4" />,
      color: '#06b6d4', colorBg: 'rgba(6,182,212,0.08)', colorBorder: 'rgba(6,182,212,0.2)',
      onClick: () => { onClose(); onDomain(sa); },
    },
    {
      id: 'site', label: 'Site', description: 'Constructeur de site',
      icon: <LayoutTemplate className="w-4 h-4" />,
      color: '#0ea5e9', colorBg: 'rgba(14,165,233,0.08)', colorBorder: 'rgba(14,165,233,0.2)',
      onClick: () => { onClose(); onSite(sa); },
    },
    {
      id: 'detail', label: 'Detail', description: 'Voir les informations',
      icon: <Eye className="w-4 h-4" />,
      color: tokens.accent.text, colorBg: tokens.accent.bg, colorBorder: tokens.accent.border,
      onClick: () => { onClose(); onDetail(sa); },
    },
  ];

  const ids = actions.map(a => a.id);
  const order = useActionOrder(talvexUserId, ORDER_KEY, ids);
  // Talvex regle sa propre interface : le droit est acquis dans cet ecran.
  const vis = useActionVisibility(talvexUserId, HIDDEN_KEY, ids, true);

  const byId = new Map(actions.map(a => [a.id, a]));
  // L'ordre s'applique d'abord, le masquage filtre ensuite : une action
  // reaffichee retrouve donc exactement sa place d'origine.
  const ordered = order.order.map(id => byId.get(id)).filter((a): a is ActionDef => !!a);
  const shown = ordered.filter(a => !vis.hidden.includes(a.id));
  const hiddenActions = ordered.filter(a => vis.hidden.includes(a.id));

  return (
    <>
      <PremiumActionsModal
        title="Actions Talvex Administrateur"
        identity={{ name, email: sa.email ?? '', detail: { label: 'Groupe', value: sa.company ?? '' } }}
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
        visibility={{
          active: vis.editing,
          hiddenCount: hiddenActions.length,
          onStart: vis.startEdit,
          onCancel: () => { setHiddenListOpen(false); vis.cancelEdit(); },
          onConfirm: () => { setHiddenListOpen(false); vis.confirmEdit(); },
          onHide: vis.toggle,
          onOpenHiddenList: () => setHiddenListOpen(true),
        }}
      />

      {hiddenListOpen && (
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

export default SASuperAdminActionsModal
