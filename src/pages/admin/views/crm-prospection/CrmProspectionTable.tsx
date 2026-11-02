import { useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { PastilleStatut, CelluleLien, CelluleCommentaire } from './CrmProspectionCellules';
import { COLONNES_PROSPECTION } from './crmProspectionColonnes';
import {
  etatCaseEnTete,
  type LeadProspection, type StatutProspection, type ColonneTri, type SensTri,
} from '../../../../lib/crmProspectionRecherche';

/**
 * LE TABLEAU, POUR LE BUREAU ET LA TABLETTE.
 *
 * `hidden md:block` autour d'un `overflow-x-auto` : sous 768 px ce composant n'existe
 * pas, et les cartes prennent le relais. David a tranche le 02/11/2026 — des cartes, pas
 * un tableau comprime —, en accord avec le choix deja fait pour les trois autres CRM du
 * depot et consigne dans CrmImmoCards.tsx.
 *
 * LES DIX COLONNES SONT DANS L'ORDRE DEMANDE : Selection, Nom, Prenom, Email, Poste,
 * Societe, Lien, Statut, Commentaire, Actions.
 */

interface Props {
  leads: readonly LeadProspection[];
  statuts: readonly StatutProspection[];
  selection: ReadonlySet<string>;
  onBasculerUn: (id: string) => void;
  onBasculerTous: () => void;
  tri: ColonneTri;
  sens: SensTri;
  onTrier: (c: ColonneTri) => void;
  onModifier: (l: LeadProspection) => void;
  onSupprimer: (l: LeadProspection) => void;
  onVoirCommentaire: (l: LeadProspection) => void;
  lectureSeule: boolean;
}

export default function CrmProspectionTable({
  leads, statuts, selection, onBasculerUn, onBasculerTous,
  tri, sens, onTrier, onModifier, onSupprimer, onVoirCommentaire, lectureSeule,
}: Props) {
  const t = useThemeTokens();
  const caseEnTete = useRef<HTMLInputElement>(null);
  const etat = etatCaseEnTete(leads, selection);

  /*
   * L'ETAT INDETERMINE NE S'ECRIT PAS EN JSX : `indeterminate` est une propriete du noeud
   * DOM, pas un attribut HTML. React ne la pose donc pas, et sans cet effet la case
   * afficherait VIDE sur une selection partielle — l'utilisateur cliquerait en croyant
   * tout selectionner, alors qu'il viendrait de tout deselectionner.
   */
  useEffect(() => {
    if (caseEnTete.current) caseEnTete.current.indeterminate = etat === 'partielle';
  }, [etat]);

  return (
    <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.card.border}` }}
      data-testid="crm-prospection-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.table.headerBg, borderBottom: `1px solid ${t.table.headerBorder}` }}>
              {/*
                LA CASE D'EN-TETE EST DANS LE <th>, et elle ne porte QUE les lignes
                visibles. `leads` est deja la liste filtree et triee : la case ne peut donc
                pas atteindre une ligne que les filtres masquent.

                C'est l'exigence explicite de David, et le defaut inverse existe dans ce
                depot — le toggleAll de ListeVendeurs.tsx selectionne TOUS les
                enregistrements, pas les lignes affichees.
              */}
              <th className="px-3 py-2.5 w-10" style={{ borderRight: `1px solid ${t.table.colSep}` }}>
                <input
                  ref={caseEnTete}
                  type="checkbox"
                  data-testid="crm-prospection-tout-selectionner"
                  checked={etat === 'toute'}
                  onChange={onBasculerTous}
                  disabled={leads.length === 0}
                  aria-label="Sélectionner les lignes affichées"
                  className="w-4 h-4 cursor-pointer accent-current"
                  style={{ accentColor: t.accent.solid }}
                />
              </th>

              {COLONNES_PROSPECTION.map((c) => (
                <th key={c.cle} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                  style={{ color: t.table.headerText, borderRight: `1px solid ${t.table.colSep}` }}>
                  {c.tri === undefined ? c.libelle : (
                    <button type="button" onClick={() => onTrier(c.tri as ColonneTri)}
                      data-testid={`crm-prospection-trier-${c.tri}`}
                      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: 'inherit' }}>
                      {c.libelle}
                      {tri === c.tri && (sens === 'asc'
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  )}
                </th>
              ))}

              <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                style={{ color: t.table.headerText }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((l) => {
              const coche = selection.has(l.id);
              return (
                <tr key={l.id} data-testid="crm-prospection-ligne"
                  style={{
                    borderBottom: `1px solid ${t.table.rowBorder}`,
                    background: coche ? t.table.rowSelected : 'transparent',
                  }}>
                  <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${t.table.colSep}` }}>
                    <input
                      type="checkbox"
                      data-testid={`crm-prospection-case-${l.id}`}
                      checked={coche}
                      onChange={() => onBasculerUn(l.id)}
                      aria-label={`Sélectionner ${l.nom}`}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: t.accent.solid }}
                    />
                  </td>

                  <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>{l.nom}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>{l.prenom || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>{l.email || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>{l.poste || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>{l.entreprise || '—'}</td>
                  <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${t.table.colSep}` }}>
                    <CelluleLien lien={l.lien} />
                  </td>
                  <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${t.table.colSep}` }}>
                    <PastilleStatut statutId={l.statut_id} statuts={statuts} />
                  </td>
                  {/* Largeur BORNEE : sans elle, un commentaire long etire la colonne et
                      pousse Actions hors de l'ecran, exactement comme c'etait arrive au
                      CRM Immo avant qu'on epingle sa colonne Actions. */}
                  <td className="px-3 py-2.5 max-w-[260px]" style={{ borderRight: `1px solid ${t.table.colSep}` }}>
                    <CelluleCommentaire commentaire={l.commentaire} onVoir={() => onVoirCommentaire(l)} />
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onModifier(l)} disabled={lectureSeule}
                        data-testid={`crm-prospection-modifier-${l.id}`}
                        title="Modifier" aria-label={`Modifier ${l.nom}`}
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center transition-opacity disabled:opacity-40"
                        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.table.cellIcon }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => onSupprimer(l)} disabled={lectureSeule}
                        data-testid={`crm-prospection-supprimer-${l.id}`}
                        title="Supprimer" aria-label={`Supprimer ${l.nom}`}
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center transition-opacity disabled:opacity-40"
                        style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
