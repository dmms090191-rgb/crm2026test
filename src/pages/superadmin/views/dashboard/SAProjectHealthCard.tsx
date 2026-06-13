import { ShieldCheck, Zap, Code2, Boxes, Database, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useEditorModeSafe } from '../../../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../../../contexts/editorModeHelpers';
import { useVCElement } from '../../../../components/visualCustomize/useVCElement';
import {
  MOCK_OVERVIEW_SCORE,
  MOCK_LAST_ANALYSIS_DATE,
  MOCK_TOP_ACTIONS,
  MOCK_SECTION_SCORES,
} from '../../../admin/views/vueEnsembleMockData';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Securite: <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  Performance: <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  'Qualite du code': <Code2 className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  Architecture: <Boxes className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  'Base de donnees': <Database className="w-3.5 h-3.5 md:w-4 md:h-4" />,
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

function hexAlpha(hex: string | undefined, alpha: string): string | undefined {
  if (!hex) return undefined;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}${alpha}`;
  return undefined;
}

function SectionRow({ s, groupColor }: { s: { label: string; score: number }; groupColor?: string }) {
  const t = useThemeTokens();
  const sColor = scoreColor(s.score);
  const sBadge = scoreBadge(s.score);
  const iconColor = groupColor || sColor;
  const labelColor = groupColor || t.text.secondary;
  const scoreCol = groupColor || sColor;
  const badgeText = groupColor || sBadge.text;
  const badgeBg = groupColor ? (hexAlpha(groupColor, '1f') ?? sBadge.bg) : sBadge.bg;
  const barColor = groupColor || sColor;

  return (
    <div
      className="flex items-center gap-2 md:gap-3 px-2 py-1.5 md:px-3 md:py-2 rounded-md md:rounded-lg transition-all"
      style={{ background: t.surface.hover }}
    >
      <span className="flex-shrink-0" style={{ color: iconColor }}>
        {SECTION_ICONS[s.label] || <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
      </span>
      <span className="text-[10px] md:text-xs font-medium flex-1 min-w-0 truncate" style={{ color: labelColor }}>
        {s.label}
      </span>
      <div className="w-16 md:w-32 h-1 md:h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: t.surface.tertiary }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${s.score}%`, background: barColor }} />
      </div>
      <span className="text-[10px] md:text-[11px] font-bold tabular-nums flex-shrink-0 w-7 md:w-8 text-right" style={{ color: scoreCol }}>
        {s.score}
      </span>
      <span
        className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block"
        style={{ background: badgeBg, color: badgeText }}
      >
        {sBadge.label}
      </span>
    </div>
  );
}

export default function SAProjectHealthCard({ onNavigateToAudit }: Props) {
  const t = useThemeTokens();
  const editorCtx = useEditorModeSafe();
  const btnOverrides = editorCtx?.getButtonOverridesWithPreview() ?? {};
  const auditBtnOvr = btnOverrides['btn_voir_audit'];
  const auditBtnBg = auditBtnOvr?.bg ? resolveZoneBg(auditBtnOvr.bg) : undefined;
  const auditBtnText = auditBtnOvr?.textColor ?? undefined;
  const auditBtnTransparent = auditBtnOvr?.opacityMode === 'transparent';
  const healthCardBg = `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`;
  const score = MOCK_OVERVIEW_SCORE;
  const color = scoreColor(score);
  const badge = scoreBadge(score);
  const hasActions = MOCK_TOP_ACTIONS.length > 0;

  const healthCardVC = useVCElement<HTMLDivElement>('sa-dashboard-card-health', 'card', 'Carte Sante du projet', {
    background: healthCardBg,
    border: `1px solid ${t.surface.border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  });
  const auditBtnVC = useVCElement<HTMLButtonElement>('sa-dashboard-btn-audit', 'button', 'Bouton Voir audit', {
    background: auditBtnBg || t.accent.bg,
    border: `1px solid ${auditBtnBg ? 'transparent' : t.accent.border}`,
    color: auditBtnText || (auditBtnBg ? '#fff' : t.accent.text),
    ...(auditBtnTransparent && auditBtnBg ? { opacity: 0.55 } : {}),
  });

  const headerIconVC = useVCElement<HTMLDivElement>('sa-health-header-icon', 'text', 'Icone Sante', { color: '#ffffff' });
  const titleVC = useVCElement<HTMLHeadingElement>('sa-health-title', 'text', 'Titre Sante du projet', { color: t.text.primary });
  const subtitleVC = useVCElement<HTMLParagraphElement>('sa-health-subtitle', 'text', 'Sous-titre Audit', { color: t.text.tertiary });
  const dateVC = useVCElement<HTMLSpanElement>('sa-health-date', 'text', 'Date analyse', { color: t.text.quaternary });
  const actionsVC = useVCElement<HTMLSpanElement>('sa-health-actions', 'text', 'Actions recommandees', { color: t.text.tertiary });
  const auditRowsGroupVC = useVCElement<HTMLDivElement>('sa-health-audit-rows-group', 'text', 'Style lignes audit');
  const groupColor = (auditRowsGroupVC.style?.color as string | undefined);
  const mainScoreColor = groupColor || color;
  const mainBadgeText = groupColor || badge.text;
  const mainBadgeBg = groupColor ? (hexAlpha(groupColor, '1f') ?? badge.bg) : badge.bg;
  const mainBlockBg = groupColor ? (hexAlpha(groupColor, '0a') ?? `${color}0a`) : `${color}0a`;
  const mainBlockBorder = groupColor ? (hexAlpha(groupColor, '20') ?? `${color}20`) : `${color}20`;
  const scoreLabelColor = groupColor || t.text.quaternary;

  return (
    <div ref={healthCardVC.ref} className="rounded-2xl overflow-hidden" style={healthCardVC.style}>
      {/* Header */}
      <div className="px-3 pt-3 pb-3 md:px-6 md:pt-6 md:pb-5">
        <div className="flex items-start justify-between gap-2 mb-3 md:mb-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              ref={headerIconVC.ref}
              className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, boxShadow: `0 0 20px ${color}40`, ...headerIconVC.style }}
            >
              <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 ref={titleVC.ref} className="text-xs md:text-sm font-bold" style={titleVC.style}>Sante du projet</h3>
              <p ref={subtitleVC.ref} className="text-[10px] md:text-[11px] mt-0.5" style={subtitleVC.style}>Audit technique global</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 md:mt-1">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ color: t.text.quaternary }} />
            <span ref={dateVC.ref} className="text-[9px] md:text-[10px]" style={dateVC.style}>{formatDate(MOCK_LAST_ANALYSIS_DATE)}</span>
          </div>
        </div>

        {/* Score block + sections */}
        <div ref={auditRowsGroupVC.ref} className="flex flex-row gap-3 md:gap-5">
          {/* Score block */}
          <div
            className="flex flex-col items-center justify-center rounded-lg md:rounded-xl px-3 py-3 md:px-6 md:py-5 flex-shrink-0"
            style={{ background: mainBlockBg, border: `1px solid ${mainBlockBorder}` }}
          >
            <span className="text-3xl md:text-5xl font-extrabold tabular-nums leading-none" style={{ color: mainScoreColor }}>
              {score}<span className="text-sm md:text-xl font-bold">%</span>
            </span>
            <span
              className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider mt-1.5 md:mt-2 px-2 py-0.5 rounded-full"
              style={{ background: mainBadgeBg, color: mainBadgeText }}
            >
              {badge.label}
            </span>
            <span className="text-[9px] md:text-[10px] mt-1 md:mt-2" style={{ color: scoreLabelColor }}>Score global</span>
          </div>

          {/* Sections */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-2">
            {MOCK_SECTION_SCORES.map((s) => (
              <SectionRow key={s.label} s={s} groupColor={groupColor} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: t.surface.borderLight }} />

      {/* Footer */}
      <div className="px-3 py-2 md:px-6 md:py-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasActions ? (
            <span ref={actionsVC.ref} className="text-[10px] md:text-[11px]" style={actionsVC.style}>
              {MOCK_TOP_ACTIONS.length} action{MOCK_TOP_ACTIONS.length > 1 ? 's' : ''} recommandee{MOCK_TOP_ACTIONS.length > 1 ? 's' : ''}
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#22c55e' }} />
              <span className="text-[10px] md:text-[11px] font-medium" style={{ color: t.text.tertiary }}>
                Tous les controles sont valides
              </span>
            </div>
          )}
        </div>
        {onNavigateToAudit && (
          <button
            ref={auditBtnVC.ref}
            data-editor-btn-id="btn_voir_audit"
            onClick={onNavigateToAudit}
            className={`flex items-center gap-1 md:gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-200 hover:scale-[1.02] flex-shrink-0${editorCtx?.highlightedButtonId === 'btn_voir_audit' ? ' editor-target-highlight' : ''}`}
            style={auditBtnVC.style}
            onMouseEnter={(e) => { if (!auditBtnBg) e.currentTarget.style.background = t.accent.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = auditBtnBg || t.accent.bg; }}
          >
            Voir l'audit
            <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
