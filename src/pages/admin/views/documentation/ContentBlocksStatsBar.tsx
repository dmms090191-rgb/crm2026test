import type { ThemeTokens } from '../../../../lib/themeTokens';

interface GlobalStats {
  total: number;
  done: number;
  remaining: number;
  percent: number;
}

interface Props {
  blockCount: number;
  stats: GlobalStats;
  tokens: ThemeTokens;
}

export default function ContentBlocksStatsBar({ blockCount, stats, tokens }: Props) {
  return (
    <div className="rounded-xl px-5 py-4 flex items-center gap-6" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums" style={{ color: tokens.text.primary }}>{blockCount}</span>
          <span className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>contenu{blockCount !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ width: 1, height: 32, background: tokens.surface.borderLight }} />
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums" style={{ color: '#facc15' }}>{stats.remaining}</span>
          <span className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>restante{stats.remaining !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ width: 1, height: 32, background: tokens.surface.borderLight }} />
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums" style={{ color: '#34d399' }}>{stats.done}</span>
          <span className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>terminee{stats.done !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-bold tabular-nums" style={{ color: stats.percent === 100 ? '#34d399' : tokens.text.primary }}>{stats.percent}%</span>
          <div className="rounded-full overflow-hidden" style={{ width: 100, height: 5, background: tokens.surface.borderLight }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.percent}%`, background: stats.percent === 100 ? '#34d399' : stats.percent >= 50 ? '#facc15' : '#f97316' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
