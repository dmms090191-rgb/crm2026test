import { Eye, LogIn, MessageCircle, CalendarClock, Mail, Phone, User } from 'lucide-react';
import ActionModal from '../../../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../../../components/action-menu/ActionModal';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

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
}

export default function CrmActionModal({ lead, tokens, onClose, onDetail, onConnect, onChat, onRdv }: Props) {
  const name = [lead.prenom, lead.nom].filter(Boolean).join(' ') || 'Lead';

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
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
      ],
    },
    {
      title: 'Communication',
      actions: [
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
      ],
    },
  ];

  const subtitleFields = [
    { label: 'Nom', value: name, icon: <User className="w-3.5 h-3.5" /> },
    ...(lead.email ? [{ label: 'Email', value: lead.email, icon: <Mail className="w-3.5 h-3.5" /> }] : []),
    ...(lead.tel ? [{ label: 'Tel', value: lead.tel, icon: <Phone className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <ActionModal
      title="Actions lead"
      subtitleFields={subtitleFields}
      sections={sections}
      tokens={tokens}
      onClose={onClose}
    />
  );
}
