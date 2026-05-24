import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Megaphone, MessageSquare, LogIn, LayoutTemplate, Settings2 } from 'lucide-react';
import { useActionMenuOrder } from '../../../../components/action-menu/useActionMenuOrder';
import ActionMenuReorderPanel, { type ActionMenuItem } from '../../../../components/action-menu/ActionMenuReorderPanel';
import type { AdminUser } from '../SAAdmins';

const STORAGE_KEY = 'action_menu_order_superadmin_admins';
const DEFAULT_ORDER = ['detail', 'annonce', 'msg', 'site', 'connecter'];

interface Props {
  admin: AdminUser;
  popoverPos: { top: number; left: number } | null;
  onClose: () => void;
  onDetail: (admin: AdminUser) => void;
  onHomePage: (admin: AdminUser) => void;
  onChat: (admin: AdminUser) => void;
  onConnect: (admin: AdminUser) => void;
  onSite: (admin: AdminUser) => void;
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

export default function SAAdminsActionsPopover({
  admin, popoverPos, onClose, onDetail, onHomePage, onChat, onConnect, onSite, tokens,
}: Props) {
  const [reorderMode, setReorderMode] = useState(false);
  const { order, save } = useActionMenuOrder(STORAGE_KEY, DEFAULT_ORDER);
  const items = buildItems(tokens);

  const handlers: Record<string, () => void> = {
    detail: () => { onClose(); onDetail(admin); },
    annonce: () => { onClose(); onHomePage(admin); },
    msg: () => { onClose(); onChat(admin); },
    site: () => { onClose(); onSite(admin); },
    connecter: () => { onClose(); onConnect(admin); },
  };

  const sortedItems = order.map(id => items.find(i => i.id === id)).filter(Boolean) as ActionMenuItem[];

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={onClose}>
      {popoverPos && (
        <div
          className="absolute rounded-xl p-3 w-[220px]"
          style={{
            top: popoverPos.top, left: popoverPos.left, zIndex: 99999,
            background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold truncate" style={{ color: tokens.heading.primary }}>
              {admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : admin.email}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setReorderMode(r => !r)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                style={reorderMode ? { background: tokens.accent.bg, color: tokens.accent.text } : { background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
                title="Reorganiser"
              >
                <Settings2 className="w-3 h-3" />
              </button>
              <button onClick={onClose} className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          {reorderMode ? (
            <ActionMenuReorderPanel
              items={items}
              order={order}
              onSave={(newOrder) => { save(newOrder); setReorderMode(false); }}
              onCancel={() => setReorderMode(false)}
              tokens={tokens}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedItems.map(item => (
                <button
                  key={item.id}
                  onClick={handlers[item.id]}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={getButtonStyle(item.id, tokens)}
                >
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
