import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, LogIn, Mail, Phone, Calendar, MessageSquare, Megaphone, MoreHorizontal, X, Eye, LayoutTemplate, Settings2 } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import SAAdminsAccessSwitch from './SAAdminsAccessSwitch';
import SAAdminsAiSwitch from './SAAdminsAiSwitch';
import { useActionMenuOrder } from '../../../../components/action-menu/useActionMenuOrder';
import ActionMenuReorderPanel, { type ActionMenuItem } from '../../../../components/action-menu/ActionMenuReorderPanel';
import type { AdminUser } from '../SAAdmins';

const STORAGE_KEY = 'action_menu_order_superadmin_admins';
const DEFAULT_ORDER = ['detail', 'annonce', 'msg', 'site', 'connecter'];

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
  onAccessToggled: () => void;
  formatDate: (d: string | null) => string;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

function buildItems(tokens: Props['tokens']): ActionMenuItem[] {
  return [
    { id: 'detail', label: 'Detail', icon: <Eye className="w-3.5 h-3.5" />, color: tokens.accent.text },
    { id: 'annonce', label: 'Annonce', icon: <Megaphone className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'msg', label: 'MSG', icon: <MessageSquare className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'site', label: 'Site', icon: <LayoutTemplate className="w-3.5 h-3.5" />, color: '#0ea5e9' },
    { id: 'connecter', label: 'Connecter', icon: <LogIn className="w-3.5 h-3.5" />, color: tokens.success.text },
  ];
}

function getButtonStyle(id: string, tokens: Props['tokens']) {
  switch (id) {
    case 'detail': return { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text };
    case 'annonce': return { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' };
    case 'msg': return { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' };
    case 'site': return { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#0ea5e9' };
    case 'connecter': return { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text };
    default: return {};
  }
}

export default function SAAdminMobileCard({
  admin, idx, total, isSelf, selectionMode, selected,
  onToggleSelect, onMove, reorderMode, onDetail, onHomePage, onChat, onConnect, onSite, onAccessToggled,
  formatDate, tokens,
}: Props) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [menuReorder, setMenuReorder] = useState(false);
  const { order, save } = useActionMenuOrder(STORAGE_KEY, DEFAULT_ORDER);
  const items = buildItems(tokens);
  const initials = `${(admin.first_name?.[0] ?? '').toUpperCase()}${(admin.last_name?.[0] ?? '').toUpperCase()}`;

  const handlers: Record<string, () => void> = {
    detail: () => { setActionsOpen(false); onDetail(admin); },
    annonce: () => { setActionsOpen(false); onHomePage(admin); },
    msg: () => { setActionsOpen(false); onChat(admin); },
    site: () => { setActionsOpen(false); onSite(admin); },
    connecter: () => { setActionsOpen(false); onConnect(admin); },
  };

  const sortedItems = order.map(id => items.find(i => i.id === id)).filter(Boolean) as ActionMenuItem[];

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
        {actionsOpen && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => { setActionsOpen(false); setMenuReorder(false); }}>
            <div className="w-full max-w-[260px] rounded-xl p-4" style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold truncate" style={{ color: tokens.heading.primary }}>
                  {admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : admin.email}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setMenuReorder(r => !r)} className="w-6 h-6 rounded-md flex items-center justify-center" style={menuReorder ? { background: tokens.accent.bg, color: tokens.accent.text } : { background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }} title="Reorganiser">
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setActionsOpen(false); setMenuReorder(false); }} className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {menuReorder ? (
                <ActionMenuReorderPanel items={items} order={order} onSave={(o) => { save(o); setMenuReorder(false); }} onCancel={() => setMenuReorder(false)} tokens={tokens} />
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedItems.map(item => (
                    <button key={item.id} onClick={handlers[item.id]} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95" style={getButtonStyle(item.id, tokens)}>
                      {item.icon}{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
