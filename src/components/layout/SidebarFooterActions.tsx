import { useState } from 'react';
import { LogOut, ChevronLeft, ArrowUpDown, ArrowLeft, EyeOff, Eye, Check, Settings2 } from 'lucide-react';
import type { getThemeTokens } from '../../lib/themeTokens';

interface SidebarFooterActionsProps {
  collapsed: boolean;
  onLogout: () => void;
  onCollapse: () => void;
  onReorganize?: () => void;
  reordering?: boolean;
  tokens: ReturnType<typeof getThemeTokens>;
  rdrFontFamily?: string;
  onBackToRoisAdmin?: () => void;
  backLabel?: string;
  visuBadgeLabel?: string;
  onHideTabs?: () => void;
  hideEditMode?: boolean;
}

export default function SidebarFooterActions({
  collapsed, onLogout, onCollapse, onReorganize, reordering, tokens: t, rdrFontFamily, onBackToRoisAdmin, backLabel, visuBadgeLabel, onHideTabs, hideEditMode,
}: SidebarFooterActionsProps) {
  const hasVisuBlock = onBackToRoisAdmin && visuBadgeLabel;

  return (
    <div className="flex-shrink-0 px-2 pb-2.5 pt-1.5">
      {/* System actions card */}
      <div
        className={`rounded-xl ${collapsed ? 'px-1 py-1.5' : 'px-1.5 py-1.5'}`}
        style={{
          background: `linear-gradient(180deg, ${t.sidebar.bg}00 0%, ${t.sidebar.divider}18 100%)`,
          border: `1px solid ${t.sidebar.divider}`,
        }}
      >
        <div className={`flex flex-col ${collapsed ? 'gap-0.5' : 'gap-0.5'}`}>
          {onReorganize && !reordering && !hideEditMode && (
            <SystemButton
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              label="Reorganiser"
              collapsed={collapsed}
              variant="neutral"
              tokens={t}
              onClick={onReorganize}
              fontFamily={rdrFontFamily}
            />
          )}

          {onHideTabs && !reordering && (
            hideEditMode ? (
              <SystemButton
                icon={<Check className="w-3.5 h-3.5" />}
                label="Terminer masquage"
                collapsed={collapsed}
                variant="success"
                tokens={t}
                onClick={onHideTabs}
                fontFamily={rdrFontFamily}
              />
            ) : (
              <SystemButton
                icon={<Settings2 className="w-3.5 h-3.5" />}
                label="Masquer onglets"
                collapsed={collapsed}
                variant="tool"
                tokens={t}
                onClick={onHideTabs}
                fontFamily={rdrFontFamily}
              />
            )
          )}

          <SystemButton
            icon={
              <ChevronLeft
                className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              />
            }
            label={collapsed ? 'Agrandir' : 'Reduire'}
            collapsed={collapsed}
            variant="muted"
            tokens={t}
            onClick={onCollapse}
            fontFamily={rdrFontFamily}
          />

          {!onBackToRoisAdmin && (
            <SystemButton
              icon={<LogOut className="w-3.5 h-3.5" />}
              label="Deconnexion"
              collapsed={collapsed}
              variant="danger"
              tokens={t}
              onClick={onLogout}
              fontFamily={rdrFontFamily}
            />
          )}
        </div>
      </div>

      {/* Visu supervision block */}
      {hasVisuBlock && (
        <VisuBlock
          collapsed={collapsed}
          visuBadgeLabel={visuBadgeLabel}
          backLabel={backLabel}
          onBack={onBackToRoisAdmin}
          fontFamily={rdrFontFamily}
        />
      )}
    </div>
  );
}

/* ── Visu supervision block ── */

function VisuBlock({ collapsed, visuBadgeLabel, backLabel, onBack, fontFamily }: {
  collapsed: boolean;
  visuBadgeLabel: string;
  backLabel?: string;
  onBack: () => void;
  fontFamily?: string;
}) {
  const [backHovered, setBackHovered] = useState(false);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 mt-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(34,211,238,0.08))',
            border: '1px solid rgba(14,165,233,0.25)',
            boxShadow: '0 0 12px rgba(14,165,233,0.1)',
          }}
          title={visuBadgeLabel}
        >
          <Eye className="w-4 h-4" style={{ color: '#38bdf8' }} />
        </div>
        <button
          onClick={onBack}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: backHovered
              ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(251,191,36,0.06))',
            border: `1px solid rgba(245,158,11,${backHovered ? '0.4' : '0.22'})`,
            boxShadow: backHovered ? '0 0 14px rgba(245,158,11,0.2)' : '0 0 8px rgba(245,158,11,0.08)',
            transform: backHovered ? 'scale(1.05)' : 'scale(1)',
          }}
          title={backLabel || 'Retour'}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: '#fbbf24' }} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      {/* Badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.10), rgba(34,211,238,0.06))',
          border: '1px solid rgba(14,165,233,0.20)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 12px rgba(14,165,233,0.06)',
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
            boxShadow: '0 2px 8px rgba(14,165,233,0.35)',
          }}
        >
          <Eye className="w-3 h-3 text-white" />
        </div>
        <span
          className="text-[11px] font-bold tracking-wide truncate"
          style={{ color: '#38bdf8' }}
        >
          {visuBadgeLabel}
        </span>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        onMouseEnter={() => setBackHovered(true)}
        onMouseLeave={() => setBackHovered(false)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200"
        style={{
          background: backHovered
            ? 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.10))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))',
          border: `1px solid rgba(245,158,11,${backHovered ? '0.4' : '0.20'})`,
          boxShadow: backHovered
            ? '0 4px 16px rgba(245,158,11,0.18), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 0 8px rgba(245,158,11,0.06)',
          transform: backHovered ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: backHovered
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, rgba(245,158,11,0.5), rgba(217,119,6,0.4))',
            boxShadow: backHovered
              ? '0 2px 10px rgba(245,158,11,0.4)'
              : '0 2px 6px rgba(245,158,11,0.15)',
          }}
        >
          <ArrowLeft className="w-3 h-3 text-white" />
        </div>
        <span
          className="text-[11.5px] font-bold tracking-wide truncate"
          style={{
            color: backHovered ? '#fbbf24' : '#f59e0b',
            fontFamily: fontFamily ? `"${fontFamily}", sans-serif` : undefined,
          }}
        >
          {backLabel || 'Retour Rois Admin'}
        </span>
      </button>
    </div>
  );
}

/* ── System button variants ── */

type ButtonVariant = 'neutral' | 'muted' | 'danger' | 'success' | 'tool';

const VARIANT_STYLES: Record<ButtonVariant, {
  restColor: string;
  hoverColor: string;
  hoverBg: string;
  hoverBorder: string;
  iconBg?: string;
  iconBgHover?: string;
}> = {
  neutral: {
    restColor: 'rgba(148,163,184,0.7)',
    hoverColor: '#94a3b8',
    hoverBg: 'rgba(148,163,184,0.06)',
    hoverBorder: 'rgba(148,163,184,0.12)',
    iconBg: 'rgba(148,163,184,0.08)',
    iconBgHover: 'rgba(148,163,184,0.14)',
  },
  tool: {
    restColor: 'rgba(148,163,184,0.7)',
    hoverColor: '#60a5fa',
    hoverBg: 'rgba(96,165,250,0.06)',
    hoverBorder: 'rgba(96,165,250,0.15)',
    iconBg: 'rgba(96,165,250,0.08)',
    iconBgHover: 'rgba(96,165,250,0.16)',
  },
  muted: {
    restColor: 'rgba(148,163,184,0.5)',
    hoverColor: 'rgba(148,163,184,0.8)',
    hoverBg: 'rgba(148,163,184,0.04)',
    hoverBorder: 'rgba(148,163,184,0.08)',
  },
  danger: {
    restColor: 'rgba(239,68,68,0.55)',
    hoverColor: '#f87171',
    hoverBg: 'rgba(239,68,68,0.06)',
    hoverBorder: 'rgba(239,68,68,0.15)',
    iconBg: 'rgba(239,68,68,0.08)',
    iconBgHover: 'rgba(239,68,68,0.14)',
  },
  success: {
    restColor: '#22c55e',
    hoverColor: '#4ade80',
    hoverBg: 'rgba(34,197,94,0.08)',
    hoverBorder: 'rgba(34,197,94,0.20)',
    iconBg: 'rgba(34,197,94,0.10)',
    iconBgHover: 'rgba(34,197,94,0.18)',
  },
};

function SystemButton({ icon, label, collapsed, variant, tokens: t, onClick, fontFamily }: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  variant: ButtonVariant;
  tokens: ReturnType<typeof getThemeTokens>;
  onClick: () => void;
  fontFamily?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const v = VARIANT_STYLES[variant];

  const color = hovered ? v.hoverColor : v.restColor;
  const bg = hovered ? v.hoverBg : 'transparent';
  const border = hovered ? `1px solid ${v.hoverBorder}` : '1px solid transparent';
  const iconBg = v.iconBg ? (hovered && v.iconBgHover ? v.iconBgHover : v.iconBg) : undefined;

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-9 h-9 mx-auto flex items-center justify-center rounded-lg transition-all duration-200"
        style={{ color, background: bg, border }}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-2 py-[7px] rounded-lg transition-all duration-200"
      style={{ color, background: bg, border }}
    >
      {iconBg ? (
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ background: iconBg }}
        >
          {icon}
        </span>
      ) : (
        <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
      )}
      <span
        className="text-[12px] font-medium transition-colors duration-200 truncate"
        style={{ fontFamily: fontFamily ? `"${fontFamily}", sans-serif` : undefined }}
      >
        {label}
      </span>
    </button>
  );
}
