import { LogIn, Globe, LayoutTemplate, Building2, Mail } from 'lucide-react';
import ActionModal from '../../../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../../../components/action-menu/ActionModal';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  sa: CompanySuperAdmin;
  tokens: ThemeTokens;
  onClose: () => void;
  onConnect: (sa: CompanySuperAdmin) => void;
  onDomain: (sa: CompanySuperAdmin) => void;
  onSite: (sa: CompanySuperAdmin) => void;
}

function SASuperAdminActionsModal({ sa, tokens, onClose, onConnect, onDomain, onSite }: Props) {
  const name = [sa.first_name, sa.last_name].filter(Boolean).join(' ') || sa.email;

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
        {
          id: 'connecter', label: 'Connecter', description: 'Se connecter en tant que Super Admin',
          icon: <LogIn className="w-4 h-4" />,
          color: tokens.success.text, colorBg: tokens.success.bg, colorBorder: tokens.success.border,
          onClick: () => { onClose(); onConnect(sa); },
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
      ],
    },
  ];

  const subtitleFields = [
    { label: 'Nom', value: name },
    { label: 'Societe', value: sa.company, icon: <Building2 className="w-3.5 h-3.5" /> },
    { label: 'Email', value: sa.email, icon: <Mail className="w-3.5 h-3.5" /> },
  ];

  return (
    <ActionModal
      title="Actions Super Admin"
      subtitleFields={subtitleFields}
      sections={sections}
      tokens={tokens}
      onClose={onClose}
    />
  );
}


export default SASuperAdminActionsModal