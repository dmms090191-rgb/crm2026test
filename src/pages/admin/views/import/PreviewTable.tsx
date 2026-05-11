import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProcessedRow, RowStatus } from '../../../../lib/csvImportPipeline';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const PAGE_SIZE = 20;

type FilterType = 'all' | RowStatus;

interface PreviewTableProps {
  rows: ProcessedRow[];
  allColumns: string[];
  mappedColumns: { prenom?: string; nom?: string; email?: string; telephone?: string };
}

function StatusBadge({ status, reason, dupIndex, dupName, dupMatchType }: {
  status: RowStatus;
  reason?: string;
  dupIndex?: number;
  dupName?: string;
  dupMatchType?: string;
}) {
  const configs = {
    valid: { label: 'Nouveau', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
    dup_file: { label: 'Doublon fichier', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
    dup_crm: { label: 'Doublon CRM', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
    error: { label: 'Erreur', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  };
  const cfg = configs[status];

  let tooltip = '';
  if (status === 'dup_file' && dupIndex !== undefined) tooltip = `Doublon de la ligne ${dupIndex + 1} du fichier`;
  if (status === 'dup_crm' && dupName) tooltip = `Doublon CRM — correspondance ${dupMatchType} avec "${dupName}"`;
  if (status === 'error' && reason) tooltip = reason;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-default"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      title={tooltip}
    >
      {cfg.label}
    </span>
  );
}

export default function PreviewTable({ rows, allColumns, mappedColumns }: PreviewTableProps) {
  const tokens = useThemeTokens();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredRows = filter === 'all' ? rows : rows.filter(r => r.status === filter);
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'all' as const, label: 'Tous', count: rows.length },
    { key: 'valid' as const, label: 'Nouveaux', count: rows.filter(r => r.status === 'valid').length },
    { key: 'dup_file' as const, label: 'Doub. fich.', count: rows.filter(r => r.status === 'dup_file').length },
    { key: 'dup_crm' as const, label: 'Doub. CRM', count: rows.filter(r => r.status === 'dup_crm').length },
    { key: 'error' as const, label: 'Erreurs', count: rows.filter(r => r.status === 'error').length },
  ].filter(t => t.key === 'all' || t.count > 0);

  const isMapped = (col: string) =>
    Object.values(mappedColumns).includes(col);

  return (
    <div>
      {/* Filter bar + pagination */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-5 py-3"
        style={{ borderBottom: tokens.table.headerBorder }}
      >
        <div className="overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 w-max">
            {filterTabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setFilter(t.key); setPage(0); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap"
                style={
                  filter === t.key
                    ? { background: 'rgba(34,211,238,0.12)', color: tokens.accent.text, border: tokens.accent.border }
                    : { background: tokens.surface.tertiary, color: tokens.text.tertiary, border: tokens.surface.borderLight }
                }
              >
                {t.label}
                <span
                  className="px-1 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background: filter === t.key ? 'rgba(34,211,238,0.15)' : tokens.surface.borderLight,
                    color: filter === t.key ? tokens.accent.text : tokens.text.tertiary,
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] tabular-nums" style={{ color: tokens.text.tertiary }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
          <thead>
            <tr style={{ borderBottom: tokens.table.headerBorder, background: tokens.table.headerBg }}>
              <th className="text-left px-3 sm:px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase w-10" style={{ color: tokens.table.headerText }}>#</th>
              <th className="text-left px-3 sm:px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: tokens.table.headerText }}>Statut</th>
              {allColumns.map(col => (
                <th
                  key={col}
                  className="text-left px-3 sm:px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{ color: isMapped(col) ? tokens.accent.text : tokens.table.headerText }}
                >
                  {col}
                  {isMapped(col) && (
                    <span className="ml-1 text-[8px]" style={{ color: 'rgba(34,211,238,0.5)' }}>&#10003;</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr
                key={row.index}
                className="transition-colors"
                style={{
                  borderBottom: tokens.table.rowBorder,
                  background:
                    row.status === 'error' ? 'rgba(248,113,113,0.03)' :
                    row.status === 'dup_crm' ? 'rgba(251,146,60,0.03)' :
                    row.status === 'dup_file' ? 'rgba(251,191,36,0.03)' :
                    'transparent',
                }}
              >
                <td className="px-3 sm:px-4 py-2.5 tabular-nums" style={{ color: tokens.label.hint }}>{row.index + 1}</td>
                <td className="px-3 sm:px-4 py-2.5">
                  <StatusBadge
                    status={row.status}
                    reason={row.errorReason}
                    dupIndex={row.dupOriginalIndex}
                    dupName={row.dupLeadName}
                    dupMatchType={row.dupMatchType}
                  />
                </td>
                {allColumns.map(col => (
                  <td key={col} className="px-3 sm:px-4 py-2.5 max-w-[180px] truncate" style={{ color: tokens.table.cellText }}>
                    {row.raw[col] || <span style={{ color: tokens.label.hint }}>&mdash;</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs" style={{ color: tokens.text.quaternary }}>Aucune ligne dans cette categorie</p>
        </div>
      )}
    </div>
  );
}
