import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  /** Noms des boutiques selectionnees, dans l'ordre du tableau. */
  noms: string[];
  suppression: boolean;
  erreur: string;
  onAnnuler: () => void;
  onConfirmer: () => void;
}

/** Au-dela, on annonce le total sans derouler la liste entiere. */
const MAX_NOMS_AFFICHES = 6;

/**
 * Confirmation avant suppression definitive.
 *
 * Elle dit le nombre, nomme ce qui part avec la boutique, et n'offre aucun raccourci :
 * le bouton rouge porte « Supprimer definitivement », pas « OK ».
 */
export default function BoutiqueDeleteModal({ noms, suppression, erreur, onAnnuler, onConfirmer }: Props) {
  const t = useThemeTokens();
  const n = noms.length;
  const pluriel = n > 1;
  const visibles = noms.slice(0, MAX_NOMS_AFFICHES);
  const reste = n - visibles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: t.modal.overlayBg }}>
      <div className="w-full max-w-md rounded-2xl" data-testid="boutique-delete-modal"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="flex items-start justify-between gap-3 p-6 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold leading-snug" style={{ color: t.modal.title }}>
              Supprimer {n} boutique{pluriel ? 's' : ''} ?
            </h2>
          </div>
          <button type="button" onClick={onAnnuler} aria-label="Fermer" disabled={suppression}
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: t.modal.subtitle }}>
            Cette action est <strong>définitive</strong>. {pluriel ? 'Ces boutiques' : 'Cette boutique'} et{' '}
            <strong>tout le contenu qui {pluriel ? 'leur' : 'lui'} appartient</strong> — réglages, décoration,
            configuration 3D, médias, produits — {pluriel ? 'seront supprimés' : 'sera supprimé'} avec {pluriel ? 'elles' : 'elle'}.
          </p>

          <ul className="rounded-lg px-3 py-2 space-y-1"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            {visibles.map((nom, i) => (
              <li key={`${nom}-${i}`} className="text-xs truncate" style={{ color: t.text.secondary }}>• {nom}</li>
            ))}
            {reste > 0 && (
              <li className="text-xs" style={{ color: t.text.tertiary }}>… et {reste} autre{reste > 1 ? 's' : ''}</li>
            )}
          </ul>

          <p className="text-xs" style={{ color: t.text.tertiary }}>
            Votre compte Société n’est pas concerné : seules {pluriel ? 'les boutiques sélectionnées' : 'la boutique sélectionnée'} {pluriel ? 'sont retirées' : 'est retirée'}.
          </p>

          {erreur && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onAnnuler} disabled={suppression}
              data-testid="boutique-delete-annuler"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary, opacity: suppression ? 0.5 : 1 }}>
              Annuler
            </button>
            <button type="button" onClick={onConfirmer} disabled={suppression}
              data-testid="boutique-delete-confirmer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text, opacity: suppression ? 0.5 : 1 }}>
              <Trash2 className="w-3.5 h-3.5" />
              {suppression ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
