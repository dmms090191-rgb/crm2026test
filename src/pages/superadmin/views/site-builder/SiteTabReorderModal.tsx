import { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, GripVertical, Check, X, SlidersHorizontal, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Eye as EyeTab, LayoutGrid, Globe, Paintbrush } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteTab } from './SiteTabs';

export interface SiteTabConfig {
  order: SiteTab[];
  hidden: SiteTab[];
}

const DEFAULT_ORDER: SiteTab[] = ['domaine', 'templates', 'studio', 'apercu'];

const TAB_META: Record<SiteTab, { label: string; icon: React.ReactNode }> = {
  domaine: { label: 'Domaine', icon: <Globe className="w-4 h-4" /> },
  templates: { label: 'Templates', icon: <LayoutGrid className="w-4 h-4" /> },
  studio: { label: 'Studio Site', icon: <Paintbrush className="w-4 h-4" /> },
  apercu: { label: 'Apercu du site', icon: <EyeTab className="w-4 h-4" /> },
};

interface Props {
  config: SiteTabConfig;
  onSave: (config: SiteTabConfig) => void;
  onClose: () => void;
  t: ThemeTokens;
  hideDomainTab?: boolean;
}

export default function SiteTabReorderModal({ config, onSave, onClose, t, hideDomainTab }: Props) {
  const availableTabs = hideDomainTab ? DEFAULT_ORDER.filter(id => id !== 'domaine') : DEFAULT_ORDER;

  const [draftOrder, setDraftOrder] = useState<SiteTab[]>(() => {
    const valid = config.order.filter(id => availableTabs.includes(id));
    const missing = availableTabs.filter(id => !valid.includes(id));
    return [...valid, ...missing];
  });
  const [draftHidden, setDraftHidden] = useState<Set<SiteTab>>(() =>
    new Set(config.hidden.filter(id => availableTabs.includes(id)))
  );

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const visibleCount = draftOrder.filter(id => !draftHidden.has(id)).length;

  const move = (idx: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= draftOrder.length) return;
    setDraftOrder(prev => {
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const toggleVisibility = (id: SiteTab) => {
    setDraftHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const wouldHide = draftOrder.filter(t => !next.has(t)).length - 1;
        if (wouldHide < 1) return prev;
        next.add(id);
      }
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
      setDraftOrder(prev => {
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

  const handleReset = () => {
    setDraftOrder([...availableTabs]);
    setDraftHidden(new Set());
  };

  const handleSave = () => {
    onSave({ order: draftOrder, hidden: Array.from(draftHidden) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: '#0ea5e9' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Reorganiser les onglets</h3>
              <p className="text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>
                {visibleCount} onglet{visibleCount !== 1 ? 's' : ''} visible{visibleCount !== 1 ? 's' : ''} sur {draftOrder.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: t.text.tertiary }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surface.secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="px-6 py-4 space-y-1.5">
          {draftOrder.map((tabId, idx) => {
            const meta = TAB_META[tabId];
            const isHidden = draftHidden.has(tabId);
            const isDragging = dragIdx === idx;
            const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
            return (
              <div
                key={tabId}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all group"
                style={{
                  background: isOver ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
                  border: `1px solid ${isOver ? 'rgba(14,165,233,0.25)' : t.surface.border}`,
                  opacity: isDragging ? 0.4 : isHidden ? 0.45 : 1,
                  cursor: 'grab',
                }}
              >
                <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }} />

                <span
                  className="text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: t.surface.primary, color: isHidden ? t.text.quaternary : t.text.tertiary }}
                >
                  {idx + 1}
                </span>

                <span className="flex-shrink-0" style={{ color: isHidden ? t.text.quaternary : '#0ea5e9' }}>{meta.icon}</span>

                <span
                  className="text-xs font-semibold flex-1"
                  style={{ color: isHidden ? t.text.quaternary : t.text.primary, textDecoration: isHidden ? 'line-through' : 'none' }}
                >
                  {meta.label}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisibility(tabId)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                  style={{ color: isHidden ? t.text.quaternary : '#0ea5e9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.surface.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  title={isHidden ? 'Afficher' : 'Masquer'}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Move arrows */}
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
                    disabled={idx === draftOrder.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
                    style={{ color: t.text.secondary }}
                    onMouseEnter={e => { if (idx < draftOrder.length - 1) e.currentTarget.style.background = t.surface.primary; }}
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
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.surface.secondary; }}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
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
