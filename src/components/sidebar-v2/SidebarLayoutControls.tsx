import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { Minus, Check, X, FolderPlus, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { entryLabel } from '../../lib/sidebarLayout';
import { ReorderSlot, ReorderRow } from './SidebarReorderRow';
import { splitDisplayRows, flatRows, resolveDrop, hasHiddenItems } from './reorderView';
import type { LayoutEntry, LayoutItem } from '../../lib/sidebarLayout';

interface Props {
  /** Hors reorganisation : les entrees visibles. En reorganisation : le brouillon complet. */
  entries: LayoutEntry[];
  reordering: boolean;
  collapsed: boolean;
  activeId: string;
  defaultLabels: Record<string, string>;

  cancelReorder: () => void;
  confirmReorder: () => void;
  resetToDefault: () => void;

  move: (from: number, to: number) => void;
  addSection: (label: string) => void;
  addDivider: () => void;
  remove: (index: number) => void;
  rename: (index: number, label: string) => void;
  toggleHidden: (index: number) => void;

  /** Couleur de compartiment issue de l editeur, par ID de compartiment (pas par libelle : renommer ne casse rien). */
  /** Onglets non masquables : l oeil est remplace par un cadenas. */
  isProtected?: (id: string) => boolean;
  /**
   * Droit de MASQUER / REAFFICHER un onglet. Refuse par defaut.
   *
   * Reorganiser est une personnalisation d interface : chaque panel et
   * chaque niveau parent autorise y a droit. Masquer est autre chose —
   * cela decide de ce qui EXISTE, et pilotera les forfaits. Seul Talvex
   * Administrateur en dispose.
   *
   * A `false`, l oeil et le bouton « onglets masques » disparaissent. Les
   * onglets deja masques restent dans la configuration et sont preserves
   * par Valider : aucun niveau inferieur ne peut en ressusciter un.
   */
  canHide?: boolean;
  sectionColorById?: Record<string, string>;
  /** Police des compartiments, issue de l editeur. */
  sectionFontFamily?: string;

  /** Rendu d'un onglet hors mode reorganisation. */
  renderItem: (entry: LayoutItem, isActive: boolean, label: string) => ReactNode;
}

export default function SidebarLayoutControls({
  entries, reordering, collapsed, activeId, defaultLabels,
  cancelReorder, confirmReorder, resetToDefault,
  move, addSection, addDivider, remove, rename, toggleHidden,
  isProtected, canHide = false, sectionColorById, sectionFontFamily,
  renderItem,
}: Props) {
  const t = useThemeTokens();
  const [addingName, setAddingName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // FILTRE PUREMENT VISUEL. Ne touche jamais aux donnees : ni hidden, ni
  // l'ordre, ni entries, ni le stockage. Seul l'affichage change.
  const [showHidden, setShowHidden] = useState(false);
  // A chaque ouverture de Reorganiser on repart masque.
  useEffect(() => { if (reordering) setShowHidden(false); }, [reordering]);

  const hasHidden = useMemo(() => hasHiddenItems(entries), [entries]);

  // Lignes AFFICHEES, chacune gardant son index REEL dans entries : les
  // callbacks (move / rename / remove / toggleHidden) operent sur entries,
  // pas sur la vue filtree.
  // Deux zones d'AFFICHAGE. `entries` n'est jamais reordonne : chaque ligne
  // garde son realIdx, donc sa vraie place.
  const split = useMemo(() => splitDisplayRows(entries, reordering), [entries, reordering]);
  // Liste aplatie : c'est elle qui indexe le glisser-deposer.
  const rows = useMemo(() => flatRows(split, showHidden), [split, showHidden]);

  const dragIdx = useRef<number | null>(null);
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<'before' | 'after'>('before');

  function handleAdd() {
    const name = addingName.trim();
    if (!name) return;
    addSection(name);
    setAddingName('');
    setShowAdd(false);
  }

  function onDragStart(i: number) { dragIdx.current = i; setDragSource(i); }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) { setDropTarget(null); return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropTarget(i);
    setDropEdge(e.clientY < r.top + r.height / 2 ? 'before' : 'after');
  }
  function onDragEnd() {
    // dragIdx / dropTarget sont des index d'AFFICHAGE : on les traduit en
    // index reels avant de toucher aux donnees.
    if (dragIdx.current !== null && dropTarget !== null) {
      const d = resolveDrop(rows, dragIdx.current, dropTarget, dropEdge);
      if (d) move(d.from, d.to);
    }
    dragIdx.current = null; setDragSource(null); setDropTarget(null);
  }

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {reordering ? (
          <>
            {split.main.map(({ entry, realIdx }, idx) => (
              <ReorderSlot key={entry.id} idx={idx} dropTarget={dropTarget} dropEdge={dropEdge} dragSource={dragSource}>
                <ReorderRow
                  entry={entry} idx={idx} realIdx={realIdx} collapsed={collapsed}
                  label={entryLabel(entry, defaultLabels)}
                  isDragging={dragSource === idx}
                  onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}
                  onRename={rename} onRemove={remove} onToggleHidden={toggleHidden}
                  protege={entry.kind === 'item' && !!isProtected?.(entry.id)}
                  canHide={canHide}
                  t={t}
                />
              </ReorderSlot>
            ))}

            {showHidden && split.hidden.length > 0 && !collapsed && (
              <div className="flex items-center gap-2 px-1 pt-4 pb-1.5">
                <span className="h-px flex-1" style={{ background: t.surface.borderLight }} />
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase whitespace-nowrap"
                  style={{ color: t.text.quaternary }}>Onglets masqués</span>
                <span className="h-px flex-1" style={{ background: t.surface.borderLight }} />
              </div>
            )}

            {showHidden && split.hidden.map(({ entry, realIdx }, i) => {
              const idx = split.main.length + i;   // index d'AFFICHAGE dans la liste aplatie
              return (
                <ReorderSlot key={entry.id} idx={idx} dropTarget={dropTarget} dropEdge={dropEdge} dragSource={dragSource}>
                  <ReorderRow
                    entry={entry} idx={idx} realIdx={realIdx} collapsed={collapsed}
                    label={entryLabel(entry, defaultLabels)}
                    isDragging={dragSource === idx}
                    onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}
                    onRename={rename} onRemove={remove} onToggleHidden={toggleHidden}
                    protege={entry.kind === 'item' && !!isProtected?.(entry.id)}
                  canHide={canHide}
                    t={t}
                  />
                </ReorderSlot>
              );
            })}
          </>
        ) : (
          split.main.map(({ entry }) => {
            if (entry.kind === 'section') {
              if (collapsed) return null;
              return (
                <p key={entry.id} className="px-2 pb-1.5 pt-3 first:pt-1 text-[9px] font-bold tracking-[0.18em] uppercase"
                  style={{
                    color: sectionColorById?.[entry.id] || t.sidebar.sectionTitle,
                    fontFamily: sectionFontFamily ? `"${sectionFontFamily}", sans-serif` : undefined,
                  }}>{entry.label}</p>
              );
            }
            if (entry.kind === 'divider') {
              return <div key={entry.id} className="mx-3 my-2" style={{ height: '1px', background: t.sidebar.divider }} />;
            }
            return (
              <div key={entry.id}>
                {renderItem(entry, activeId === entry.id, entryLabel(entry, defaultLabels))}
              </div>
            );
          })
        )}
      </nav>

      {!collapsed && (
        <div className="px-2 pb-1 space-y-1.5">
          {reordering ? (
            <>
              {showAdd ? (
                <div className="flex gap-1">
                  <input value={addingName} onChange={e => setAddingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
                    placeholder="Nom du compartiment" autoFocus
                    className="flex-1 min-w-0 text-[11px] px-2 py-1 rounded-lg outline-none"
                    style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                  <button onClick={handleAdd} className="p-1 rounded-lg" style={{ color: '#34d399' }}><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg" style={{ color: '#f87171' }}><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setShowAdd(true)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    <FolderPlus className="w-3.5 h-3.5" />Compartiment
                  </button>
                  <button onClick={addDivider}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}`, color: t.text.tertiary }}>
                    <Minus className="w-3.5 h-3.5" />Séparateur
                  </button>
                </div>
              )}
              {hasHidden && canHide && (
                <button onClick={() => setShowHidden(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8' }}>
                  {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showHidden ? 'Cacher les onglets masqués' : 'Afficher les onglets masqués'}
                </button>
              )}
              <button onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8' }}>
                <RotateCcw className="w-3.5 h-3.5" />Par défaut
              </button>
              <div className="flex gap-1.5">
                <button onClick={confirmReorder}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                  <Check className="w-3.5 h-3.5" />Valider
                </button>
                <button onClick={cancelReorder}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
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

/** Enveloppe une ligne et dessine l indicateur de depot. */
