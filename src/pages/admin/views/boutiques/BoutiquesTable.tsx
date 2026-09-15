import { Box, MoreHorizontal, Store } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { templateLabel, formatBoutiqueDate } from './boutiqueTypes';
import type { Boutique } from './boutiqueTypes';
import { aUneBoutique3D } from '../../../../boutique3d/modeles';
import CheckBox from '../crm/CheckBox';

interface Props {
  boutiques: Boutique[];
  loading: boolean;
  /**
   * Ouvre la boutique 3D. Le bouton n'apparait que pour les boutiques dont le `template_key`
   * correspond a un modele 3D connu : une boutique creee de zero n'a rien a ouvrir.
   */
  onOuvrir?: (boutique: Boutique) => void;
  /**
   * Selection multiple. La colonne de cases n'apparait que si `onBasculer` est fourni :
   * un tableau rendu sans ces props reste exactement celui d'avant.
   */
  selection?: Set<string>;
  onBasculer?: (id: string) => void;
  onBasculerTout?: () => void;
}

const COLUMNS = ['Nom de la boutique', 'Modèle', 'Date de création', 'Statut', 'Actions'];

export default function BoutiquesTable({ boutiques, loading, onOuvrir, selection, onBasculer, onBasculerTout }: Props) {
  const t = useThemeTokens();
  const selectionnable = Boolean(onBasculer);
  const choisies = selection ?? new Set<string>();
  const toutCoche = boutiques.length > 0 && choisies.size === boutiques.length;
  const partiel = choisies.size > 0 && choisies.size < boutiques.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: t.accent.border, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (boutiques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
        <Store className="w-8 h-8" style={{ color: t.text.quaternary }} />
        <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>Aucune boutique pour le moment</p>
        <p className="text-xs" style={{ color: t.text.tertiary }}>
          Utilisez « Ajouter une boutique » pour créer la première.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.table.headerBorder}`, background: t.table.headerBg }}>
              {selectionnable && (
                <th className="px-3 py-3 w-10" data-testid="boutiques-tout-selectionner">
                  <CheckBox checked={toutCoche} indeterminate={partiel} onChange={() => onBasculerTout?.()} />
                </th>
              )}
              {COLUMNS.map(col => (
                <th key={col}
                  className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap"
                  style={{ color: t.table.headerText }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boutiques.map(b => (
              <tr key={b.id} data-row-id={b.id} className="group transition-all duration-150"
                style={{
                  borderBottom: `1px solid ${t.table.rowBorder}`,
                  background: choisies.has(b.id) ? t.accent.bg : undefined,
                }}>
                {selectionnable && (
                  <td className="px-3 py-4 w-10" data-testid={`boutique-case-${b.id}`}>
                    <CheckBox checked={choisies.has(b.id)} onChange={() => onBasculer?.(b.id)} />
                  </td>
                )}
                <td className="px-5 py-4 text-sm font-semibold whitespace-nowrap" style={{ color: t.table.cellText }}>
                  {b.name}
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>
                  {templateLabel(b.template_key)}
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>
                  {formatBoutiqueDate(b.created_at)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                    style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
                    {b.status === 'active' ? 'Active' : b.status}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onOuvrir && aUneBoutique3D(b.template_key) && (
                      <button type="button" onClick={() => onOuvrir(b)}
                        data-testid={`ouvrir-boutique-${b.id}`}
                        title={`Ouvrir ${b.name} en 3D`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: t.accent.solid, color: t.text.inverse }}>
                        <Box className="w-3.5 h-3.5" />
                        Ouvrir la boutique
                      </button>
                    )}
                    <button type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                      <MoreHorizontal className="w-3.5 h-3.5" />
                      Actions
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
