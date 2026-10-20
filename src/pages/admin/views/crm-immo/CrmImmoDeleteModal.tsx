import { AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

/**
 * Confirmation de suppression d'un dossier.
 *
 * Elle NOMME ce qui part — un « Êtes-vous sûr ? » sans sujet fait cliquer sans lire — et
 * elle dit ce qui part AVEC : les alertes traitées du dossier s'en vont par la cascade de
 * la clé étrangère composée. Le bouton reste désactivé pendant l'opération, sinon un
 * double-clic lance deux suppressions dont la seconde échoue sans raison apparente.
 */

interface Props {
  nom: string;
  enCours: boolean;
  erreur: string;
  onAnnuler: () => void;
  onConfirmer: () => void;
}

export default function CrmImmoDeleteModal({ nom, enCours, erreur, onAnnuler, onConfirmer }: Props) {
  const t = useThemeTokens();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-delete-modal">
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="p-5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: t.danger.text }} />
          </div>

          <h2 className="text-base font-bold" style={{ color: t.modal.title }}>
            Supprimer ce dossier ?
          </h2>
          <p className="text-sm mt-2" style={{ color: t.modal.subtitle }}>
            <strong style={{ color: t.text.primary }}>{nom}</strong> sera supprimé définitivement,
            avec l’historique de ses alertes. Cette action est irréversible.
          </p>

          {erreur !== '' && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg" data-testid="crm-immo-delete-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
        </div>

        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: `1px solid ${t.modal.border}` }}>
          <button type="button" onClick={onAnnuler} disabled={enCours}
            data-testid="crm-immo-delete-annuler"
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            Annuler
          </button>
          <button type="button" onClick={onConfirmer} disabled={enCours}
            data-testid="crm-immo-delete-confirmer"
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.danger.text, color: t.text.inverse }}>
            {enCours ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
