import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { AdminUser } from '../SAAdmins';
import AdminDetailInfoTab from './AdminDetailInfoTab';
import AdminDetailPasswordTab from './AdminDetailPasswordTab';
import AdminDetailCommentsTab from './AdminDetailCommentsTab';
type ModalTab = 'informations' | 'mot-de-passe' | 'commentaires';

interface AdminDetailModalProps {
  admin: AdminUser;
  mode: 'detail' | 'edit';
  onClose: () => void;
  onUpdate: () => void;
  onSwitchMode: (mode: 'detail' | 'edit') => void;
  onBack?: () => void;
}

export default function AdminDetailModal({ admin, onClose, onUpdate, onBack }: AdminDetailModalProps) {
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<ModalTab>('informations');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const tabs: { id: ModalTab; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'mot-de-passe', label: 'Mot de passe' },
    { id: 'commentaires', label: 'Commentaires' },
  ];

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 gap-3" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: tokens.modal.title }}>
                {admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : 'Admin'}
              </p>
              <p className="text-xs truncate" style={{ color: tokens.modal.subtitle }}>{admin.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
              style={
                tab === t.id
                  ? { color: tokens.accent.text, borderBottom: `2px solid ${tokens.accent.text}`, marginBottom: '-1px' }
                  : { color: tokens.text.quaternary }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 min-h-0 max-h-[26rem] overflow-y-auto">
          {tab === 'informations' && <AdminDetailInfoTab admin={admin} onUpdate={onUpdate} />}
          {tab === 'mot-de-passe' && <AdminDetailPasswordTab adminId={admin.id} currentPin={admin.pin} onUpdate={onUpdate} />}
          {tab === 'commentaires' && <AdminDetailCommentsTab adminId={admin.id} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
