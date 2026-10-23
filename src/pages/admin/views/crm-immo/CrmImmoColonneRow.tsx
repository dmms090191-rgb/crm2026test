import { useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Pencil, Trash2, Lock, Check, X, GripVertical } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { peutSupprimer, peutMasquer, cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { TYPES_COLONNE } from './crmImmoTypes';
import type { GlisseLigne } from './useGlisserColonnes';

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
 *
 * Ce verdict tient toujours, et la poignée ci-dessous ne le contredit pas : il vise le
 * glisser-déposer posé sur la LIGNE ENTIÈRE, qui réclame `touch-action: none` sur toute
 * sa largeur et tue le défilement de la liste. La poignée est la seule à le porter —
 * partout ailleurs sur la ligne, le doigt continue de faire défiler. Les deux gestes
 * cohabitent, et les chevrons restent le chemin clavier.
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
  /** Absent : la ligne ne se saisit pas, et les chevrons restent seuls. */
  glisse?: GlisseLigne;
}

export default function CrmImmoColonneRow({
  colonne, premier, dernier, onMonter, onDescendre, onBasculerMasquage, onRenommer, onSupprimer,
  glisse,
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
      /* C'est par cet attribut, et non par un conteneur, que le geste retrouve les lignes
         de SA famille : les deux listes vivent dans la meme zone defilante, et leurs
         ordres ne partent pas au meme endroit. */
      data-glisse={glisse?.famille}
      style={{
        borderBottom: `1px solid ${t.surface.borderLight}`,
        opacity: colonne.masquee ? 0.55 : 1,
        background: glisse?.saisie ? t.surface.selected : undefined,
        boxShadow: glisse?.saisie ? t.modal.shadow : undefined,
        ...glisse?.style,
      }}>

      {/*
        Un DIV, et non un bouton : l'action est deja offerte au clavier par les deux
        chevrons juste a cote. Un huitieme bouton, sans effet au clic et redondant pour
        un lecteur d'ecran, n'ajouterait qu'une annonce de plus — d'ou aria-hidden.
      */}
      {glisse && !edition && (
        <div {...glisse.poignee}
          title="Glisser pour déplacer"
          aria-hidden="true"
          data-testid={`crm-immo-colonne-glisser-${cle}`}
          /* Une icone de 14 px, portee a 34 de large sur mobile, et a la hauteur PLEINE
             de la ligne par self-stretch. Etroite mais haute : un glissement n'a pas
             besoin de la precision d'un bouton — il commence n'importe ou dans la bande
             et se poursuit bien au-dela d'elle, le pointeur etant capture. */
          className="shrink-0 self-stretch flex items-center p-1 max-md:p-2.5 rounded"
          style={{ ...glisse.poignee.style, color: t.label.muted }}>
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="flex flex-col shrink-0">
        <button type="button" onClick={onMonter} disabled={premier} title="Monter"
          aria-label={`Monter la colonne ${colonne.nom}`}
          data-testid={`crm-immo-colonne-monter-${cle}`}
          /* Mesure a 375 px : 18 x 18 — la plus petite cible de tout le module, alors que
             ces deux chevrons sont le SEUL moyen de reordonner a une main. Le rembourrage
             les porte a 30 x 30, et un ::before horizontal a 46 de large.

             Pourquoi pas 44 de HAUT : ils sont empiles. Deux zones de 44 dans une ligne
             de 60 px se chevaucheraient au milieu, et << descendre >> declencherait
             << monter >>. 44 de haut chacun exigerait une ligne de 88 px. */
          className="relative p-0.5 max-md:p-2 rounded disabled:opacity-25 max-md:before:absolute max-md:before:content-[''] max-md:before:-inset-x-2 max-md:before:inset-y-0"
          style={{ color: t.label.muted }}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDescendre} disabled={dernier} title="Descendre"
          aria-label={`Descendre la colonne ${colonne.nom}`}
          data-testid={`crm-immo-colonne-descendre-${cle}`}
          className="relative p-0.5 max-md:p-2 rounded disabled:opacity-25 max-md:before:absolute max-md:before:content-[''] max-md:before:-inset-x-2 max-md:before:inset-y-0"
          style={{ color: t.label.muted }}>
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
              className="flex-1 min-w-0 px-2 py-1 max-md:py-2 rounded text-sm max-md:text-base outline-none"
              style={{ background: t.input.bg, border: `1px solid ${t.input.borderFocus}`, color: t.input.text }}
            />
            <button type="button" onClick={() => { onRenommer(brouillon); setEdition(false); }}
              title="Valider"
              aria-label={`Valider le nouveau nom de la colonne ${colonne.nom}`}
              data-testid={`crm-immo-colonne-renommer-ok-${cle}`}
              /* Mesure : 24 x 24 px, les plus petites cibles de la surface — et c est
                 litteralement la paire valider / annuler. 14 px de rembourrage les
                 portent a 44. */
              className="p-1 max-md:p-[14px] rounded" style={{ color: t.success.text }}>
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setBrouillon(colonne.nom); setEdition(false); }}
              title="Annuler"
              aria-label={`Annuler le renommage de la colonne ${colonne.nom}`}
              className="p-1 max-md:p-[14px] rounded" style={{ color: t.label.muted }}>
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
            /* Le libelle PORTE l etat : un lecteur d ecran annonce alors l action
               disponible, pas seulement le nom du bouton. aria-pressed le redit sous une
               forme que les technologies d assistance savent restituer comme un
               interrupteur. */
            aria-label={colonne.masquee ? `Afficher la colonne ${colonne.nom}` : `Masquer la colonne ${colonne.nom}`}
            aria-pressed={colonne.masquee}
            data-testid={`crm-immo-colonne-masquer-${cle}`}
            /* Mesure a 375 px : 28 x 28, et trois de ces boutons se suivent a 2 px.
               Un ::before les ferait se chevaucher — on agrandit donc le bouton lui-meme.
               15 px de rembourrage autour d une icone de 14 donnent 44 x 44 pleins. */
            className="p-1.5 max-md:p-[15px] rounded" style={{ color: t.label.muted }}>
            {colonne.masquee ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {!systeme && !edition && (
          <button type="button" onClick={() => { setBrouillon(colonne.nom); setEdition(true); }}
            title="Renommer"
            aria-label={`Renommer la colonne ${colonne.nom}`}
            data-testid={`crm-immo-colonne-editer-${cle}`}
            className="p-1.5 max-md:p-[15px] rounded" style={{ color: t.table.cellIcon }}>
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {/* Pas de bouton desactive : pour une colonne systeme, il n'existe pas. */}
        {peutSupprimer(colonne) && (
          confirme ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={onSupprimer}
                data-testid={`crm-immo-colonne-supprimer-ok-${cle}`}
                className="px-2 py-1 max-md:py-3 rounded text-[11px] font-semibold"
                style={{ background: t.danger.text, color: t.text.inverse }}>
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirme(false)}
                className="px-2 py-1 max-md:px-3 max-md:py-3 rounded text-[11px]" style={{ color: t.label.muted }}>
                Non
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirme(true)}
              title="Supprimer"
              aria-label={`Supprimer la colonne ${colonne.nom}`}
              data-testid={`crm-immo-colonne-supprimer-${cle}`}
              className="p-1.5 max-md:p-[15px] rounded" style={{ color: t.danger.text }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
