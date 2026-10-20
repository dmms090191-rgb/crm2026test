import { useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Pencil, Trash2, Lock, Check, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { peutSupprimer, peutMasquer, cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { TYPES_COLONNE } from './crmImmoTypes';

/**
 * Une ligne de l'organisateur de colonnes.
 *
 * Tout dérive de DEUX propriétés, et d'elles seules :
 *
 *   - `famille === 'systeme'` → badge cadenassé, AUCUN bouton Supprimer. Et ce n'est pas
 *     un bouton désactivé par politesse : une colonne système est une vraie colonne de
 *     `crm_immo_dossiers`, il n'y a rien à supprimer. La protection est structurelle.
 *   - `masquable === false` (le seul cas : `nom`) → AUCUN bouton Masquer. `nom` est
 *     NOT NULL en base ; le masquer laisserait des lignes sans rien pour les identifier.
 *
 * Les chevrons monter/descendre sont OBLIGATOIRES, pas un supplément : sur mobile un
 * glisser-déposer au doigt dans une liste qui défile est inutilisable. Ils sont le seul
 * moyen fiable de réordonner à une main.
 */

interface Props {
  colonne: Colonne;
  premier: boolean;
  dernier: boolean;
  onMonter: () => void;
  onDescendre: () => void;
  onBasculerMasquage: () => void;
  onRenommer: (nom: string) => void;
  onSupprimer: () => void;
}

export default function CrmImmoColonneRow({
  colonne, premier, dernier, onMonter, onDescendre, onBasculerMasquage, onRenommer, onSupprimer,
}: Props) {
  const t = useThemeTokens();
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(colonne.nom);
  const [confirme, setConfirme] = useState(false);

  const systeme = colonne.famille === 'systeme';
  const cle = cleColonne(colonne);
  const typeLisible = TYPES_COLONNE.find(x => x.valeur === colonne.type)?.libelle ?? colonne.type;

  return (
    <div className="flex items-center gap-2 px-3 py-2"
      data-testid={`crm-immo-colonne-${cle}`}
      style={{ borderBottom: `1px solid ${t.surface.borderLight}`, opacity: colonne.masquee ? 0.55 : 1 }}>

      <div className="flex flex-col shrink-0">
        <button type="button" onClick={onMonter} disabled={premier} title="Monter"
          data-testid={`crm-immo-colonne-monter-${cle}`}
          className="p-0.5 rounded disabled:opacity-25" style={{ color: t.label.muted }}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDescendre} disabled={dernier} title="Descendre"
          data-testid={`crm-immo-colonne-descendre-${cle}`}
          className="p-0.5 rounded disabled:opacity-25" style={{ color: t.label.muted }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        {edition ? (
          <div className="flex items-center gap-1.5">
            <input
              value={brouillon}
              onChange={e => setBrouillon(e.target.value)}
              autoFocus
              data-testid={`crm-immo-colonne-nom-${cle}`}
              className="flex-1 min-w-0 px-2 py-1 rounded text-sm outline-none"
              style={{ background: t.input.bg, border: `1px solid ${t.input.borderFocus}`, color: t.input.text }}
            />
            <button type="button" onClick={() => { onRenommer(brouillon); setEdition(false); }}
              title="Valider" data-testid={`crm-immo-colonne-renommer-ok-${cle}`}
              className="p-1 rounded" style={{ color: t.success.text }}>
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setBrouillon(colonne.nom); setEdition(false); }}
              title="Annuler" className="p-1 rounded" style={{ color: t.label.muted }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm truncate" style={{ color: t.text.primary }}>{colonne.nom}</span>
              {systeme && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  title="Colonne système : elle fait partie de la fiche, elle ne peut pas être supprimée."
                  style={{ background: t.surface.secondary, color: t.label.hint }}>
                  <Lock className="w-2.5 h-2.5" /> système
                </span>
              )}
            </div>
            <span className="text-[11px]" style={{ color: t.label.hint }}>{typeLisible}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {peutMasquer(colonne) && (
          <button type="button" onClick={onBasculerMasquage}
            title={colonne.masquee ? 'Afficher' : 'Masquer'}
            data-testid={`crm-immo-colonne-masquer-${cle}`}
            className="p-1.5 rounded" style={{ color: t.label.muted }}>
            {colonne.masquee ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {!systeme && !edition && (
          <button type="button" onClick={() => { setBrouillon(colonne.nom); setEdition(true); }}
            title="Renommer" data-testid={`crm-immo-colonne-editer-${cle}`}
            className="p-1.5 rounded" style={{ color: t.table.cellIcon }}>
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {/* Pas de bouton desactive : pour une colonne systeme, il n'existe pas. */}
        {peutSupprimer(colonne) && (
          confirme ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={onSupprimer}
                data-testid={`crm-immo-colonne-supprimer-ok-${cle}`}
                className="px-2 py-1 rounded text-[11px] font-semibold"
                style={{ background: t.danger.text, color: t.text.inverse }}>
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirme(false)}
                className="px-2 py-1 rounded text-[11px]" style={{ color: t.label.muted }}>
                Non
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirme(true)}
              title="Supprimer" data-testid={`crm-immo-colonne-supprimer-${cle}`}
              className="p-1.5 rounded" style={{ color: t.danger.text }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
