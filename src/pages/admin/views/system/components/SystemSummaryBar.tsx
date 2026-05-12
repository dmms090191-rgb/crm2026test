import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import type { SystemItem, SystemStatus } from '../types';

interface Props {
  items: SystemItem[];
  statuses: SystemStatus[];
  tokens: ReturnType<typeof useThemeTokens>;
}

export default function SystemSummaryBar({ items, statuses, tokens }: Props) {
  const total = items.length;
  const fonctionnel = items.filter((i) => i.status_id && statuses.find((s) => s.id === i.status_id && s.name === 'Fonctionnel')).length;
  const aFaire = items.filter((i) => !i.status_id || statuses.find((s) => s.id === i.status_id && s.name === 'A faire')).length;
  const bugs = items.filter((i) => i.status_id && statuses.find((s) => s.id === i.status_id && s.name === 'Bug')).length;
  const ameliorer = items.filter((i) => i.status_id && statuses.find((s) => s.id === i.status_id && s.name === 'A ameliorer')).length;
  const enCours = items.filter((i) => i.status_id && statuses.find((s) => s.id === i.status_id && s.name === 'En cours')).length;
  const pct = total > 0 ? Math.round((fonctionnel / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-3 sm:p-4"
      style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}
    >
      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <StatBox label="Total" value={total} color={tokens.text.secondary} tokens={tokens} />
        <StatBox label="Fonctionnel" value={fonctionnel} color="#22c55e" tokens={tokens} />
        <StatBox label="A faire" value={aFaire} color="#f97316" tokens={tokens} />
        <StatBox label="Bugs" value={bugs} color="#ef4444" tokens={tokens} />
        <StatBox label="A ameliorer" value={ameliorer} color="#3b82f6" tokens={tokens} />
        <StatBox label="En cours" value={enCours} color="#eab308" tokens={tokens} />
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: tokens.surface.tertiary }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }}
          />
        </div>
        <span className="text-xs font-bold shrink-0 min-w-[40px] text-right" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, tokens }: { label: string; value: number; color: string; tokens: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 py-1">
      <div className="text-base sm:text-lg font-bold leading-tight" style={{ color }}>{value}</div>
      <div className="text-[9px] sm:text-[10px] font-medium text-center leading-tight" style={{ color: tokens.text.quaternary }}>{label}</div>
    </div>
  );
}
