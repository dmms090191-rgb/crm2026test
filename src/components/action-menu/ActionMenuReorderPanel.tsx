import { useState, useRef, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, GripVertical, Check, X } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
}

interface Props {
  items: ActionMenuItem[];
  order: string[];
  onSave: (newOrder: string[]) => void;
  onCancel: () => void;
  tokens: {
    surface: { secondary: string; border: string; hover: string; tertiary: string };
    text: { secondary: string; quaternary: string; primary: string };
    success: { bg: string; border: string; text: string };
  };
}

export default function ActionMenuReorderPanel({ items, order, onSave, onCancel, tokens }: Props) {
  const [draft, setDraft] = useState<string[]>([...order]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const sorted = draft.map(id => items.find(i => i.id === id)).filter(Boolean) as ActionMenuItem[];

  const move = (idx: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= draft.length) return;
    setDraft(prev => {
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx !== null && fromIdx !== toIdx) {
      setDraft(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
    }
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider px-1" style={{ color: tokens.text.quaternary }}>
        Reorganiser les actions
      </span>
      {sorted.map((item, idx) => {
        const isDragging = dragIdx === idx;
        const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all"
            style={{
              background: tokens.surface.hover,
              border: isOver ? `1px solid ${tokens.text.secondary}` : '1px solid transparent',
              opacity: isDragging ? 0.4 : 1,
              cursor: 'grab',
            }}
          >
            <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
            <span className="flex-shrink-0" style={{ color: item.color }}>{item.icon}</span>
            <span className="text-xs font-medium flex-1" style={{ color: tokens.text.primary }}>{item.label}</span>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                onClick={() => move(idx, 'up')}
                disabled={idx === 0}
                className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20"
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => move(idx, 'down')}
                disabled={idx === sorted.length - 1}
                className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20"
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => onSave(draft)}
          className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}
        >
          <Check className="w-3.5 h-3.5" />Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
        >
          <X className="w-3.5 h-3.5" />Annuler
        </button>
      </div>
    </div>
  );
}
