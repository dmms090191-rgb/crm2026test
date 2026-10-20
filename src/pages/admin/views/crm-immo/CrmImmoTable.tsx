import { ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { valeurAffichee, type Sens } from '../../../../lib/crmImmoRecherche';
import { formatDateImmo, type DossierImmo } from './crmImmoTypes';

/**
 * Le tableau DESKTOP des dossiers CRM Immo.
 *
 * `hidden md:block` : sous 768 px ce composant n'existe pas du tout a l'ecran — c'est
 * CrmImmoCards qui prend le relais. Un tableau comprime n'est pas une version mobile,
 * et c'est explicitement ce que David a refuse.
 *
 * Toutes les couleurs viennent de `tokens.table.*` et de `tokens.text.*`. Aucune valeur
 * en dur : le depot a 16 themes, dont 5 clairs, et une couleur ecrite a la main passe le
 * build, passe le typecheck, s'affiche correctement sur les sombres et devient illisible
 * sur les clairs.
 */

interface Props {
  dossiers: DossierImmo[];
  colonnes: Colonne[];
  loading: boolean;
  triSur: string | null;
  sens: Sens;
  onTrier: (cle: string) => void;
  onModifier: (d: DossierImmo) => void;
  onSupprimer: (d: DossierImmo) => void;
}

export default function CrmImmoTable({
  dossiers, colonnes, loading, triSur, sens, onTrier, onModifier, onSupprimer,
}: Props) {
  const t = useThemeTokens();

  /** Une date s'affiche en jj/mm/aaaa ; un jour d'encaissement se lit « le 5 ». */
  function cellule(d: DossierImmo, c: Colonne): string {
    const brut = valeurAffichee(d, c);
    if (brut === '') return '—';
    if (c.type === 'date') return formatDateImmo(brut);
    if (c.famille === 'systeme' && c.cle === 'jour_encaissement') return `le ${brut}`;
    return brut;
  }

  return (
    <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.card.border}` }} data-testid="crm-immo-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.table.headerBg, borderBottom: `1px solid ${t.table.headerBorder}` }}>
              {colonnes.map(c => {
                const cle = cleColonne(c);
                const actif = triSur === cle;
                return (
                  <th key={cle} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                    style={{ color: t.table.headerText, borderRight: `1px solid ${t.table.colSep}` }}>
                    <button type="button" onClick={() => onTrier(cle)}
                      data-testid={`crm-immo-trier-${cle}`}
                      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: 'inherit' }}>
                      {c.nom}
                      {actif && (sens === 'asc'
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  </th>
                );
              })}
              <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: t.table.headerText }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={colonnes.length + 1} className="px-3 py-8 text-center text-sm" style={{ color: t.table.cellTextMuted }}>
                Chargement des dossiers…
              </td></tr>
            )}
            {!loading && dossiers.length === 0 && (
              <tr><td colSpan={colonnes.length + 1} className="px-3 py-8 text-center text-sm" style={{ color: t.table.cellTextMuted }}
                data-testid="crm-immo-vide">
                Aucun dossier ne correspond.
              </td></tr>
            )}
            {!loading && dossiers.map(d => (
              <tr key={d.id} data-testid={`crm-immo-ligne-${d.id}`}
                style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                {colonnes.map(c => (
                  <td key={cleColonne(c)} className="px-3 py-2.5 align-top"
                    style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>
                    {cellule(d, c)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <button type="button" onClick={() => onModifier(d)}
                      title="Modifier"
                      aria-label={`Modifier le dossier de ${[d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom}`}
                      data-testid={`crm-immo-modifier-${d.id}`}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: t.table.cellIcon }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => onSupprimer(d)}
                      title="Supprimer"
                      aria-label={`Supprimer le dossier de ${[d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom}`}
                      data-testid={`crm-immo-supprimer-${d.id}`}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: t.danger.text }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
