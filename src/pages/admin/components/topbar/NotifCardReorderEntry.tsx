import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Pencil, Check, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  cardKey: string;
  icon: ReactNode;
  label: string;
  defaultLabel: string;
  accent: string;
  accentBg: string;
  idx: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRename: (key: string, newLabel: string) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  showIndicatorBefore?: boolean;
  showIndicatorAfter?: boolean;
  t: ThemeTokens;
}

const INDICATOR_STYLE: React.CSSProperties = {
  height: 2,
  background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
  borderRadius: 1,
  boxShadow: '0 0 6px rgba(14,165,233,0.5)',
};

export default function NotifCardReorderEntry({
  cardKey, icon, label, defaultLabel, accent, accentBg, idx, total,
  onMove, onRename, onDragStart, onDragOver, onDragEnd,
  isDragging, showIndicatorBefore, showIndicatorAfter, t,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  function startEdit() {
    setEditVal(label);
    setEditing(true);
  }

  function confirmEdit() {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== label) onRename(cardKey, trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl mb-1"
        style={{ background: t.dropdown.itemBgHover, border: `1px solid ${accent}40` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, color: accent }}>
          {icon}
        </div>
        <input ref={inputRef} value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 min-w-0 text-xs px-2 py-1 rounded-lg bg-transparent outline-none"
          style={{ color: t.input?.text ?? t.dropdown.itemTextHover, border: `1px solid ${accent}30` }}
        />
        <button onClick={confirmEdit} className="p-0.5 rounded" style={{ color: '#34d399' }}>
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="p-0.5 rounded" style={{ color: '#f87171' }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {showIndicatorBefore && <div className="mx-2 -mb-px" style={INDICATOR_STYLE} />}
      <div
        draggable
        onDragStart={() => onDragStart(idx)}
        onDragOver={e => onDragOver(e, idx)}
        onDragEnd={onDragEnd}
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl cursor-grab active:cursor-grabbing select-none mb-1 transition-all duration-150"
        style={{
          background: 'rgba(148,163,184,0.04)',
          border: `1px solid rgba(148,163,184,0.10)`,
          opacity: isDragging ? 0.35 : 1,
        }}
      >
        <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-40"
          style={{ color: t.dropdown.itemText }} />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, color: accent }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-semibold leading-tight truncate"
            style={{ color: t.dropdown.itemTextHover }}>
            {label}
          </p>
          {label !== defaultLabel && (
            <p className="text-[9px] truncate opacity-50"
              style={{ color: t.dropdown.itemText }}>
              {defaultLabel}
            </p>
          )}
        </div>
        <button onClick={startEdit}
          className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: t.dropdown.itemText }}>
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={() => onMove(idx, idx - 1)} disabled={idx === 0}
          className="p-0.5 rounded disabled:opacity-20 transition-opacity"
          style={{ color: t.dropdown.itemText }}>
          <ArrowUp className="w-3 h-3" />
        </button>
        <button onClick={() => onMove(idx, idx + 1)} disabled={idx === total - 1}
          className="p-0.5 rounded disabled:opacity-20 transition-opacity"
          style={{ color: t.dropdown.itemText }}>
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
      {showIndicatorAfter && <div className="mx-2 -mt-px" style={INDICATOR_STYLE} />}
    </div>
  );
}
