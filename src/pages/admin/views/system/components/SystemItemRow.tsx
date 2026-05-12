import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import type { SystemItem, SystemStatus } from '../types';

interface Props {
  item: SystemItem;
  index: number;
  total: number;
  tokens: ReturnType<typeof useThemeTokens>;
  statuses: SystemStatus[];
  confirmDeleteId: string | null;
  onSetStatus: (itemId: string, statusId: string | null) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function SystemItemRow({ item, index, total, tokens, statuses, confirmDeleteId, onSetStatus, onDelete, onConfirmDelete, onCancelDelete, onMoveUp, onMoveDown }: Props) {
  const currentStatus = item.status_id ? statuses.find((s) => s.id === item.status_id) : null;
  const rowBg = currentStatus ? `${currentStatus.color}08` : tokens.surface.primary;
  const borderColor = currentStatus ? `${currentStatus.color}30` : tokens.surface.border;

  return (
    <div
      className="rounded-lg transition-all duration-150 group/row"
      style={{ background: rowBg, border: `1px solid ${borderColor}` }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 min-w-0">
        {/* Status dot */}
        {currentStatus ? (
          <div className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: currentStatus.color }} />
        ) : (
          <div className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: tokens.text.quaternary, opacity: 0.3 }} />
        )}

        {/* Title */}
        <span className="flex-1 text-xs sm:text-[13px] min-w-0 break-words leading-snug" style={{ color: tokens.text.secondary }}>
          {item.title}
        </span>

        {/* Current status badge - desktop */}
        {currentStatus && (
          <span
            className="hidden sm:inline-block shrink-0 px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ background: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}
          >
            {currentStatus.name}
          </span>
        )}

        {/* Desktop status buttons */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {statuses.slice(0, 3).map((s) => (
            <button
              key={s.id}
              onClick={() => onSetStatus(item.id, item.status_id === s.id ? null : s.id)}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150"
              style={{
                background: item.status_id === s.id ? `${s.color}20` : tokens.surface.tertiary,
                color: item.status_id === s.id ? s.color : tokens.text.quaternary,
                border: `1px solid ${item.status_id === s.id ? `${s.color}40` : tokens.surface.border}`,
              }}
            >
              {s.name}
            </button>
          ))}
          {statuses.length > 3 && (
            <StatusDropdown
              statuses={statuses.slice(3)}
              currentStatusId={item.status_id}
              tokens={tokens}
              onSelect={(sId) => onSetStatus(item.id, item.status_id === sId ? null : sId)}
            />
          )}
        </div>

        {/* Delete / Move - desktop */}
        {confirmDeleteId === item.id ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onDelete} className="px-2 py-1 rounded text-[11px] font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>Oui</button>
            <button onClick={onCancelDelete} className="px-2 py-1 rounded text-[11px] font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>Non</button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
            {index > 0 && <button onClick={onMoveUp} className="p-1 rounded hidden sm:block" style={{ color: tokens.text.tertiary }}><ArrowUp className="w-3 h-3" /></button>}
            {index < total - 1 && <button onClick={onMoveDown} className="p-1 rounded hidden sm:block" style={{ color: tokens.text.tertiary }}><ArrowDown className="w-3 h-3" /></button>}
            <button onClick={onConfirmDelete} className="p-1 rounded" style={{ color: tokens.text.tertiary }}><Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" /></button>
          </div>
        )}
      </div>

      {/* Mobile status buttons row */}
      <div className="sm:hidden flex items-center gap-1 px-2.5 pb-2 flex-wrap">
        {currentStatus && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-medium mr-1"
            style={{ background: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}
          >
            {currentStatus.name}
          </span>
        )}
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => onSetStatus(item.id, item.status_id === s.id ? null : s.id)}
            className="px-2 py-1 rounded text-[10px] font-medium transition-all"
            style={{
              background: item.status_id === s.id ? `${s.color}20` : tokens.surface.tertiary,
              color: item.status_id === s.id ? s.color : tokens.text.quaternary,
              border: `1px solid ${item.status_id === s.id ? `${s.color}40` : tokens.surface.border}`,
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusDropdown({ statuses, currentStatusId, tokens, onSelect }: { statuses: SystemStatus[]; currentStatusId: string | null; tokens: ReturnType<typeof useThemeTokens>; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 rounded text-[10px] font-medium"
        style={{ background: tokens.surface.tertiary, color: tokens.text.quaternary, border: `1px solid ${tokens.surface.border}` }}
      >
        Plus...
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[130px]" style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => { onSelect(s.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{ color: currentStatusId === s.id ? s.color : tokens.text.secondary }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
