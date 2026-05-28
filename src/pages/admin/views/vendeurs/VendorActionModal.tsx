import { Eye, LogIn, MessageSquare, Mail, Phone, User } from 'lucide-react';
import ActionModal from '../../../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../../../components/action-menu/ActionModal';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { Vendor } from './vendeurTypes';

interface Props {
  vendor: Vendor;
  tokens: ThemeTokens;
  onClose: () => void;
  onDetail: () => void;
  onConnect: () => void;
  onChat: () => void;
}

export default function VendorActionModal({ vendor, tokens, onClose, onDetail, onConnect, onChat }: Props) {
  const name = [vendor.first_name, vendor.last_name].filter(Boolean).join(' ') || 'Vendeur';

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
        {
          id: 'detail', label: 'Detail', description: 'Informations du vendeur',
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
          id: 'chat', label: 'Message', description: 'Ouvrir la conversation',
          icon: <MessageSquare className="w-4 h-4" />,
          color: tokens.accent.text, colorBg: tokens.accent.bg, colorBorder: tokens.accent.border,
          onClick: () => { onClose(); onChat(); },
        },
      ],
    },
  ];

  const subtitleFields = [
    { label: 'Nom', value: name, icon: <User className="w-3.5 h-3.5" /> },
    ...(vendor.email ? [{ label: 'Email', value: vendor.email, icon: <Mail className="w-3.5 h-3.5" /> }] : []),
    ...(vendor.phone ? [{ label: 'Tel', value: vendor.phone, icon: <Phone className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <ActionModal
      title="Actions vendeur"
      subtitleFields={subtitleFields}
      sections={sections}
      tokens={tokens}
      onClose={onClose}
    />
  );
}
