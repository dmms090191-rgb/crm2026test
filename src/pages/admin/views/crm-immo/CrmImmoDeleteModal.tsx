import { AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from './useFermetureModale';

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

  /*
   * Echap et le clic sur le fond ANNULENT. Ils ne suppriment jamais : le seul chemin
   * vers la suppression est le bouton qui porte le mot, et aucun geste de sortie ne
   * passe par onConfirmer. Un seul geste suffit — il n y a rien a perdre ici, et exiger
   * une confirmation pour ANNULER une confirmation serait absurde.
   *
   * Pendant l ecriture (enCours), aucun geste ne ferme : la suppression est partie, la
   * refermer ne l arreterait pas et ferait croire le contraire.
   */
  const fermeture = useFermetureModale({ onFermer: onAnnuler, bloquee: enCours });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-immo-delete-modal"
      {...fermeture.proprietesDuFond}>
      {/* Une hauteur maximale et un corps defilant : le nom du dossier vient de
          l utilisateur, rien ne borne sa longueur, et cette modale n avait aucun des
          deux. Sur un petit ecran avec le clavier ouvert, un nom tres long aurait
          pousse les deux boutons hors de l ecran. */}
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: t.danger.text }} />
          </div>

          <h2 className="text-base font-bold" style={{ color: t.modal.title }}>
            Supprimer ce dossier ?
          </h2>
          <p className="text-sm mt-2 break-words" style={{ color: t.modal.subtitle }}>
            <strong style={{ color: t.text.primary }}>{nom}</strong> sera supprimé définitivement,
            avec l’historique de ses alertes. Cette action est irréversible.
          </p>

          {erreur !== '' && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg break-words" data-testid="crm-immo-delete-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
        </div>

        <div className="px-5 py-3 shrink-0 flex flex-wrap justify-end gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <button type="button" onClick={onAnnuler} disabled={enCours}
            data-testid="crm-immo-delete-annuler"
            /* Mesure a 375 px : 38 px de haut. Ces deux boutons decident d une
               suppression definitive : ils doivent etre les plus surs a viser. */
            className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            Annuler
          </button>
          <button type="button" onClick={onConfirmer} disabled={enCours}
            data-testid="crm-immo-delete-confirmer"
            className="px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.danger.text, color: t.text.inverse }}>
            {enCours ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
