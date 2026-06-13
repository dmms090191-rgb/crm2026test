import { useState } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { OverlayElement } from './studio/overlayElementTypes';

interface PanelHeaderProps {
  onBack: () => void;
  title: string;
  subtitle: string;
  t: ThemeTokens;
}

export function PanelHeader({ onBack, title, subtitle, t }: PanelHeaderProps) {
  return (
    <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      <button
        onClick={onBack}
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
      >
        <ArrowLeft className="w-3 h-3" />
      </button>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-bold" style={{ color: t.text.primary }}>{title}</h3>
        <p className="text-[9px]" style={{ color: t.text.quaternary }}>{subtitle}</p>
      </div>
    </div>
  );
}

interface CollapsibleCategoryProps {
  children: React.ReactNode;
  t: ThemeTokens;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  defaultOpen?: boolean;
}

export function CollapsibleCategory({ children, t, label, icon, accentBg, accentBorder, defaultOpen = true }: CollapsibleCategoryProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full group rounded-xl px-3 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: open
            ? `linear-gradient(135deg, ${accentBg}, transparent)`
            : t.surface.secondary,
          border: `1.5px solid ${open ? accentBorder : t.surface.border}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accentBg}, transparent)`,
              border: `1px solid ${accentBorder}`,
            }}
          >
            {icon}
          </div>
          <p className="flex-1 min-w-0 text-[11px] font-bold" style={{ color: t.text.primary }}>
            {label}
          </p>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
            : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: t.text.quaternary }} />
          }
        </div>
      </button>

      {open && (
        <div
          className="space-y-2 pl-2 pr-0.5 pb-1"
          style={{ borderLeft: `2px solid ${accentBorder}`, marginLeft: '18px' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface ElementItemButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  accentColor: string;
  t: ThemeTokens;
}

export function ElementItemButton({ label, icon, onClick, disabled, badge, accentColor, t }: ElementItemButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full group rounded-xl px-3 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: t.surface.secondary,
        border: `1.5px solid ${t.surface.border}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `rgba(${accentColor}, 0.08)`,
            border: `1px solid rgba(${accentColor}, 0.15)`,
          }}
        >
          {icon}
        </div>
        <p className="flex-1 min-w-0 text-[11px] font-bold" style={{ color: t.text.primary }}>
          {label}
        </p>
        {badge && (
          <span
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(148,163,184,0.1)', color: t.text.quaternary }}
          >
            {badge}
          </span>
        )}
        {!badge && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.quaternary }} />}
      </div>
    </button>
  );
}

interface ElementListItemProps {
  element: OverlayElement;
  onClick: () => void;
  t: ThemeTokens;
}

export function ElementListItem({ element, onClick, t }: ElementListItemProps) {
  const label = element.type === 'button'
    ? (element as { text: string }).text
    : element.type === 'text'
    ? (element as { text: string }).text
    : 'Image';
  const typeLabel = element.type === 'button' ? 'Bouton' : element.type === 'text' ? 'Texte' : 'Image';

  return (
    <button
      onClick={onClick}
      className="w-full group rounded-lg px-2.5 py-1.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: t.surface.secondary,
        border: `1px solid ${t.surface.border}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            background: element.type === 'button' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)',
            color: element.type === 'button' ? '#f59e0b' : '#0ea5e9',
          }}
        >
          {typeLabel}
        </span>
        <p className="flex-1 min-w-0 text-[10px] font-semibold truncate" style={{ color: t.text.primary }}>
          {label}
        </p>
        <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: t.text.quaternary }} />
      </div>
    </button>
  );
}
