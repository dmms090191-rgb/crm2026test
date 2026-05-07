import { useState } from 'react';
import { ShieldCheck, ChevronDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Shield, Zap, Code2, Layers, Database } from 'lucide-react';
import { getThemeTokens } from '../../../../lib/themeTokens';
import type { AuditSection } from './auditMockData';
import { statusIcon, statusColor, sectionScore, scoreColor } from './auditUtils';
import ScoreBar from './ScoreBar';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  security: <Shield className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  quality: <Code2 className="w-4 h-4" />,
  architecture: <Layers className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
};

export default function SectionBlock({ section, tokens, highlighted }: { section: AuditSection; tokens: ReturnType<typeof getThemeTokens>; highlighted?: boolean }) {
  const [open, setOpen] = useState(true);
  const score = sectionScore(section.checks);
  const color = section.color;
  const icon = SECTION_ICONS[section.id] ?? <ShieldCheck className="w-4 h-4" />;

  const okCount = section.checks.filter((c) => c.status === 'ok').length;
  const warnCount = section.checks.filter((c) => c.status === 'warning').length;
  const errCount = section.checks.filter((c) => c.status === 'error').length;

  return (
    <div
      id={`audit-section-${section.id}`}
      className="rounded-xl overflow-hidden transition-all duration-500"
      style={{
        background: tokens.surface.tertiary,
        border: `1px solid ${highlighted ? color : tokens.surface.border}`,
        boxShadow: highlighted ? `0 0 0 1px ${color}40, 0 0 20px ${color}15` : 'none',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-3 md:py-3.5 text-left transition-colors duration-150"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div
          className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs md:text-sm font-semibold" style={{ color: tokens.text.primary }}>
              {section.title}
            </span>
            <span
              className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md tabular-nums"
              style={{ background: `${scoreColor(score)}15`, color: scoreColor(score), border: `1px solid ${scoreColor(score)}25` }}
            >
              {score}%
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 mt-1">
            {okCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] md:text-xs" style={{ color: tokens.success.text }}>
                <CheckCircle className="w-3 h-3" /> {okCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] md:text-xs" style={{ color: tokens.warning.text }}>
                <AlertTriangle className="w-3 h-3" /> {warnCount}
              </span>
            )}
            {errCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] md:text-xs" style={{ color: tokens.danger.text }}>
                <XCircle className="w-3 h-3" /> {errCount}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: tokens.text.quaternary, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      {open && (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          <div className="mb-3">
            <ScoreBar score={score} color={scoreColor(score)} tokens={tokens} />
          </div>
          <div className="flex flex-col gap-1.5">
            {section.checks.map((check) => {
              const sc = statusColor(check.status, tokens);
              return (
                <div
                  key={check.id}
                  className="flex items-start gap-2 md:gap-2.5 px-2.5 md:px-3 py-2 md:py-2.5 rounded-lg transition-colors duration-150"
                  style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                >
                  <span className="flex-shrink-0 mt-0.5" style={{ color: sc.text }}>
                    {statusIcon(check.status, 'w-3.5 h-3.5')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] md:text-xs font-medium block" style={{ color: tokens.text.secondary }}>
                      {check.label}
                    </span>
                    <span className="text-[11px] md:text-xs block mt-0.5 leading-relaxed" style={{ color: tokens.text.tertiary }}>
                      {check.detail}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
