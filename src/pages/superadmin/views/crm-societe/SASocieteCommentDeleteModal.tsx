import { X, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SASocieteCommentDeleteModal({ count, onConfirm, onClose }: Props) {
  const t = useThemeTokens();

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
            <p className="text-sm font-semibold" style={{ color: t.modal.title }}>Confirmer la suppression</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm" style={{ color: t.text.secondary }}>
            Supprimer {count} commentaire{count > 1 ? 's' : ''} ? Cette action est irreversible.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
