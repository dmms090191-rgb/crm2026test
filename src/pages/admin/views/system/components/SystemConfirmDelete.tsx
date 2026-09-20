import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';

interface Props {
  /** Nom affiche entre guillemets. */
  name: string;
  tokens: ReturnType<typeof useThemeTokens>;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation unique du module Systeme : une note, un sous-groupe et une categorie posent
 * exactement la meme question, avec exactement la meme fenetre.
 *
 * Elle NE decide rien : l'appelant ne l'ouvre que sur un element reellement supprimable. La regle
 * « un parent ne part que vide » est verifiee avant, par checkCategoryDeletable.
 */
export default function SystemConfirmDelete({ name, tokens, onCancel, onConfirm }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      data-tx-veil
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        data-tx-ask
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <span
            data-tx-ask-badge
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}` }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: tokens.danger.text }} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-snug" style={{ color: tokens.modal.title }}>
              Supprimer «&nbsp;{name}&nbsp;» ?
            </h2>
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: tokens.text.tertiary }}>
              Cette action est définitive. Rien d'autre ne sera supprimé.
            </p>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            autoFocus
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tokens.surface.hover, color: tokens.text.secondary, border: `1px solid ${tokens.surface.border}` }}
          >
            Annuler
          </button>
          <button
            data-tx-danger
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
