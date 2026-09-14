import { MoreHorizontal, Store } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { templateLabel, formatBoutiqueDate } from './boutiqueTypes';
import type { Boutique } from './boutiqueTypes';

interface Props {
  boutiques: Boutique[];
  loading: boolean;
}

const COLUMNS = ['Nom de la boutique', 'Modèle', 'Date de création', 'Statut', 'Actions'];

export default function BoutiquesTable({ boutiques, loading }: Props) {
  const t = useThemeTokens();

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
                style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
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
                  <button type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Actions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
