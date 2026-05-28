import { Eye, Megaphone, MessageSquare, LogIn, LayoutTemplate, Globe, Mail, Building2 } from 'lucide-react';
import ActionModal from '../../../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../../../components/action-menu/ActionModal';
import type { AdminUser } from '../SAAdmins';

interface Props {
  admin: AdminUser;
  popoverPos?: { top: number; left: number } | null;
  onClose: () => void;
  onDetail: (admin: AdminUser) => void;
  onHomePage: (admin: AdminUser) => void;
  onChat: (admin: AdminUser) => void;
  onConnect: (admin: AdminUser) => void;
  onSite: (admin: AdminUser) => void;
  onDomain: (admin: AdminUser) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAAdminsActionsPopover({
  admin, onClose, onDetail, onHomePage, onChat, onConnect, onSite, onDomain, tokens,
}: Props) {
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email;

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
        {
          id: 'detail', label: 'Detail', description: 'Voir les informations',
          icon: <Eye className="w-4 h-4" />,
          color: tokens.accent.text, colorBg: tokens.accent.bg, colorBorder: tokens.accent.border,
          onClick: () => { onClose(); onDetail(admin); },
        },
        {
          id: 'connecter', label: 'Connecter', description: 'Se connecter en tant que',
          icon: <LogIn className="w-4 h-4" />,
          color: tokens.success.text, colorBg: tokens.success.bg, colorBorder: tokens.success.border,
          onClick: () => { onClose(); onConnect(admin); },
        },
      ],
    },
    {
      title: 'Communication',
      actions: [
        {
          id: 'annonce', label: 'Annonce', description: 'Page d\'accueil admin',
          icon: <Megaphone className="w-4 h-4" />,
          color: '#f59e0b', colorBg: 'rgba(245,158,11,0.08)', colorBorder: 'rgba(245,158,11,0.2)',
          onClick: () => { onClose(); onHomePage(admin); },
        },
        {
          id: 'msg', label: 'Message', description: 'Envoyer un message',
          icon: <MessageSquare className="w-4 h-4" />,
          color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)', colorBorder: 'rgba(245,158,11,0.25)',
          onClick: () => { onClose(); onChat(admin); },
        },
      ],
    },
    {
      title: 'Site & Domaine',
      actions: [
        {
          id: 'domaine', label: 'Domaine', description: 'Gestion DNS et domaine',
          icon: <Globe className="w-4 h-4" />,
          color: '#06b6d4', colorBg: 'rgba(6,182,212,0.08)', colorBorder: 'rgba(6,182,212,0.2)',
          onClick: () => { onClose(); onDomain(admin); },
        },
        {
          id: 'site', label: 'Site', description: 'Constructeur de site',
          icon: <LayoutTemplate className="w-4 h-4" />,
          color: '#0ea5e9', colorBg: 'rgba(14,165,233,0.08)', colorBorder: 'rgba(14,165,233,0.2)',
          onClick: () => { onClose(); onSite(admin); },
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
