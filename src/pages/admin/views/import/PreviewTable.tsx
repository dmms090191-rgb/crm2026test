import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProcessedRow, RowStatus } from '../../../../lib/csvImportPipeline';

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
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredRows = filter === 'all' ? rows : rows.filter(r => r.status === filter);
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: rows.length },
    { key: 'valid', label: 'Nouveaux', count: rows.filter(r => r.status === 'valid').length },
    { key: 'dup_file', label: 'Doublons fichier', count: rows.filter(r => r.status === 'dup_file').length },
    { key: 'dup_crm', label: 'Doublons CRM', count: rows.filter(r => r.status === 'dup_crm').length },
    { key: 'error', label: 'Erreurs', count: rows.filter(r => r.status === 'error').length },
  ].filter(t => t.key === 'all' || t.count > 0);

  const isMapped = (col: string) =>
    Object.values(mappedColumns).includes(col);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="flex items-center justify-between flex-wrap gap-2 px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setFilter(t.key); setPage(0); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={
                filter === t.key
                  ? { background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {t.label}
              <span
                className="px-1 py-0.5 rounded text-[9px] font-bold"
                style={{
                  background: filter === t.key ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)',
                  color: filter === t.key ? '#22d3ee' : 'rgba(255,255,255,0.3)',
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-600 w-10">#</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-600 whitespace-nowrap">Statut</th>
              {allColumns.map(col => (
                <th
                  key={col}
                  className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{ color: isMapped(col) ? '#22d3ee' : 'rgba(100,116,139,0.8)' }}
                >
                  {col}
                  {isMapped(col) && (
                    <span className="ml-1 text-[8px]" style={{ color: 'rgba(34,211,238,0.5)' }}>✓</span>
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
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background:
                    row.status === 'error' ? 'rgba(248,113,113,0.03)' :
                    row.status === 'dup_crm' ? 'rgba(251,146,60,0.03)' :
                    row.status === 'dup_file' ? 'rgba(251,191,36,0.03)' :
                    'transparent',
                }}
              >
                <td className="px-4 py-2.5 text-slate-700 tabular-nums">{row.index + 1}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    status={row.status}
                    reason={row.errorReason}
                    dupIndex={row.dupOriginalIndex}
                    dupName={row.dupLeadName}
                    dupMatchType={row.dupMatchType}
                  />
                </td>
                {allColumns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-slate-400 max-w-[180px] truncate">
                    {row.raw[col] || <span className="text-slate-700">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-600 text-xs">Aucune ligne dans cette catégorie</p>
        </div>
      )}
    </div>
  );
}
