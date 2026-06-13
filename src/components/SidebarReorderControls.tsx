import { useState } from 'react';
import { Check, X, Minus, FolderPlus, RotateCcw } from 'lucide-react';
import type { SidebarEntry } from '../lib/sidebarOrderTypes';
import { useThemeTokens } from '../hooks/useThemeTokens';
import SidebarReorderEntry from './SidebarReorderEntry';

interface Props {
  entries: SidebarEntry[];
  reordering: boolean;
  collapsed: boolean;
  activeId: string;
  onNavigate: (id: string) => void;
  startReorder: () => void;
  cancelReorder: () => void;
  confirmReorder: () => void;
  move: (from: number, to: number) => void;
  handleDragStart: (idx: number) => void;
  handleDragOver: (e: React.DragEvent, idx: number) => void;
  handleDragEnd: () => void;
  draftLength: number;
  renameEntry: (idx: number, label: string) => void;
  addSection: (title: string) => void;
  addDivider: () => void;
  removeEntry: (idx: number) => void;
  renderItem?: (entry: SidebarEntry & { kind: 'item' }, isActive: boolean) => React.ReactNode;
  dragSourceIdx?: number | null;
  dropTargetIdx?: number | null;
  dropEdge?: 'before' | 'after';
  resetToDefault?: () => void;
  sectionColorMap?: Record<string, string>;
  sectionFontFamily?: string;
}

export default function SidebarReorderControls({
  entries, reordering, collapsed, activeId, onNavigate,
  startReorder, cancelReorder, confirmReorder,
  move, handleDragStart, handleDragOver, handleDragEnd, draftLength,
  renameEntry, addSection, addDivider, removeEntry,
  renderItem,
  dragSourceIdx, dropTargetIdx, dropEdge,
  resetToDefault,
  sectionColorMap,
  sectionFontFamily,
}: Props) {
  const t = useThemeTokens();
  const [addingSectionName, setAddingSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  function handleAddSection() {
    const name = addingSectionName.trim();
    if (name) { addSection(name); setAddingSectionName(''); setShowAddSection(false); }
  }

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {entries.map((entry, idx) => {
          if (reordering) {
            const isDragging = dragSourceIdx === idx;
            const showIndicatorBefore = dropTargetIdx === idx && dropEdge === 'before' && dragSourceIdx !== idx && dragSourceIdx !== idx - 1;
            const showIndicatorAfter = dropTargetIdx === idx && dropEdge === 'after' && dragSourceIdx !== idx && dragSourceIdx !== idx + 1;
            return (
              <SidebarReorderEntry
                key={reorderKey(entry, idx)}
                entry={entry} idx={idx} total={draftLength} collapsed={collapsed}
                move={move} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
                onRename={renameEntry} onRemove={removeEntry} t={t}
                isDragging={isDragging}
                showIndicatorBefore={showIndicatorBefore}
                showIndicatorAfter={showIndicatorAfter}
              />
            );
          }
          if (entry.kind === 'section') {
            if (collapsed) return null;
            const sectionColor = sectionColorMap?.[entry.title] || t.sidebar.sectionTitle;
            return <p key={`s-${entry.title}`} className="px-2 pb-1.5 pt-3 first:pt-1 text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: sectionColor, fontFamily: sectionFontFamily ? `"${sectionFontFamily}", sans-serif` : undefined }}>{entry.title}</p>;
          }
          if (entry.kind === 'divider') {
            return <div key={`d-${entry.afterSection}-${idx}`} className="mx-3 my-2" style={{ height: '1px', background: t.sidebar.divider }} />;
          }
          const isActive = activeId === entry.id;
          if (renderItem) return <div key={entry.id}>{renderItem(entry, isActive)}</div>;
          return <DefaultItem key={entry.id} entry={entry} isActive={isActive} collapsed={collapsed} onClick={() => onNavigate(entry.id)} t={t} />;
        })}
      </nav>

      {!collapsed && (
        <div className="px-2 pb-1 space-y-1.5">
          {reordering ? (
            <>
              {showAddSection ? (
                <div className="flex gap-1">
                  <input value={addingSectionName} onChange={e => setAddingSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                    placeholder="Nom du compartiment"
                    className="flex-1 min-w-0 text-[11px] px-2 py-1 rounded-lg outline-none"
                    style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
                    autoFocus />
                  <button onClick={handleAddSection} className="p-1 rounded-lg" style={{ color: '#34d399' }}><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setShowAddSection(false)} className="p-1 rounded-lg" style={{ color: '#f87171' }}><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setShowAddSection(true)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    <FolderPlus className="w-3.5 h-3.5" />Compartiment
                  </button>
                  <button onClick={addDivider} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}`, color: t.text.tertiary }}>
                    <Minus className="w-3.5 h-3.5" />Separateur
                  </button>
                </div>
              )}
              {resetToDefault && (
                <button onClick={resetToDefault} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8' }}>
                  <RotateCcw className="w-3.5 h-3.5" />Par defaut
                </button>
              )}
              <div className="flex gap-1.5">
                <button onClick={confirmReorder} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                  <Check className="w-3.5 h-3.5" />Valider
                </button>
                <button onClick={cancelReorder} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                  <X className="w-3.5 h-3.5" />Annuler
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}

function reorderKey(e: SidebarEntry, idx: number): string {
  if (e.kind === 'item') return e.id;
  if (e.kind === 'section') return `s-${e.title}`;
  return `d-${idx}`;
}

function DefaultItem({ entry, isActive, collapsed, onClick, t }: {
  entry: SidebarEntry & { kind: 'item' }; isActive: boolean; collapsed: boolean; onClick: () => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <button onClick={onClick} title={collapsed ? entry.label : undefined}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{
        background: isActive ? t.sidebar.activeItemBg : 'transparent',
        color: isActive ? t.sidebar.activeItemText : t.sidebar.itemText,
        boxShadow: isActive ? t.sidebar.activeItemShadow : 'none',
      }}>
      <span className="flex-shrink-0" style={{ color: isActive ? (t.sidebar as Record<string, string>).activeItemIcon ?? t.sidebar.activeItemText : (t.sidebar as Record<string, string>).itemIcon ?? t.sidebar.itemText }}>{entry.icon}</span>
      {!collapsed && <span className="text-[12.5px] font-medium truncate">{entry.label}</span>}
    </button>
  );
}
