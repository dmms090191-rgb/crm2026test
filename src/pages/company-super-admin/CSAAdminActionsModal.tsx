import { Eye, LogIn, Building2, Mail } from 'lucide-react';
import ActionModal from '../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../components/action-menu/ActionModal';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { CSAAdminUser } from './CSAAdminsList';

interface Props {
  admin: CSAAdminUser;
  onClose: () => void;
  onDetail: (admin: CSAAdminUser) => void;
  onConnect: (admin: CSAAdminUser) => void;
}

export default function CSAAdminActionsModal({ admin, onClose, onDetail, onConnect }: Props) {
  const tokens = useThemeTokens();
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email;

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
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
      ],
    },
  ];

  const subtitleFields = [
    { label: 'Nom', value: name },
    ...(admin.company ? [{ label: 'Societe', value: admin.company, icon: <Building2 className="w-3.5 h-3.5" /> }] : []),
    ...(admin.email ? [{ label: 'Email', value: admin.email, icon: <Mail className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <ActionModal
      title="Actions societe"
      subtitleFields={subtitleFields}
      sections={sections}
      tokens={tokens}
      onClose={onClose}
    />
  );
}
