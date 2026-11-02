import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useFermetureModale } from '../crm-immo/useFermetureModale';

/**
 * LE COMMENTAIRE ENTIER, PROPREMENT.
 *
 * David a demande « affichage court/tronque » dans le tableau, et « possibilite de voir
 * le contenu complet proprement ». Les deux moities comptent : tronquer sans donner
 * acces au texte entier rendrait le champ inutile.
 *
 * POURQUOI UNE MODALE ET PAS UNE INFOBULLE. Une infobulle n'existe pas au doigt : elle
 * demande un survol. Sur l'iPhone de David — l'appareil ou il relit ses leads — le texte
 * serait simplement inatteignable. Une modale marche partout, au clic comme au tap.
 *
 * `whitespace-pre-wrap` : les retours a la ligne sont ecrases dans la cellule du tableau
 * pour que la ligne ne grandisse pas, mais ici on rend le texte TEL QU'IL A ETE SAISI.
 * C'est tout l'interet de l'ouvrir.
 */

interface Props {
  nom: string;
  commentaire: string;
  onFermer: () => void;
}

export default function CrmProspectionCommentaireModal({ nom, commentaire, onFermer }: Props) {
  const t = useThemeTokens();
  /* Rien a perdre : on ne fait que LIRE. Un seul geste suffit pour fermer, et exiger une
     confirmation pour refermer une lecture serait absurde. */
  const fermeture = useFermetureModale({ onFermer });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modal.overlayBg }} data-testid="crm-prospection-commentaire-modal"
      {...fermeture.proprietesDuFond}>
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="px-5 py-3.5 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: t.modal.title }}>Commentaire</h2>
            <p className="text-xs truncate" style={{ color: t.modal.subtitle }}>{nom}</p>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <p className="text-sm whitespace-pre-wrap break-words" style={{ color: t.modal.fieldValue }}>
            {commentaire}
          </p>
        </div>
      </div>
    </div>
  );
}
