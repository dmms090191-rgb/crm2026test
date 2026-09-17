import type { CSSProperties, ReactNode } from 'react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { StatusTone } from '../../../../lib/siteWorkspaceModel';

/* Briques visuelles partagees de l'interface Site (tokens de theme + accent bleu du module). */

export const SITE_ACCENT = '#0ea5e9';
export const SITE_GRADIENT = 'linear-gradient(135deg, #0ea5e9, #0284c7)';

export function cardStyle(t: ThemeTokens): CSSProperties {
  return { background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow };
}

export function toneStyle(t: ThemeTokens, tone: StatusTone): CSSProperties {
  if (tone === 'success') return { background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text };
  if (tone === 'warning') return { background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text };
  if (tone === 'danger') return { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text };
  return { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary };
}

export const PRIMARY_BUTTON_STYLE: CSSProperties = {
  background: SITE_GRADIENT, color: '#fff', boxShadow: '0 2px 10px rgba(14,165,233,0.28)',
};

export function secondaryButtonStyle(t: ThemeTokens): CSSProperties {
  return { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary };
}

/* Cible tactile : 44 px sur mobile, plus compact a partir de sm. */
export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[38px] rounded-xl text-sm sm:text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export function StatusPill({ t, tone, label, icon }: { t: ThemeTokens; tone: StatusTone; label: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap" style={toneStyle(t, tone)}>
      {icon}
      {label}
    </span>
  );
}

export function InfoTile({ t, icon, label, children, action }: {
  t: ThemeTokens; icon: ReactNode; label: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 min-w-0" style={cardStyle(t)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.10)', color: SITE_ACCENT }}>
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: t.text.tertiary }}>{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function EmptyPanel({ t, icon, title, text, action }: {
  t: ThemeTokens; icon: ReactNode; title: string; text: string; action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl px-5 py-10 sm:py-14 flex flex-col items-center text-center" style={cardStyle(t)}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.20)', color: SITE_ACCENT }}>
        {icon}
      </div>
      <p className="text-base sm:text-sm font-bold" style={{ color: t.heading.primary }}>{title}</p>
      <p className="text-sm sm:text-xs mt-1.5 max-w-sm leading-relaxed" style={{ color: t.text.secondary }}>{text}</p>
      {action && <div className="mt-5 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
