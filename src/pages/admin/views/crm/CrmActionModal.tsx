import { useState } from 'react';
import { Eye, LogIn, MessageCircle, CalendarClock, Phone } from 'lucide-react';
import PremiumActionsModal from '../../../../components/action-menu/premium/PremiumActionsModal';
import PremiumHiddenActionsModal from '../../../../components/action-menu/premium/PremiumHiddenActionsModal';
import type { ActionDef } from '../../../../components/action-menu/ActionModal';
import { useActionOrder } from '../../../../hooks/useActionOrder';
import { useActionVisibility } from '../../../../hooks/useActionVisibility';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

/**
 * Reglage d'interface de la SOCIETE, pas du lead.
 *
 * Le proprietaire est l'id Auth de la Societe effective — celle qui est
 * visualisee en Visu, jamais le compte Talvex ou Groupe qui la regarde. Le
 * meme ordre et le meme masquage valent donc pour TOUS ses leads.
 *
 * Cles dediees, sans rapport avec `csa_societe_actions*` (Groupes) ni
 * `sa_group_actions*` (Talvex).
 */
const ORDER_KEY = 'admin_lead_actions';
const HIDDEN_KEY = 'admin_lead_actions_hidden';

interface LeadInfo {
  nom: string;
  prenom: string;
  email: string;
  tel: string;
}

interface Props {
  lead: LeadInfo;
  tokens: ThemeTokens;
  onClose: () => void;
  onDetail: () => void;
  onConnect: () => void;
  onChat: () => void;
  onRdv: () => void;
  /** Id Auth de la Societe effective : proprietaire du reglage. */
  ownerUserId?: string | null;
}

export default function CrmActionModal({
  lead, tokens, onClose, onDetail, onConnect, onChat, onRdv, ownerUserId = null,
}: Props) {
  const [hiddenListOpen, setHiddenListOpen] = useState(false);
  const name = [lead.prenom, lead.nom].filter(Boolean).join(' ') || 'Lead';

  // Les actions telles que le CODE les definit. Ids stables, deja existants :
  // ni les ids ni les onClick metier ne changent ici.
  const actions: ActionDef[] = [
    {
      id: 'detail', label: 'Detail', description: 'Fiche complete du lead',
      icon: <Eye className="w-4 h-4" />,
      color: tokens.accent.text, colorBg: tokens.accent.bg, colorBorder: tokens.accent.border,
      onClick: () => { onClose(); onDetail(); },
    },
    {
      id: 'connect', label: 'Connecter', description: 'Se connecter en tant que',
      icon: <LogIn className="w-4 h-4" />,
      color: tokens.success.text, colorBg: tokens.success.bg, colorBorder: tokens.success.border,
      onClick: () => { onClose(); onConnect(); },
    },
    {
      id: 'chat', label: 'Chat', description: 'Envoyer un message',
      icon: <MessageCircle className="w-4 h-4" />,
      color: tokens.warning.text, colorBg: tokens.warning.bg, colorBorder: tokens.warning.border,
      onClick: () => { onClose(); onChat(); },
    },
    {
      id: 'rdv', label: 'Rendez-vous', description: 'Proposer un rendez-vous',
      icon: <CalendarClock className="w-4 h-4" />,
      color: '#06b6d4', colorBg: 'rgba(34,211,238,0.08)', colorBorder: 'rgba(34,211,238,0.18)',
      onClick: () => { onClose(); onRdv(); },
    },
  ];

  const ids = actions.map(a => a.id);
  const order = useActionOrder(ownerUserId, ORDER_KEY, ids);
  // Meme regle que le panel Societe : la Societe regle sa propre interface.
  const vis = useActionVisibility(ownerUserId, HIDDEN_KEY, ids, true);

  const byId = new Map(actions.map(a => [a.id, a]));
  // L'ordre s'applique d'abord, le masquage filtre ensuite : une action
  // reaffichee retrouve exactement sa place.
  const ordered = order.order.map(id => byId.get(id)).filter((a): a is ActionDef => !!a);
  const shown = ordered.filter(a => !vis.hidden.includes(a.id));
  const hiddenActions = ordered.filter(a => vis.hidden.includes(a.id));

  return (
    <>
      <PremiumActionsModal
        title="Actions lead"
        identity={{
          name,
          email: lead.email ?? '',
          ...(lead.tel ? { detail: { label: 'Tél', value: lead.tel, icon: <Phone className="w-3 h-3" /> } } : {}),
        }}
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
