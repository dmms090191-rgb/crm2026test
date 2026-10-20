import { useState } from 'react';
import { Trash2, Plus, Check, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { COMMENTAIRE_MAX, dateEtHeure, type CommentaireImmo } from './crmImmoTypes';
import type { EtatCommentaires } from './useCrmImmoCommentaires';

/**
 * L'HISTORIQUE DES COMMENTAIRES D'UN DOSSIER.
 *
 * ---------- CE QUE CELA REMPLACE ----------
 *
 * `crm_immo_dossiers.commentaire` etait un champ unique, ECRASE a chaque modification du
 * dossier. Une note prise en mars disparaissait sans trace quand on en ecrivait une en
 * avril. Ici, chaque commentaire est une ligne : on en ajoute, on en supprime, on n'en
 * remplace jamais.
 *
 * ---------- UN COMMENTAIRE NE SE MODIFIE PAS ----------
 *
 * Il n'y a pas de bouton << editer >>, et c'est volontaire. Un historique dont les
 * entrees se reecrivent n'est plus un historique : relire une relance datee du 3 mars
 * n'aurait plus de sens si son texte avait pu changer le 4. Se tromper se corrige en
 * supprimant et en reecrivant — ce qui laisse la bonne date.
 *
 * ---------- LA SUPPRESSION DEMANDE CONFIRMATION ----------
 *
 * En DEUX gestes, sur place, comme partout ailleurs dans ce module : le bouton Supprimer
 * d'une colonne, et la fermeture d'une modale qui porte une saisie. Pas une seconde
 * modale par-dessus la premiere — une modale dans une modale ne se ferme plus
 * proprement, et Echap ne sait plus laquelle il vise.
 */

export default function CrmImmoCommentaires({ etat }: { etat: EtatCommentaires }) {
  const t = useThemeTokens();
  const [brouillon, setBrouillon] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const trop = brouillon.trim().length > COMMENTAIRE_MAX;

  async function ajouter() {
    setEnCours(true);
    const r = await etat.ajouter(brouillon);
    setEnCours(false);
    if (r.error) { setErreur(r.error); return; }
    setErreur('');
    setBrouillon('');
  }

  async function confirmerSuppression(id: string) {
    setEnCours(true);
    const r = await etat.supprimer(id);
    setEnCours(false);
    setASupprimer(null);
    if (r.error) setErreur(r.error);
    else setErreur('');
  }

  return (
    <div className="flex flex-col gap-3" data-testid="crm-immo-commentaires">
      {/*
        LA ZONE DE SAISIE EST EN HAUT, pas en bas. La liste va du plus recent au plus
        ancien : mettre le champ au-dessus le place juste avant l'endroit ou le nouveau
        commentaire va apparaitre. Avec un historique long, un champ en bas obligerait a
        defiler tout l'historique pour ecrire.
      */}
      <div className="flex flex-col gap-2">
        <textarea
          value={brouillon}
          onChange={e => { setBrouillon(e.target.value); setErreur(''); }}
          placeholder="Ajouter un commentaire…"
          rows={3}
          data-testid="crm-immo-commentaire-saisie"
          /* max-md:text-base : 16 px sous 768 px, sinon iOS Safari agrandit la page des
             qu on touche le champ — et la modale deborde a droite. */
          className="w-full px-3 py-2 rounded-lg text-sm max-md:text-base outline-none resize-y"
          style={{ background: t.modal.fieldBg, border: `1px solid ${trop ? t.danger.border : t.modal.fieldBorder}`, color: t.modal.fieldValue }}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: trop ? t.danger.text : t.label.hint }}>
            {brouillon.trim().length} / {COMMENTAIRE_MAX} caractères
          </span>
          <button type="button" onClick={() => { void ajouter(); }}
            disabled={enCours || brouillon.trim() === '' || trop}
            data-testid="crm-immo-commentaire-ajouter"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 max-md:py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: t.accent.solid, color: t.text.inverse }}>
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {erreur !== '' && (
        <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-commentaire-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {erreur}
        </p>
      )}

      {etat.erreur !== '' && (
        <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-commentaires-erreur-lecture"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {etat.erreur}
        </p>
      )}

      {etat.chargement && (
        <p className="text-sm py-4 text-center" style={{ color: t.label.muted }}>Chargement des commentaires…</p>
      )}

      {!etat.chargement && etat.liste.length === 0 && (
        <p className="text-sm py-4 text-center" data-testid="crm-immo-commentaires-vide" style={{ color: t.label.muted }}>
          Aucun commentaire pour l’instant.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {etat.liste.map(c => (
          <Ligne key={c.id} commentaire={c}
            arme={aSupprimer === c.id}
            enCours={enCours}
            onArmer={() => { setASupprimer(c.id); setErreur(''); }}
            onRenoncer={() => setASupprimer(null)}
            onConfirmer={() => { void confirmerSuppression(c.id); }} />
        ))}
      </div>
    </div>
  );
}

function Ligne({ commentaire: c, arme, enCours, onArmer, onRenoncer, onConfirmer }: {
  commentaire: CommentaireImmo;
  arme: boolean;
  enCours: boolean;
  onArmer: () => void;
  onRenoncer: () => void;
  onConfirmer: () => void;
}) {
  const t = useThemeTokens();

  return (
    <div className="rounded-lg px-3 py-2.5" data-testid={`crm-immo-commentaire-${c.id}`}
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}>

      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] shrink-0" data-testid={`crm-immo-commentaire-date-${c.id}`}
          style={{ color: t.label.hint }}>
          {dateEtHeure(c.created_at)}
        </span>

        {arme ? (
          /* La confirmation sur place : deux boutons, pas une seconde modale. */
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={onConfirmer} disabled={enCours}
              title="Confirmer la suppression"
              aria-label="Confirmer la suppression de ce commentaire"
              data-testid={`crm-immo-commentaire-supprimer-ok-${c.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 max-md:py-[14px] rounded text-[11px] font-semibold disabled:opacity-50"
              style={{ background: t.danger.text, color: t.text.inverse }}>
              <Check className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button type="button" onClick={onRenoncer} disabled={enCours}
              title="Ne pas supprimer"
              aria-label="Renoncer à supprimer ce commentaire"
              data-testid={`crm-immo-commentaire-renoncer-${c.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 max-md:px-3 max-md:py-[14px] rounded text-[11px] disabled:opacity-50"
              style={{ color: t.label.muted }}>
              <X className="w-3.5 h-3.5" /> Non
            </button>
          </div>
        ) : (
          <button type="button" onClick={onArmer} disabled={enCours}
            title="Supprimer"
            aria-label={`Supprimer le commentaire du ${dateEtHeure(c.created_at)}`}
            data-testid={`crm-immo-commentaire-supprimer-${c.id}`}
            /* 15 px de rembourrage autour d une icone de 14 donnent 44 x 44 au doigt.
               Le bouton est seul dans son coin : pas de voisin a qui voler un clic. */
            className="p-1.5 max-md:p-[15px] rounded shrink-0 disabled:opacity-50"
            style={{ color: t.danger.text }}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* whitespace-pre-wrap : les retours a la ligne saisis sont conserves.
          break-words : un jeton insecable long ne doit pas elargir la modale a 375 px. */}
      <p className="text-sm mt-1 whitespace-pre-wrap break-words"
        data-testid={`crm-immo-commentaire-contenu-${c.id}`}
        style={{ color: t.text.primary }}>
        {c.contenu}
      </p>
    </div>
  );
}
