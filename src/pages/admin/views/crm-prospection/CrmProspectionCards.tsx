import { Pencil, Trash2, Mail, Briefcase, Building2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { PastilleStatut, CelluleLien, CelluleCommentaire } from './CrmProspectionCellules';
import type { LeadProspection, StatutProspection } from '../../../../lib/crmProspectionRecherche';

/**
 * LE RENDU TELEPHONE : DES FICHES, PAS UN TABLEAU COMPRIME.
 *
 * Decision de David le 02/11/2026, apres qu'on lui a montre que sa consigne (« preferer
 * un tableau horizontalement scrollable ») contredisait son propre refus, consigne dans
 * CrmImmoCards.tsx : « sur mobile, ne compresse pas simplement le tableau ». Dix colonnes
 * dans 375 px sont illisibles, et le defilement horizontal cache la moitie de
 * l'information derriere un geste que personne ne devine.
 *
 * `md:hidden` : au-dessus de 768 px ce composant n'existe pas, et le tableau prend le
 * relais. Les deux ne sont jamais montes en meme temps.
 *
 * AUCUNE INFORMATION N'EST RETIREE. Les dix colonnes sont toutes la — elles sont
 * reorganisees : l'identite en tete, le statut a cote, puis les champs, le lien, le
 * commentaire, et les actions en pied.
 */

interface Props {
  leads: readonly LeadProspection[];
  statuts: readonly StatutProspection[];
  selection: ReadonlySet<string>;
  onBasculerUn: (id: string) => void;
  onModifier: (l: LeadProspection) => void;
  onSupprimer: (l: LeadProspection) => void;
  onVoirCommentaire: (l: LeadProspection) => void;
  lectureSeule: boolean;
}

export default function CrmProspectionCards({
  leads, statuts, selection, onBasculerUn, onModifier, onSupprimer, onVoirCommentaire, lectureSeule,
}: Props) {
  const t = useThemeTokens();

  return (
    <div className="md:hidden grid gap-2.5" data-testid="crm-prospection-cards">
      {leads.map((l) => {
        const coche = selection.has(l.id);
        const nomComplet = [l.prenom, l.nom].filter(Boolean).join(' ') || l.nom;
        return (
          <div key={l.id} data-testid="crm-prospection-carte"
            className="rounded-xl p-3"
            style={{
              background: coche ? t.table.rowSelected : t.card.bg,
              border: `1px solid ${coche ? t.accent.solid : t.card.border}`,
            }}>

            <div className="flex items-start gap-2.5">
              {/*
                LA CASE FAIT 44 px DE CIBLE, pas 16. C'est la taille minimale d'une cible
                tactile tenue ailleurs dans le depot (cibleTactile.test.ts) : une case de
                16 px au doigt se rate une fois sur trois, et rater une case de selection
                avant une suppression groupee n'est pas une erreur anodine.
                Le <label> porte la cible ; la case reste visuellement petite.
              */}
              <label className="flex items-center justify-center w-11 h-11 -m-1.5 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid={`crm-prospection-case-mobile-${l.id}`}
                  checked={coche}
                  onChange={() => onBasculerUn(l.id)}
                  aria-label={`Sélectionner ${nomComplet}`}
                  className="w-4 h-4"
                  style={{ accentColor: t.accent.solid }}
                />
              </label>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>{nomComplet}</p>
                <div className="mt-1">
                  <PastilleStatut statutId={l.statut_id} statuts={statuts} />
                </div>
              </div>
            </div>

            <div className="mt-2.5 pl-[46px] grid gap-1.5">
              {l.poste && (
                <p className="text-xs flex items-center gap-1.5 min-w-0" style={{ color: t.table.cellText }}>
                  <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: t.table.cellIcon }} />
                  <span className="truncate">{l.poste}</span>
                </p>
              )}
              {/* « Societe » a l'ecran, `entreprise` en base : l'employeur du prospect. */}
              {l.entreprise && (
                <p className="text-xs flex items-center gap-1.5 min-w-0" style={{ color: t.table.cellText }}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: t.table.cellIcon }} />
                  <span className="truncate">{l.entreprise}</span>
                </p>
              )}
              {l.email && (
                <p className="text-xs flex items-center gap-1.5 min-w-0" style={{ color: t.table.cellText }}>
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: t.table.cellIcon }} />
                  <span className="truncate">{l.email}</span>
                </p>
              )}
              {l.lien && <CelluleLien lien={l.lien} />}
              {l.commentaire && (
                <CelluleCommentaire commentaire={l.commentaire} onVoir={() => onVoirCommentaire(l)} />
              )}
            </div>

            <div className="mt-3 pt-2.5 flex justify-end gap-2" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
              {/* 44 px de haut : meme regle de cible tactile que la case ci-dessus. */}
              <button type="button" onClick={() => onModifier(l)} disabled={lectureSeule}
                data-testid={`crm-prospection-modifier-mobile-${l.id}`}
                className="h-11 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}>
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button type="button" onClick={() => onSupprimer(l)} disabled={lectureSeule}
                data-testid={`crm-prospection-supprimer-mobile-${l.id}`}
                aria-label={`Supprimer ${nomComplet}`}
                className="h-11 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
