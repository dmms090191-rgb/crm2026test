import { useState, useRef, useEffect, type ReactNode } from 'react';
import { GripVertical, Minus, Pencil, Trash2, Check, X, Eye, EyeOff, Lock } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { LayoutEntry } from '../../lib/sidebarLayout';

const INDICATOR: React.CSSProperties = {
  height: '2px', borderRadius: '2px',
  background: 'linear-gradient(90deg, rgba(245,158,11,0), #f59e0b, rgba(245,158,11,0))',
};

function ReorderSlot({ idx, dropTarget, dropEdge, dragSource, children }: {
  idx: number; dropTarget: number | null; dropEdge: 'before' | 'after'; dragSource: number | null;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {dropTarget === idx && dropEdge === 'before' && dragSource !== idx && dragSource !== idx - 1 && (
        <div className="mx-1 -mb-px" style={INDICATOR} />
      )}
      {children}
      {dropTarget === idx && dropEdge === 'after' && dragSource !== idx && dragSource !== idx + 1 && (
        <div className="mx-1 -mt-px" style={INDICATOR} />
      )}
    </div>
  );
}

function ReorderRow({
  entry, idx, realIdx, collapsed, label, isDragging, onDragStart, onDragOver, onDragEnd,
  onRename, onRemove, onToggleHidden, protege, canHide = true, t,
}: {
  entry: LayoutEntry; idx: number; realIdx: number; collapsed: boolean; label: string; isDragging: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragEnd: () => void;
  onRename: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  onToggleHidden: (i: number) => void;
  protege?: boolean;
  /**
   * Droit de masquer un onglet. `false` retire l oeil : le titulaire du
   * panel reorganise librement, mais ne decide pas de ce qui existe.
   */
  canHide?: boolean;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const isDivider = entry.kind === 'divider';
  const isSection = entry.kind === 'section';
  const isItem = entry.kind === 'item';
  const hidden = isItem && entry.hidden === true;

  if (editing && !collapsed) {
    return (
      <div className="flex items-center gap-1 py-1 px-1.5 rounded-lg mb-0.5"
        style={{ background: t.surface.secondary, border: `1px solid ${t.input.borderFocus}` }}>
        <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onRename(realIdx, val); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="flex-1 min-w-0 text-xs px-1.5 py-1 rounded bg-transparent outline-none"
          style={{ color: t.input.text, border: 'none' }} />
        <button onClick={() => { onRename(realIdx, val); setEditing(false); }} className="p-0.5 rounded" style={{ color: '#34d399' }}><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(false)} className="p-0.5 rounded" style={{ color: '#f87171' }}><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div draggable onDragStart={() => onDragStart(idx)} onDragOver={e => onDragOver(e, idx)} onDragEnd={onDragEnd}
      className="flex items-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing select-none mb-0.5 transition-opacity duration-150"
      style={{
        background: t.surface.secondary,
        border: isDivider ? `1px dashed ${t.surface.borderLight}`
          : isSection ? '1px solid rgba(245,158,11,0.25)'
          : `1px solid ${t.surface.borderLight}`,
        opacity: isDragging ? 0.35 : hidden ? 0.45 : 1,
      }}>
      <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-50" style={{ color: t.text.quaternary }} />
      {isDivider && <Minus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.quaternary }} />}
      {isSection && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />}
      {!collapsed && (
        <span className={`flex-1 truncate ${isDivider ? 'text-[10px] opacity-60' : isSection ? 'text-[10px] font-bold uppercase tracking-wider' : ''}`}
          style={{ color: isSection ? '#f59e0b' : isDivider ? t.text.quaternary : t.text.secondary, textDecoration: hidden ? 'line-through' : undefined }}>
          {label}
        </span>
      )}
      {!collapsed && isItem && protege && (
        <Lock className="w-3.5 h-3.5 flex-shrink-0 opacity-40" style={{ color: t.text.quaternary }} />
      )}
      {!collapsed && isItem && !protege && canHide && (
        <button onClick={() => onToggleHidden(realIdx)} className="p-0.5 rounded flex-shrink-0"
          title={hidden ? 'Afficher cet onglet' : 'Masquer cet onglet'}
          style={{ color: hidden ? '#f87171' : t.text.quaternary }}>
          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
      {!collapsed && (isItem || isSection) && (
        <button onClick={() => { setVal(label); setEditing(true); }} className="p-0.5 rounded flex-shrink-0" style={{ color: t.text.quaternary }}>
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {!collapsed && (isSection || isDivider) && (
        <button onClick={() => onRemove(realIdx)} className="p-0.5 rounded flex-shrink-0" style={{ color: '#f87171' }}>
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}


export { ReorderSlot, ReorderRow };
