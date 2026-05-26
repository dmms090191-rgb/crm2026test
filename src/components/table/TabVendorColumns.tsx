import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Lock, Sparkles, Trash2, Users,
} from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import DesktopPreviewBlock from './DesktopPreviewBlock';
import { ROW_H } from './TabColumnsHelpers';

export interface VendorColumnConfig {
  order: string[];
  hidden: string[];
}

interface Props {
  vendorColumns: ColumnDef[];
  initialOrder: string[];
  initialHidden: string[];
  onSave: (config: VendorColumnConfig) => void;
  t: ThemeTokens;
}

export default function TabVendorColumns({
  vendorColumns, initialOrder, initialHidden, onSave, t,
}: Props) {
  const [draftOrder, setDraftOrder] = useState<string[]>(() => [...initialOrder]);
  const [draftHidden, setDraftHidden] = useState<Set<string>>(() => new Set(initialHidden));
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const colMap = useMemo(() => new Map(vendorColumns.map(c => [c.key, c])), [vendorColumns]);
  const allCols = useMemo(() => draftOrder.map(k => colMap.get(k)).filter(Boolean) as ColumnDef[], [draftOrder, colMap]);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    saveRef.current({ order: draftOrder, hidden: [...draftHidden] });
  }, [draftOrder, draftHidden]);

  useEffect(() => {
    const newKeys = vendorColumns.map(c => c.key);
    const existing = new Set(draftOrder);
    const added = newKeys.filter(k => !existing.has(k));
    if (added.length > 0) setDraftOrder(prev => [...prev, ...added]);
  }, [vendorColumns, draftOrder]);

  const moveUp = useCallback((key: string) => {
    setDraftOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((key: string) => {
    setDraftOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverIdx(idx); };
  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from !== null && from !== toIdx) {
      setDraftOrder(prev => { const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(toIdx, 0, moved); return next; });
    }
    dragIdx.current = null; setOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  const toggleHidden = useCallback((key: string) => {
    setDraftHidden(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const handleDelete = useCallback((key: string) => {
    setDraftOrder(prev => prev.filter(k => k !== key));
    setDraftHidden(prev => { const n = new Set(prev); n.delete(key); return n; });
    setConfirmDeleteKey(null);
  }, []);

  const hiddenCount = allCols.filter(c => draftHidden.has(c.key)).length;
  const visibleCount = allCols.length - hiddenCount;
  const visibleCols = useMemo(() =>
    draftOrder.filter(k => !draftHidden.has(k)).map(k => colMap.get(k)).filter(Boolean) as ColumnDef[]
  , [draftOrder, draftHidden, colMap]);

  const applyFromAdmin = useCallback((order: string[], hidden: string[]) => {
    setDraftOrder(order);
    setDraftHidden(new Set(hidden));
  }, []);

  // Expose method for parent to call "apply from desktop"
  const ref = useRef({ applyFromAdmin });
  ref.current.applyFromAdmin = applyFromAdmin;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[11px]" style={{ color: t.text.tertiary }}>
            Configure les colonnes visibles dans le CRM des vendeurs de ta societe. Les colonnes protegees ne peuvent pas etre supprimees.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <Eye className="w-2.5 h-2.5" />{visibleCount}
            </span>
            {hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
                <EyeOff className="w-2.5 h-2.5" />{hiddenCount}
              </span>
            )}
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}>
          <Users className="w-3 h-3" />Vue vendeur
        </div>
      </div>

      <div className="space-y-1">
        {allCols.map((col, idx) => {
          const isRequired = !!col.required;
          const isHidden = draftHidden.has(col.key);
          const isConfirming = confirmDeleteKey === col.key;

          return (
            <div
              key={col.key} draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150 group ${ROW_H}`}
              style={{
                background: overIdx === idx ? t.accent.bg : t.surface.primary,
                border: `1px solid ${overIdx === idx ? t.accent.border : t.surface.border}`,
                opacity: isHidden ? 0.55 : 1, cursor: 'grab',
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }} />
                <span className="text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.surface.secondary, color: t.text.tertiary }}>{idx + 1}</span>
                <span className="text-xs font-semibold truncate min-w-0" style={{ color: isHidden ? t.text.tertiary : t.text.primary }}>{col.label}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isRequired && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <Lock className="w-2.5 h-2.5" /><span className="hidden sm:inline">Protegee</span>
                    </span>
                  )}
                  {col.isCustom && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
                      <Sparkles className="w-2.5 h-2.5" /><span className="hidden sm:inline">Perso</span>
                    </span>
                  )}
                </div>
              </div>

              {!isConfirming && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isRequired ? (
                    <button onClick={e => { e.stopPropagation(); toggleHidden(col.key); }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={isHidden ? { background: 'rgba(34,197,94,0.08)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }}
                    >
                      {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span className="hidden sm:inline">{isHidden ? 'Afficher' : 'Masquer'}</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold opacity-40" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <Eye className="w-3 h-3" /><span className="hidden sm:inline">Visible</span>
                    </div>
                  )}

                  {!isRequired && (
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteKey(col.key); }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Supprimer</span>
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 ml-0.5">
                    <button onClick={e => { e.stopPropagation(); moveUp(col.key); }} disabled={idx === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20" style={{ color: t.text.secondary }}
                      onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = t.surface.secondary; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveDown(col.key); }} disabled={idx === allCols.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20" style={{ color: t.text.secondary }}
                      onMouseEnter={e => { if (idx < allCols.length - 1) e.currentTarget.style.background = t.surface.secondary; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {isConfirming && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>Retirer cette colonne pour les vendeurs ?</span>
                  <button onClick={e => { e.stopPropagation(); handleDelete(col.key); }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#ef4444', color: '#fff' }}>Confirmer</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteKey(null); }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium" style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>Annuler</button>
                </div>
              )}
            </div>
          );
        })}
        {allCols.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: t.text.tertiary }}>Aucune colonne</p>
        )}
      </div>

      <DesktopPreviewBlock visibleCols={visibleCols} t={t} />
    </div>
  );
}
