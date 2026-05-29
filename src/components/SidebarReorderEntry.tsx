import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Minus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { SidebarEntry } from '../lib/sidebarOrderTypes';
import { displayLabel } from '../lib/sidebarOrderTypes';
import type { useThemeTokens } from '../hooks/useThemeTokens';

interface Props {
  entry: SidebarEntry;
  idx: number;
  total: number;
  collapsed: boolean;
  move: (from: number, to: number) => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragEnd: () => void;
  onRename: (idx: number, label: string) => void;
  onRemove?: (idx: number) => void;
  t: ReturnType<typeof useThemeTokens>;
  isDragging?: boolean;
  showIndicatorBefore?: boolean;
  showIndicatorAfter?: boolean;
}

const INDICATOR_STYLE: React.CSSProperties = {
  height: 2,
  background: 'linear-gradient(90deg, #f59e0b, #d97706)',
  borderRadius: 1,
  boxShadow: '0 0 6px rgba(245,158,11,0.5)',
};

export default function SidebarReorderEntry({ entry, idx, total, collapsed, move, onDragStart, onDragOver, onDragEnd, onRename, onRemove, t, isDragging, showIndicatorBefore, showIndicatorAfter }: Props) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const isDivider = entry.kind === 'divider';
  const isSection = entry.kind === 'section';
  const canRename = entry.kind === 'item' || entry.kind === 'section';
  const canRemove = isDivider || (isSection && !isDefaultSection(entry.title));
  const label = displayLabel(entry);

  function startEdit() {
    setEditVal(label);
    setEditing(true);
  }

  function confirmEdit() {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== label) onRename(idx, trimmed);
    setEditing(false);
  }

  function cancelEdit() { setEditing(false); }

  if (editing && !collapsed) {
    return (
      <div className="flex items-center gap-1 py-1 px-1.5 rounded-lg mb-0.5" style={{ background: t.surface.secondary, border: `1px solid ${t.input.borderFocus}` }}>
        <input ref={inputRef} value={editVal} onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
          className="flex-1 min-w-0 text-xs px-1.5 py-1 rounded bg-transparent outline-none"
          style={{ color: t.input.text, border: 'none' }} />
        <button onClick={confirmEdit} className="p-0.5 rounded" style={{ color: '#34d399' }}><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancelEdit} className="p-0.5 rounded" style={{ color: '#f87171' }}><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      {showIndicatorBefore && (
        <div className="mx-1 -mb-px" style={INDICATOR_STYLE} />
      )}
      <div draggable onDragStart={() => onDragStart(idx)} onDragOver={e => onDragOver(e, idx)} onDragEnd={onDragEnd}
        className="flex items-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing select-none mb-0.5 transition-opacity duration-150"
        style={{
          background: t.surface.secondary,
          border: isDivider ? `1px dashed ${t.surface.borderLight}` : isSection ? '1px solid rgba(245,158,11,0.25)' : `1px solid ${t.surface.borderLight}`,
          opacity: isDragging ? 0.35 : 1,
        }}>
        <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-50" style={{ color: t.text.quaternary }} />
        {isDivider && <Minus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.quaternary }} />}
        {isSection && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />}
        {entry.kind === 'item' && <span className="flex-shrink-0 opacity-60">{entry.icon}</span>}
        {!collapsed && (
          <span className={`flex-1 truncate ${isDivider ? 'text-[10px] opacity-60' : isSection ? 'text-[10px] font-bold uppercase tracking-wider' : ''}`}
            style={{ color: isSection ? '#f59e0b' : isDivider ? t.text.quaternary : t.text.secondary }}>
            {label}
          </span>
        )}
        {!collapsed && canRename && (
          <button onClick={startEdit} className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity" style={{ color: t.text.tertiary }}>
            <Pencil className="w-3 h-3" />
          </button>
        )}
        {!collapsed && canRemove && onRemove && (
          <button onClick={() => onRemove(idx)} className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity" style={{ color: '#f87171' }}>
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="p-0.5 rounded disabled:opacity-20 transition-opacity" style={{ color: t.text.tertiary }}>
          <ArrowUp className="w-3 h-3" />
        </button>
        <button onClick={() => move(idx, idx + 1)} disabled={idx === total - 1} className="p-0.5 rounded disabled:opacity-20 transition-opacity" style={{ color: t.text.tertiary }}>
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
      {showIndicatorAfter && (
        <div className="mx-1 -mt-px" style={INDICATOR_STYLE} />
      )}
    </div>
  );
}

function isDefaultSection(_title: string): boolean {
  return false;
}
