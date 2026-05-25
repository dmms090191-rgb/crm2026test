import { Monitor, ExternalLink } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import { getSampleValue } from './TabColumnsHelpers';

interface DesktopPreviewBlockProps {
  visibleCols: ColumnDef[];
  t: ThemeTokens;
}

function renderPreviewCell(value: string, fieldType: string | undefined, t: ThemeTokens) {
  if (fieldType === 'url') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[7px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
        <ExternalLink className="w-1.5 h-1.5" />Lien
      </span>
    );
  }
  if (value === 'Nouveau' || value === 'Contacte' || value === 'Actif' || value === 'Inactif' || value === 'On' || value === 'Off') {
    const isPositive = value === 'Nouveau' || value === 'Actif' || value === 'On' || value === 'Contacte';
    return (
      <span className="inline-flex px-1 py-px rounded text-[7px] font-bold" style={{
        background: isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.15)',
        color: isPositive ? '#22c55e' : t.text.tertiary,
      }}>
        {value}
      </span>
    );
  }
  if (value === '...') {
    return (
      <span className="inline-flex w-3 h-3 rounded-full items-center justify-center" style={{ background: t.surface.secondary }}>
        <span className="text-[6px] font-bold" style={{ color: t.text.tertiary }}>...</span>
      </span>
    );
  }
  return <span className="truncate" style={{ color: t.text.primary }}>{value}</span>;
}

export default function DesktopPreviewBlock({ visibleCols, t }: DesktopPreviewBlockProps) {
  return (
    <div className="space-y-2 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
          <Monitor className="w-3 h-3" style={{ color: t.accent.text }} />
          <span className="text-[10px] font-bold" style={{ color: t.accent.text }}>Apercu du tableau desktop</span>
        </div>
        <span className="text-[10px]" style={{ color: t.text.tertiary }}>{visibleCols.length} colonnes visibles</span>
      </div>

      <p className="text-[10px]" style={{ color: t.text.tertiary }}>
        Voici le rendu avec les colonnes visibles dans l'ordre choisi.
      </p>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${t.card.border}`, background: t.card.bg, boxShadow: t.card.shadow }}
      >
        <div
          className="overflow-x-auto"
          style={{
            maskImage: visibleCols.length > 6 ? 'linear-gradient(to right, black 90%, transparent 100%)' : undefined,
            WebkitMaskImage: visibleCols.length > 6 ? 'linear-gradient(to right, black 90%, transparent 100%)' : undefined,
          }}
        >
          <table className="w-full text-[8px]" style={{ minWidth: visibleCols.length > 4 ? visibleCols.length * 80 : undefined }}>
            <thead>
              <tr style={{ background: t.table.headerBg }}>
                {visibleCols.map(col => (
                  <th key={col.key} className="px-2 py-1.5 text-left font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: t.table.headerText, borderBottom: `1px solid ${t.table.headerBorder}` }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1].map(rowIdx => (
                <tr key={rowIdx} style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                  {visibleCols.map(col => (
                    <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                      {renderPreviewCell(getSampleValue(col.key, rowIdx, col.fieldType), col.fieldType, t)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleCols.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <p className="text-[10px]" style={{ color: t.text.tertiary }}>Aucune colonne visible</p>
          </div>
        )}
      </div>
    </div>
  );
}
