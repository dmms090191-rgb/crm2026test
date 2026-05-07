import { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { fetchAuditHistory, type AuditHistoryRow } from '../../../../lib/auditHistoryService';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current > previous) return <TrendingUp className="w-3 h-3" style={{ color: '#34d399' }} />;
  if (current < previous) return <TrendingDown className="w-3 h-3" style={{ color: '#f87171' }} />;
  return <Minus className="w-3 h-3" style={{ color: '#94a3b8' }} />;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

interface Props {
  refreshKey: number;
}

export default function AuditHistoryStrip({ refreshKey }: Props) {
  const tokens = useThemeTokens();
  const [rows, setRows] = useState<AuditHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAuditHistory(5).then(({ data }) => {
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: tokens.text.quaternary }} />
        <span className="text-xs" style={{ color: tokens.text.quaternary }}>Chargement de l'historique...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
      >
        <History className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
        <span className="text-xs" style={{ color: tokens.text.quaternary }}>
          Aucun audit enregistre. Lancez un audit complet pour commencer l'historique.
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
    >
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}>
        <History className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
        <span className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>
          Historique des audits
        </span>
        <span className="text-xs" style={{ color: tokens.text.quaternary }}>
          ({rows.length} dernier{rows.length > 1 ? 's' : ''})
        </span>
      </div>

      <div className="flex items-stretch divide-x" style={{ borderColor: tokens.surface.borderLight }}>
        {rows.map((row, i) => {
          const prev = rows[i + 1];
          const color = scoreColor(row.global_score);
          const isLatest = i === 0;

          return (
            <div
              key={row.id}
              className="flex-1 px-3 py-2.5 flex flex-col gap-1 min-w-0 transition-colors duration-150"
              style={{
                background: isLatest ? `${color}08` : 'transparent',
                borderLeft: i > 0 ? `1px solid ${tokens.surface.borderLight}` : undefined,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color }}
                >
                  {row.global_score}%
                </span>
                {prev && <TrendIcon current={row.global_score} previous={prev.global_score} />}
                {isLatest && (
                  <span
                    className="text-[10px] font-medium px-1 py-0.5 rounded"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                  >
                    dernier
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] tabular-nums" style={{ color: tokens.text.quaternary }}>
                <span style={{ color: '#34d399' }}>{row.ok_count}</span>
                <span>/</span>
                <span style={{ color: '#fbbf24' }}>{row.warning_count}</span>
                <span>/</span>
                <span style={{ color: '#f87171' }}>{row.error_count}</span>
              </div>

              <span className="text-[10px] truncate" style={{ color: tokens.text.quaternary }}>
                {formatDate(row.created_at)} {formatTime(row.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
