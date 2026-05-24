import { ShieldCheck, Zap, Code2, Boxes, Database, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  MOCK_OVERVIEW_SCORE,
  MOCK_LAST_ANALYSIS_DATE,
  MOCK_TOP_ACTIONS,
  MOCK_SECTION_SCORES,
} from '../../../admin/views/vueEnsembleMockData';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Securite: <ShieldCheck className="w-4 h-4" />,
  Performance: <Zap className="w-4 h-4" />,
  'Qualite du code': <Code2 className="w-4 h-4" />,
  Architecture: <Boxes className="w-4 h-4" />,
  'Base de donnees': <Database className="w-4 h-4" />,
};

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function scoreBadge(score: number): { label: string; bg: string; text: string } {
  if (score >= 90) return { label: 'Excellent', bg: 'rgba(34,197,94,0.12)', text: '#16a34a' };
  if (score >= 70) return { label: 'Bon', bg: 'rgba(245,158,11,0.12)', text: '#d97706' };
  return { label: 'A ameliorer', bg: 'rgba(239,68,68,0.12)', text: '#dc2626' };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString('fr-FR', { month: 'long' });
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} a ${h}:${m}`;
}

interface Props {
  onNavigateToAudit?: () => void;
}

export default function SAProjectHealthCard({ onNavigateToAudit }: Props) {
  const t = useThemeTokens();
  const score = MOCK_OVERVIEW_SCORE;
  const color = scoreColor(score);
  const badge = scoreBadge(score);
  const hasActions = MOCK_TOP_ACTIONS.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, boxShadow: `0 0 20px ${color}40` }}
            >
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Sante du projet</h3>
              <p className="text-[11px] mt-0.5" style={{ color: t.text.tertiary }}>Audit technique global de Talvex</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <Clock className="w-3 h-3" style={{ color: t.text.quaternary }} />
            <span className="text-[10px]" style={{ color: t.text.quaternary }}>{formatDate(MOCK_LAST_ANALYSIS_DATE)}</span>
          </div>
        </div>

        {/* Score block + sections grid */}
        <div className="flex flex-col md:flex-row gap-5">
          {/* Score block */}
          <div
            className="flex flex-col items-center justify-center rounded-xl px-6 py-5 flex-shrink-0"
            style={{ background: `${color}0a`, border: `1px solid ${color}20` }}
          >
            <span className="text-5xl font-extrabold tabular-nums leading-none" style={{ color }}>
              {score}<span className="text-xl font-bold">%</span>
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider mt-2 px-2.5 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
            <span className="text-[10px] mt-2" style={{ color: t.text.quaternary }}>Score global</span>
          </div>

          {/* Sections */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {MOCK_SECTION_SCORES.map((s) => {
              const sColor = scoreColor(s.score);
              const sBadge = scoreBadge(s.score);
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                  style={{ background: t.surface.hover }}
                >
                  <span className="flex-shrink-0" style={{ color: sColor }}>
                    {SECTION_ICONS[s.label] || <CheckCircle2 className="w-4 h-4" />}
                  </span>
                  <span className="text-xs font-medium flex-1 min-w-0 truncate" style={{ color: t.text.secondary }}>
                    {s.label}
                  </span>
                  <div className="w-24 md:w-32 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: t.surface.tertiary }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${s.score}%`, background: sColor }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums flex-shrink-0 w-8 text-right" style={{ color: sColor }}>
                    {s.score}
                  </span>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block"
                    style={{ background: sBadge.bg, color: sBadge.text }}
                  >
                    {sBadge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: t.surface.borderLight }} />

      {/* Footer */}
      <div className="px-5 py-3 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasActions ? (
            <span className="text-[11px]" style={{ color: t.text.tertiary }}>
              {MOCK_TOP_ACTIONS.length} action{MOCK_TOP_ACTIONS.length > 1 ? 's' : ''} recommandee{MOCK_TOP_ACTIONS.length > 1 ? 's' : ''}
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
              <span className="text-[11px] font-medium" style={{ color: t.text.tertiary }}>
                Tous les controles sont valides
              </span>
            </div>
          )}
        </div>
        {onNavigateToAudit && (
          <button
            onClick={onNavigateToAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.accent.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.accent.bg; }}
          >
            Voir l'audit
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
