import { Zap, Eye, Code2, Settings2, Key } from 'lucide-react';
import { TechBadgeType, GROUP_COLORS, OPERATION_COLORS, getTypeColor } from './databaseViewConstants';

const TECH_BADGE_STYLES: Record<TechBadgeType, { bg: string; color: string; border: string; label: string; icon: React.ReactNode }> = {
  trigger: {
    bg: 'rgba(167,139,250,0.12)',
    color: 'rgba(167,139,250,0.9)',
    border: '1px solid rgba(167,139,250,0.25)',
    label: 'trigger',
    icon: <Zap className="w-3 h-3" />,
  },
  view: {
    bg: 'rgba(56,189,248,0.12)',
    color: 'rgba(56,189,248,0.9)',
    border: '1px solid rgba(56,189,248,0.25)',
    label: 'view',
    icon: <Eye className="w-3 h-3" />,
  },
  function: {
    bg: 'rgba(251,146,60,0.12)',
    color: 'rgba(251,146,60,0.9)',
    border: '1px solid rgba(251,146,60,0.25)',
    label: 'function',
    icon: <Code2 className="w-3 h-3" />,
  },
  index: {
    bg: 'rgba(100,116,139,0.15)',
    color: 'rgba(148,163,184,0.75)',
    border: '1px solid rgba(100,116,139,0.25)',
    label: 'index',
    icon: <Settings2 className="w-3 h-3" />,
  },
  'unique-index': {
    bg: 'rgba(251,191,36,0.12)',
    color: 'rgba(251,191,36,0.9)',
    border: '1px solid rgba(251,191,36,0.28)',
    label: 'unique',
    icon: <Key className="w-3 h-3" />,
  },
};

export function TechBadge({ type, label }: { type: TechBadgeType; label?: string }) {
  const s = TECH_BADGE_STYLES[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: s.border, fontSize: '11px', padding: '2px 7px' }}
    >
      {s.icon}
      {label ?? s.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const color = getTypeColor(type);
  return (
    <span
      className="font-mono text-xs px-1.5 py-0.5 rounded"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}25`,
        fontSize: '10px',
        letterSpacing: '0.02em',
      }}
    >
      {type}
    </span>
  );
}

export function OperationBadge({ op }: { op: string }) {
  const color = OPERATION_COLORS[op] ?? '#94a3b8';
  return (
    <span
      className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}25`,
        fontSize: '10px',
      }}
    >
      {op}
    </span>
  );
}

export function GroupBadge({ group }: { group: string }) {
  const color = GROUP_COLORS[group] ?? '#94a3b8';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}20`,
        fontSize: '10px',
      }}
    >
      {group}
    </span>
  );
}
