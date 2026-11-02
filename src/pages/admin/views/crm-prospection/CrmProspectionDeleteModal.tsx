import { AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from '../crm-immo/useFermetureModale';

/**
 * LA CONFIRMATION AVANT SUPPRESSION — exigence explicite de David, et la seule chose qui
 * se dresse entre un clic et une perte definitive.
 *
 * ELLE NOMME CE QUI PART. Un « Etes-vous sur ? » sans sujet fait cliquer sans lire : pour
 * une ligne, on donne son nom ; pour un lot, on donne le COMPTE. Et le compte annonce ici
 * est celui que la suppression va reellement effectuer — l'intersection de la selection
 * avec les lignes AFFICHEES, calculee par idsASupprimer. Annoncer la taille brute du
 * `Set` mentirait des qu'un filtre a change depuis la selection.
 *
 * AUCUN GESTE DE SORTIE NE SUPPRIME. Echap et le clic sur le fond ANNULENT : le seul
 * chemin vers la suppression est le bouton qui porte le mot. Pendant l'ecriture, plus
 * rien ne ferme — la suppression est partie, refermer ne l'arreterait pas et ferait
 * croire le contraire.
 *
 * NOTE SUR LA REGLE MAISON « masquer, jamais supprimer » : elle ne s'applique pas ici.
 * David a demande une « suppression REELLE en base », deux fois et en majuscules. C'est
 * sa decision, prise en connaissance de cause.
 */

interface Props {
  /** Le nom de la ligne, pour une suppression simple. */
  nom?: string;
  /** Le nombre de lignes, pour une suppression groupee. */
  nombre?: number;
  enCours: boolean;
  erreur: string;
  onAnnuler: () => void;
  onConfirmer: () => void;
}

export default function CrmProspectionDeleteModal({ nom, nombre, enCours, erreur, onAnnuler, onConfirmer }: Props) {
  const t = useThemeTokens();
  const fermeture = useFermetureModale({ onFermer: onAnnuler, bloquee: enCours });
  const groupee = nombre !== undefined && nombre > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-prospection-delete-modal"
      {...fermeture.proprietesDuFond}>
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: t.danger.text }} />
          </div>

          <h2 className="text-base font-bold" style={{ color: t.modal.title }}>
            {groupee ? `Supprimer ${nombre} leads ?` : 'Supprimer ce lead ?'}
          </h2>

          {/* Une hauteur maximale et un corps defilant : le nom vient de l'utilisateur et
              rien ne borne sa longueur. Sur un petit ecran, un nom tres long pousserait
              les deux boutons hors de l'ecran. */}
          <p className="text-sm mt-2 break-words" style={{ color: t.modal.subtitle }}>
            {groupee ? (
              <>
                <strong style={{ color: t.text.primary }}>{nombre} leads sélectionnés</strong> seront
                supprimés définitivement. Seules les lignes actuellement affichées et cochées sont
                concernées. Cette action est irréversible.
              </>
            ) : (
              <>
                <strong style={{ color: t.text.primary }}>{nom}</strong> sera supprimé définitivement.
                Cette action est irréversible.
              </>
            )}
          </p>

          {erreur !== '' && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg break-words" data-testid="crm-prospection-delete-erreur"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              {erreur}
            </p>
          )}
        </div>

        <div className="px-5 py-3 shrink-0 flex flex-wrap justify-end gap-2"
          style={{ borderTop: `1px solid ${t.modal.border}`, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <button type="button" onClick={onAnnuler} disabled={enCours}
            data-testid="crm-prospection-delete-annuler"
            className="h-10 px-4 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}>
            Annuler
          </button>
          {/* Desactive pendant l'operation : sans cela, un double-clic lance DEUX
              suppressions, et la seconde echoue sans raison apparente. */}
          <button type="button" onClick={onConfirmer} disabled={enCours}
            data-testid="crm-prospection-delete-confirmer"
            className="h-10 px-4 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: t.danger.text, color: t.text.inverse }}>
            {enCours ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
