import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  count: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SAAdminsBulkDeleteModal({ count, loading, onConfirm, onCancel }: Props) {
  const tokens = useThemeTokens();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: tokens.modal.overlayBg }}>
      <div
        data-testid="admins-delete-confirm-modal"
        className="w-full max-w-md rounded-2xl p-6 relative shadow-2xl"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}` }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold" style={{ color: tokens.text.primary }}>
              Supprimer {count} admin{count > 1 ? 's' : ''} definitivement
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: tokens.text.secondary }}>
              Attention : cette action va supprimer definitivement {count > 1 ? 'ces admins, leurs societes' : 'cet admin, sa societe'} et toutes les donnees liees : leads, clients, vendeurs, messages, RDV, documentation, conversations et historiques.
            </p>
            <p className="text-xs font-semibold text-red-400 mt-1">
              Cette action est irreversible.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-left cursor-pointer mt-1 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <input
              type="checkbox"
              data-testid="admins-delete-confirm-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded accent-red-500 mt-0.5 flex-shrink-0"
            />
            <span className="text-xs leading-relaxed" style={{ color: tokens.text.secondary }}>
              Je comprends que toutes les donnees liees seront supprimees definitivement et que cette action est irreversible.
            </span>
          </label>

          <div className="flex items-center gap-3 w-full mt-2">
            <button
              data-testid="admins-delete-cancel-button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
            >
              Annuler
            </button>
            <button
              data-testid="admins-delete-confirm-button"
              onClick={onConfirm}
              disabled={loading || !confirmed}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: confirmed && !loading ? '#ef4444' : '#6b7280' }}
            >
              {loading ? 'Suppression...' : 'Confirmer la suppression'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
