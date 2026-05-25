import { useState, useRef, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, GripVertical, Check, X, SlidersHorizontal, Shield } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

export interface ToolbarItem {
  id: string;
  label: string;
  icon: ReactNode;
  pinned?: boolean;
}

interface Props {
  items: ToolbarItem[];
  order: string[];
  onSave: (newOrder: string[]) => void;
  onClose: () => void;
  t: ThemeTokens;
}

export default function ToolbarOrganizerModal({ items, order, onSave, onClose, t }: Props) {
  const [draft, setDraft] = useState<string[]>(() => {
    const valid = order.filter(id => items.some(i => i.id === id));
    const missing = items.filter(i => !valid.includes(i.id)).map(i => i.id);
    return [...valid, ...missing];
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const sorted = draft.map(id => items.find(i => i.id === id)).filter(Boolean) as ToolbarItem[];

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
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); dragRef.current = null; };

  const handleSave = () => { onSave(draft); onClose(); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <SlidersHorizontal className="w-4 h-4" style={{ color: t.accent.text }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Organiser les outils</h3>
              <p className="text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>Choisis l'ordre des boutons dans la barre d'outils.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: t.text.tertiary }} onMouseEnter={e => { e.currentTarget.style.background = t.surface.secondary; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="px-6 py-4 space-y-1.5 max-h-[50vh] overflow-y-auto">
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group"
                style={{
                  background: isOver ? t.accent.bg : t.surface.secondary,
                  border: `1px solid ${isOver ? t.accent.border : t.surface.border}`,
                  opacity: isDragging ? 0.4 : 1,
                  cursor: 'grab',
                }}
              >
                <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }} />
                <span className="text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.surface.primary, color: t.text.tertiary }}>
                  {idx + 1}
                </span>
                <span className="flex-shrink-0" style={{ color: t.text.secondary }}>{item.icon}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: t.text.primary }}>{item.label}</span>
                {item.pinned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                    <Shield className="w-2.5 h-2.5" />
                  </span>
                )}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => move(idx, 'up')}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
                    style={{ color: t.text.secondary }}
                    onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = t.surface.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => move(idx, 'down')}
                    disabled={idx === sorted.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
                    style={{ color: t.text.secondary }}
                    onMouseEnter={e => { if (idx < sorted.length - 1) e.currentTarget.style.background = t.surface.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            <Check className="w-3.5 h-3.5" />Enregistrer
          </button>
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
