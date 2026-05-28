import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, Phone, Calendar, MoreHorizontal, Eye, Megaphone, MessageSquare, Globe, LayoutTemplate, LogIn, Building2 } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import SAAdminsAccessSwitch from './SAAdminsAccessSwitch';
import SAAdminsAiSwitch from './SAAdminsAiSwitch';
import ActionModal from '../../../../components/action-menu/ActionModal';
import type { ActionSectionDef } from '../../../../components/action-menu/ActionModal';
import type { AdminUser } from '../SAAdmins';

interface Props {
  admin: AdminUser;
  idx: number;
  total: number;
  isSelf: boolean;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  reorderMode: boolean;
  onDetail: (a: AdminUser) => void;
  onHomePage: (a: AdminUser) => void;
  onChat: (a: AdminUser) => void;
  onConnect: (a: AdminUser) => void;
  onSite: (a: AdminUser) => void;
  onDomain: (a: AdminUser) => void;
  onAccessToggled: () => void;
  formatDate: (d: string | null) => string;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAAdminMobileCard({
  admin, idx, total, isSelf, selectionMode, selected,
  onToggleSelect, onMove, reorderMode, onDetail, onHomePage, onChat, onConnect, onSite, onDomain, onAccessToggled,
  formatDate, tokens,
}: Props) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const initials = `${(admin.first_name?.[0] ?? '').toUpperCase()}${(admin.last_name?.[0] ?? '').toUpperCase()}`;
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email;

  const sections: ActionSectionDef[] = [
    {
      title: 'Gestion',
      actions: [
        { id: 'detail', label: 'Detail', description: 'Voir les informations', icon: <Eye className="w-4 h-4" />, color: tokens.accent.text, colorBg: tokens.accent.bg, colorBorder: tokens.accent.border, onClick: () => { setActionsOpen(false); onDetail(admin); } },
        { id: 'connecter', label: 'Connecter', description: 'Se connecter en tant que', icon: <LogIn className="w-4 h-4" />, color: tokens.success.text, colorBg: tokens.success.bg, colorBorder: tokens.success.border, onClick: () => { setActionsOpen(false); onConnect(admin); } },
      ],
    },
    {
      title: 'Communication',
      actions: [
        { id: 'annonce', label: 'Annonce', description: 'Page d\'accueil admin', icon: <Megaphone className="w-4 h-4" />, color: '#f59e0b', colorBg: 'rgba(245,158,11,0.08)', colorBorder: 'rgba(245,158,11,0.2)', onClick: () => { setActionsOpen(false); onHomePage(admin); } },
        { id: 'msg', label: 'Message', description: 'Envoyer un message', icon: <MessageSquare className="w-4 h-4" />, color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)', colorBorder: 'rgba(245,158,11,0.25)', onClick: () => { setActionsOpen(false); onChat(admin); } },
      ],
    },
    {
      title: 'Site & Domaine',
      actions: [
        { id: 'domaine', label: 'Domaine', description: 'Gestion DNS', icon: <Globe className="w-4 h-4" />, color: '#06b6d4', colorBg: 'rgba(6,182,212,0.08)', colorBorder: 'rgba(6,182,212,0.2)', onClick: () => { setActionsOpen(false); onDomain(admin); } },
        { id: 'site', label: 'Site', description: 'Constructeur de site', icon: <LayoutTemplate className="w-4 h-4" />, color: '#0ea5e9', colorBg: 'rgba(14,165,233,0.08)', colorBorder: 'rgba(14,165,233,0.2)', onClick: () => { setActionsOpen(false); onSite(admin); } },
      ],
    },
  ];

  const subtitleFields = [
    { label: 'Nom', value: name },
    ...(admin.company ? [{ label: 'Societe', value: admin.company, icon: <Building2 className="w-3.5 h-3.5" /> }] : []),
    ...(admin.email ? [{ label: 'Email', value: admin.email, icon: <Mail className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <div data-row-id={admin.id} data-testid="admin-row" className="px-4 py-4" style={{ borderColor: tokens.table.rowBorder }}>
      <div className="flex items-start gap-3 mb-3">
        {selectionMode && !isSelf && <input type="checkbox" data-testid="admin-row-checkbox" checked={selected} onChange={() => onToggleSelect(admin.id)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer mt-3" />}
        {selectionMode && isSelf && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded mt-3" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>vous</span>}
        {reorderMode && (
          <div className="flex flex-col gap-0.5 mt-2">
            <button onClick={() => onMove(admin.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><ChevronUp className="w-4 h-4" /></button>
            <button onClick={() => onMove(admin.id, 'down')} disabled={idx === total - 1} className="w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><ChevronDown className="w-4 h-4" /></button>
          </div>
        )}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: '#fff' }}>{initials || '?'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : '\u2014'}</p>
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{admin.role}</span>
          </div>
          {admin.email && (<div className="flex items-center gap-1 mt-1"><Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs truncate flex-1 min-w-0" style={{ color: tokens.table.cellTextMuted }}>{admin.email}</span><CopyButton value={admin.email} /></div>)}
          {admin.phone && (<div className="flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{admin.phone}</span></div>)}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: tokens.table.cellIcon }} /><span className="text-[11px]" style={{ color: tokens.table.cellTextMuted }}>{formatDate(admin.created_at)}</span></div>
            <SAAdminsAccessSwitch adminId={admin.id} enabled={admin.access_enabled} onToggled={onAccessToggled} />
            <SAAdminsAiSwitch companyId={admin.company_id} enabled={admin.ai_enabled} onToggled={onAccessToggled} />
          </div>
        </div>
      </div>
      <div>
        <button onClick={() => setActionsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
          <MoreHorizontal className="w-3.5 h-3.5" />Actions
        </button>
        {actionsOpen && (
          <ActionModal title="Actions societe" subtitleFields={subtitleFields} sections={sections} tokens={tokens} onClose={() => setActionsOpen(false)} />
        )}
      </div>
    </div>
  );
}
