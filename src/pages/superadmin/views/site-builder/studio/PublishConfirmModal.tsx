import { Rocket, X, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  isPublishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
  t: ThemeTokens;
}

export default function PublishConfirmModal({ isPublishing, onConfirm, onClose, t }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ background: t.surface.secondary, color: t.text.tertiary }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <Rocket className="w-5 h-5" style={{ color: '#10b981' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>
            Publier les modifications ?
          </h3>
          <p className="text-[11px] mt-1.5 max-w-xs" style={{ color: t.text.tertiary }}>
            Le contenu du brouillon deviendra visible sur votre site public. Cette action est immediate.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPublishing}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
              opacity: isPublishing ? 0.7 : 1,
            }}
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            {isPublishing ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}
