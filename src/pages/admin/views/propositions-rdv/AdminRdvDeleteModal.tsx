import { Trash2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface AdminRdvDeleteModalProps {
  count: number;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tokens: ThemeTokens;
}

export default function AdminRdvDeleteModal({ count, deleting, onConfirm, onCancel, tokens }: AdminRdvDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)' }}>
            <Trash2 className="w-5 h-5" style={{ color: '#f87171' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Confirmer la suppression</h3>
            <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>
              {count} proposition{count > 1 ? 's' : ''} seront supprimee{count > 1 ? 's' : ''} definitivement.
            </p>
          </div>
        </div>
        <p className="text-xs mb-5" style={{ color: tokens.text.quaternary }}>
          Cette action est irreversible. Les propositions seront supprimees pour tous les utilisateurs (admin, vendeurs et clients).
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ color: tokens.text.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: '#f87171', color: '#fff' }}
          >
            {deleting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
