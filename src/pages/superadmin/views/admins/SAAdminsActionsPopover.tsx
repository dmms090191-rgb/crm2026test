import { createPortal } from 'react-dom';
import { X, Eye, Megaphone, MessageSquare, LogIn } from 'lucide-react';
import type { AdminUser } from '../SAAdmins';

interface Props {
  admin: AdminUser;
  popoverPos: { top: number; left: number } | null;
  onClose: () => void;
  onDetail: (admin: AdminUser) => void;
  onHomePage: (admin: AdminUser) => void;
  onChat: (admin: AdminUser) => void;
  onConnect: (admin: AdminUser) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function SAAdminsActionsPopover({
  admin, popoverPos, onClose, onDetail, onHomePage, onChat, onConnect, tokens,
}: Props) {
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
            <button onClick={onClose} className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { onClose(); onDetail(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
              <Eye className="w-3.5 h-3.5" />Detail
            </button>
            <button onClick={() => { onClose(); onHomePage(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              <Megaphone className="w-3.5 h-3.5" />Annonce
            </button>
            <button onClick={() => { onClose(); onChat(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
              <MessageSquare className="w-3.5 h-3.5" />MSG
            </button>
            <button onClick={() => { onClose(); onConnect(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
              <LogIn className="w-3.5 h-3.5" />Connecter
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
