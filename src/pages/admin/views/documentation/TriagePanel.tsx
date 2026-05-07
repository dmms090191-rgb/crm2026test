import { useState, useMemo } from 'react';
import {
  ChevronDown, XCircle, AlertTriangle, CheckCircle, MoreHorizontal,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { buildTriageBuckets, type TriageBucket, type TriageItem } from './triageHelpers';
import type { AuditSection } from './auditMockData';

const MAX_VISIBLE = 5;

function bucketStyle(key: TriageBucket['key'], tokens: ReturnType<typeof useThemeTokens>) {
  switch (key) {
    case 'error':
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: tokens.danger.text,
        bg: tokens.danger.bg,
        border: tokens.danger.border,
        badgeBg: tokens.danger.bg,
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: tokens.warning.text,
        bg: tokens.warning.bg,
        border: tokens.warning.border,
        badgeBg: tokens.warning.bg,
      };
    case 'ok':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: tokens.success.text,
        bg: tokens.success.bg,
        border: tokens.success.border,
        badgeBg: tokens.success.bg,
      };
  }
}

function ItemRow({ item, tokens, onClick }: { item: TriageItem; tokens: ReturnType<typeof useThemeTokens>; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-colors duration-150 group"
      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
      onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; e.currentTarget.style.borderColor = tokens.surface.border; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = tokens.surface.tertiary; e.currentTarget.style.borderColor = tokens.surface.borderLight; }}
    >
      <span
        className="flex-shrink-0 mt-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded"
        style={{ background: `${item.sectionColor}15`, color: item.sectionColor, border: `1px solid ${item.sectionColor}25` }}
      >
        {item.sectionTitle}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium block group-hover:underline" style={{ color: tokens.text.secondary }}>
          {item.check.label}
        </span>
        <span className="text-xs block mt-0.5 leading-relaxed" style={{ color: tokens.text.tertiary }}>
          {item.check.detail}
        </span>
      </div>
    </button>
  );
}

function BucketSection({ bucket, defaultOpen, onItemClick }: { bucket: TriageBucket; defaultOpen: boolean; onItemClick?: (sectionId: string) => void }) {
  const tokens = useThemeTokens();
  const style = bucketStyle(bucket.key, tokens);

  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);

  const hasOverflow = bucket.items.length > MAX_VISIBLE;
  const visibleItems = expanded ? bucket.items : bucket.items.slice(0, MAX_VISIBLE);
  const hiddenCount = bucket.items.length - MAX_VISIBLE;

  if (bucket.items.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ color: style.color }}>{style.icon}</span>
        <span className="text-sm font-semibold flex-1" style={{ color: tokens.text.primary }}>
          {bucket.label}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
          style={{ background: style.badgeBg, color: style.color, border: `1px solid ${style.border}` }}
        >
          {bucket.items.length}
        </span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: tokens.text.quaternary, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-1.5">
          {visibleItems.map((item) => (
            <ItemRow key={`${item.check.id}-${item.sectionTitle}`} item={item} tokens={tokens} onClick={onItemClick ? () => onItemClick(item.sectionId) : undefined} />
          ))}
          {hasOverflow && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
              style={{ color: tokens.text.tertiary, background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.surface.tertiary; }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              + {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} element{hiddenCount > 1 ? 's' : ''}
            </button>
          )}
          {hasOverflow && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
              style={{ color: tokens.text.tertiary, background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.surface.tertiary; }}
            >
              Reduire
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TriagePanel({ onItemClick, sections }: { onItemClick?: (sectionId: string) => void; sections?: AuditSection[] }) {
  const buckets = useMemo(() => buildTriageBuckets(sections), [sections]);

  return (
    <div className="flex flex-col gap-3">
      {buckets.map((bucket) => (
        <BucketSection
          key={bucket.key}
          bucket={bucket}
          defaultOpen={bucket.key === 'error'}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
