import { ShieldCheck, AlertTriangle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useEditorModeSafe } from '../../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../../contexts/editorModeHelpers';
import {
  MOCK_OVERVIEW_SCORE,
  MOCK_LAST_ANALYSIS_DATE,
  MOCK_TOP_ACTIONS,
  MOCK_SECTION_SCORES,
} from './vueEnsembleMockData';

function scoreColor(score: number) {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString('fr-FR', { month: 'short' });
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} a ${h}:${m}`;
}

export default function AuditSummaryCard({ onNavigateToAudit }: { onNavigateToAudit?: () => void }) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const btnOverrides = editorCtx?.getButtonOverridesWithPreview() ?? {};
  const auditBtnOvr = btnOverrides['btn_voir_audit'];
  const auditBtnBg = auditBtnOvr?.bg ? resolveZoneBg(auditBtnOvr.bg) : undefined;
  const auditBtnText = auditBtnOvr?.textColor ?? undefined;
  const auditBtnTransparent = auditBtnOvr?.opacityMode === 'transparent';
  const color = scoreColor(MOCK_OVERVIEW_SCORE);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: t.card.bg,
        border: `1px solid ${t.card.border}`,
        boxShadow: t.card.shadow,
      }}
    >
      {/* Desktop: horizontal layout */}
      <div className="hidden md:flex items-stretch">
        <div className="flex flex-col items-center justify-center px-7 py-5 flex-shrink-0">
          <span
            className="text-4xl font-extrabold tabular-nums leading-none"
            style={{ color }}
          >
            {MOCK_OVERVIEW_SCORE}
            <span className="text-lg font-bold ml-0.5">%</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: t.text.quaternary }}>
            Score global
          </span>
        </div>

        <div
          className="w-px flex-shrink-0 self-stretch my-4"
          style={{ background: t.surface.borderLight }}
        />

        <div className="flex-1 min-w-0 py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: t.text.quaternary }} />
              <span className="text-xs font-semibold" style={{ color: t.text.secondary }}>
                Sante du projet
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: t.text.quaternary }} />
              <span className="text-[11px]" style={{ color: t.text.quaternary }}>
                {formatDate(MOCK_LAST_ANALYSIS_DATE)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {MOCK_SECTION_SCORES.map((s) => {
              const barColor = scoreColor(s.score);
              return (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span
                    className="text-[11px] font-medium flex-shrink-0 text-right"
                    style={{ color: t.text.tertiary, width: '100px' }}
                  >
                    {s.label}
                  </span>
                  <div
                    className="flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: t.surface.tertiary }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${s.score}%`, background: barColor }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums flex-shrink-0"
                    style={{ color: barColor, width: '28px', textAlign: 'right' }}
                  >
                    {s.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical layout */}
      <div className="md:hidden p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: t.text.quaternary }} />
            <span className="text-xs font-semibold" style={{ color: t.text.secondary }}>
              Sante du projet
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" style={{ color: t.text.quaternary }} />
            <span className="text-[10px]" style={{ color: t.text.quaternary }}>
              {formatDate(MOCK_LAST_ANALYSIS_DATE)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-3xl font-extrabold tabular-nums leading-none"
            style={{ color }}
          >
            {MOCK_OVERVIEW_SCORE}
            <span className="text-base font-bold ml-0.5">%</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.text.quaternary }}>
            Score global
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {MOCK_SECTION_SCORES.map((s) => {
            const barColor = scoreColor(s.score);
            return (
              <div key={s.label} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium flex-shrink-0 text-right"
                  style={{ color: t.text.tertiary, width: '80px' }}
                >
                  {s.label}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: t.surface.tertiary }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${s.score}%`, background: barColor }}
                  />
                </div>
                <span
                  className="text-[10px] font-bold tabular-nums flex-shrink-0"
                  style={{ color: barColor, width: '24px', textAlign: 'right' }}
                >
                  {s.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: '1px', background: t.surface.borderLight }} />

      {/* Desktop footer */}
      <div className="hidden md:flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          {MOCK_TOP_ACTIONS.map((action) => {
            const isErr = action.severity === 'error';
            return (
              <div
                key={action.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md flex-shrink-0 max-w-[260px]"
                style={{
                  background: isErr ? t.danger.bg : t.warning.bg,
                  border: `1px solid ${isErr ? t.danger.border : t.warning.border}`,
                }}
              >
                {isErr
                  ? <XCircle className="w-3 h-3 flex-shrink-0" style={{ color: t.danger.text }} />
                  : <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: t.warning.text }} />
                }
                <span className="text-[11px] truncate" style={{ color: t.text.secondary }}>
                  {action.label}
                </span>
              </div>
            );
          })}
        </div>

        {onNavigateToAudit && (
          <button
            data-editor-btn-id="btn_voir_audit"
            onClick={onNavigateToAudit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 ml-3${editorCtx?.highlightedButtonId === 'btn_voir_audit' ? ' editor-target-highlight' : ''}`}
            style={{
              background: auditBtnBg || t.accent.bg,
              border: `1px solid ${auditBtnBg ? 'transparent' : t.accent.border}`,
              color: auditBtnText || (auditBtnBg ? '#fff' : t.accent.text),
              ...(auditBtnTransparent && auditBtnBg ? { opacity: 0.55 } : {}),
            }}
            onMouseEnter={(e) => { if (!auditBtnBg) e.currentTarget.style.background = t.accent.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = auditBtnBg || t.accent.bg; }}
          >
            Voir l'audit
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Mobile footer */}
      <div className="md:hidden px-3 py-3 space-y-2">
        <div className="flex flex-col gap-1.5">
          {MOCK_TOP_ACTIONS.map((action) => {
            const isErr = action.severity === 'error';
            return (
              <div
                key={action.id}
                className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md"
                style={{
                  background: isErr ? t.danger.bg : t.warning.bg,
                  border: `1px solid ${isErr ? t.danger.border : t.warning.border}`,
                }}
              >
                {isErr
                  ? <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: t.danger.text }} />
                  : <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: t.warning.text }} />
                }
                <span className="text-[11px] leading-relaxed" style={{ color: t.text.secondary }}>
                  {action.label}
                </span>
              </div>
            );
          })}
        </div>

        {onNavigateToAudit && (
          <button
            data-editor-btn-id="btn_voir_audit"
            onClick={onNavigateToAudit}
            className={`flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200${editorCtx?.highlightedButtonId === 'btn_voir_audit' ? ' editor-target-highlight' : ''}`}
            style={{
              background: auditBtnBg || t.accent.bg,
              border: `1px solid ${auditBtnBg ? 'transparent' : t.accent.border}`,
              color: auditBtnText || (auditBtnBg ? '#fff' : t.accent.text),
              ...(auditBtnTransparent && auditBtnBg ? { opacity: 0.55 } : {}),
            }}
          >
            Voir l'audit
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
