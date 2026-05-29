import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown, GripVertical, ArrowRightLeft } from 'lucide-react';
import type { AmeliorationRowProps } from './types';
import { formatDate, formatTime } from './types';

function splitNumberedItems(text: string): string[] {
  const byNewline = text.split('\n').filter(l => l.trim());
  if (byNewline.length > 1) {
    return byNewline.map(l => l.replace(/^\s*(?:\d+[\.\)]\s*|[-*]\s+)/, '').trim()).filter(Boolean);
  }

  const re = /(\d+)\.\s+/g;
  let m;
  const allPositions: { idx: number; num: number; end: number }[] = [];
  while ((m = re.exec(text)) !== null) {
    allPositions.push({ idx: m.index, num: parseInt(m[1], 10), end: m.index + m[0].length });
  }

  const first1 = allPositions.find(p => p.num === 1);
  if (!first1) return [];

  const seqPositions = [first1];
  let expected = 2;
  for (const p of allPositions) {
    if (p.idx > first1.idx && p.num === expected) {
      seqPositions.push(p);
      expected++;
    }
  }
  if (seqPositions.length < 2) return [];

  const items: string[] = [];
  for (let i = 0; i < seqPositions.length; i++) {
    const begin = seqPositions[i].end;
    const finish = i + 1 < seqPositions.length ? seqPositions[i + 1].idx : text.length;
    items.push(text.slice(begin, finish).trim().replace(/\.\s*$/, '').trim());
  }
  return items.filter(Boolean);
}

function renderNumberedTitle(text: string, color: string, numColor: string) {
  const items = splitNumberedItems(text);
  if (items.length === 0) return <span>{text}</span>;

  return (
    <ol className="list-none space-y-1 m-0 p-0">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="font-semibold tabular-nums flex-shrink-0" style={{ color: numColor, minWidth: 22, textAlign: 'right' }}>{i + 1}.</span>
          <span style={{ color }}>{line}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AmeliorationRow({
  item, index, tokens, confirmDeleteId, isReordering, isFirst, isLast,
  isMoved, isDragging, categories, onMoveUp, onMoveDown, onDragStart,
  onDragOver, onDrop, onDragEnd, onEdit, onDelete, onConfirmDelete,
  onCancelDelete, onTransfer,
}: AmeliorationRowProps) {
  const isDone = item.status === 'done';
  const [transferOpen, setTransferOpen] = useState(false);
  const transferRef = useRef<HTMLDivElement>(null);

  const otherCategories = (categories ?? []).filter((c) => c.id !== item.category_id);

  useEffect(() => {
    if (!transferOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (transferRef.current && !transferRef.current.contains(e.target as Node)) {
        setTransferOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [transferOpen]);

  return (
    <div
      className="flex flex-col md:flex-row md:flex-wrap md:items-start gap-2 md:gap-x-3 md:gap-y-1.5 pl-3 pr-4 py-3 md:py-2 rounded-lg transition-all duration-200 group min-w-0"
      draggable={isReordering}
      onDragStart={(e) => { if (isReordering && onDragStart) { e.dataTransfer.effectAllowed = 'move'; onDragStart(); } }}
      onDragOver={(e) => { if (isReordering && onDragOver) onDragOver(e); }}
      onDrop={() => { if (isReordering && onDrop) onDrop(); }}
      onDragEnd={() => { if (isReordering && onDragEnd) onDragEnd(); }}
      style={{
        background: isMoved ? tokens.accent.bg : tokens.surface.secondary,
        border: `1px solid ${isMoved ? tokens.accent.border : tokens.surface.border}`,
        borderLeftWidth: isMoved ? '3px' : '1px',
        borderLeftColor: isMoved ? tokens.accent.text : undefined,
        opacity: isDragging ? 0.4 : 1,
        cursor: isReordering ? 'grab' : undefined,
      }}
      onMouseEnter={(e) => { if (!isMoved && !isDragging) e.currentTarget.style.borderColor = tokens.accent.border; }}
      onMouseLeave={(e) => { if (!isMoved) e.currentTarget.style.borderColor = tokens.surface.border; }}
    >
      {isReordering && (
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <GripVertical className="w-3.5 h-3.5 opacity-40" style={{ color: tokens.text.tertiary }} />
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: tokens.text.secondary }}
              onMouseEnter={(e) => { if (!isFirst) e.currentTarget.style.color = tokens.accent.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: tokens.text.secondary }}
              onMouseEnter={(e) => { if (!isLast) e.currentTarget.style.color = tokens.accent.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile: vertical layout */}
      <div className="flex flex-col gap-1.5 w-full md:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: tokens.accent.text }}>#{index + 1}</span>
          <span className="text-xs" style={{ color: tokens.text.quaternary }}>{'\u2014'}</span>
          <span className="text-xs" style={{ color: tokens.text.tertiary }}>{formatDate(item.created_at)}</span>
          <span className="text-xs" style={{ color: tokens.text.quaternary }}>a {formatTime(item.created_at)}</span>
        </div>
        <div className="text-sm break-words whitespace-normal" style={{ color: tokens.text.secondary }}>
          {renderNumberedTitle(item.title, tokens.text.secondary, tokens.text.tertiary)}
          {item.description && (
            <span className="block text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>
              {item.description}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: isDone ? tokens.success.bg : tokens.accent.bg,
              color: isDone ? tokens.success.text : tokens.accent.text,
              border: `1px solid ${isDone ? tokens.success.border : tokens.accent.border}`,
            }}
          >
            {isDone ? 'Implémenté' : 'À faire'}
          </span>
          {!isReordering && (
            <>
              {confirmDeleteId === item.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: tokens.danger.text }}>Supprimer ?</span>
                  <button onClick={onDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>Oui</button>
                  <button onClick={onCancelDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>Non</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button onClick={onEdit} className="p-1.5 rounded-md transition-colors" style={{ color: tokens.text.tertiary }} title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {otherCategories.length > 0 && onTransfer && (
                    <div className="relative" ref={transferRef}>
                      <button
                        onClick={() => setTransferOpen(!transferOpen)}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: transferOpen ? tokens.accent.text : tokens.text.tertiary, background: transferOpen ? tokens.accent.bg : 'transparent' }}
                        title="Transférer vers..."
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      {transferOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[160px]" style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
                          <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: tokens.text.quaternary }}>Transférer vers</div>
                          {otherCategories.map((cat) => (
                            <button key={cat.id} onClick={() => { onTransfer(cat.id); setTransferOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs transition-colors" style={{ color: tokens.text.secondary }}>
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={onConfirmDelete} className="p-1.5 rounded-md transition-colors" style={{ color: tokens.text.tertiary }} title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop: original horizontal layout */}
      <div className="hidden md:contents">
        <span className="text-xs font-bold shrink-0 w-7 pt-0.5" style={{ color: tokens.accent.text }}>
          #{index + 1}
        </span>
        <span className="text-xs shrink-0 pt-0.5" style={{ color: tokens.text.tertiary }}>
          {formatDate(item.created_at)}
        </span>
        <span className="text-xs shrink-0 pt-0.5" style={{ color: tokens.text.quaternary }}>
          a {formatTime(item.created_at)}
        </span>
        <span className="mx-0.5 shrink-0 pt-0.5" style={{ color: tokens.text.quaternary }}>{'\u2014'}</span>
        <div className="text-sm flex-1 min-w-0 break-words whitespace-normal" style={{ color: tokens.text.secondary }}>
          {renderNumberedTitle(item.title, tokens.text.secondary, tokens.text.tertiary)}
          {item.description && (
            <span className="block text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>
              {item.description}
            </span>
          )}
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: isDone ? tokens.success.bg : tokens.accent.bg,
            color: isDone ? tokens.success.text : tokens.accent.text,
            border: `1px solid ${isDone ? tokens.success.border : tokens.accent.border}`,
          }}
        >
          {isDone ? 'Implémenté' : 'À faire'}
        </span>

        {!isReordering && (
          <>
            {confirmDeleteId === item.id ? (
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs" style={{ color: tokens.danger.text }}>Supprimer ?</span>
                <button onClick={onDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>
                  Oui
                </button>
                <button onClick={onCancelDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>
                  Non
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: tokens.text.tertiary }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; }}
                  title="Modifier"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {otherCategories.length > 0 && onTransfer && (
                  <div className="relative" ref={transferRef}>
                    <button
                      onClick={() => setTransferOpen(!transferOpen)}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: transferOpen ? tokens.accent.text : tokens.text.tertiary, background: transferOpen ? tokens.accent.bg : 'transparent' }}
                      onMouseEnter={(e) => { if (!transferOpen) { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; } }}
                      onMouseLeave={(e) => { if (!transferOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; } }}
                      title="Transférer vers..."
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    {transferOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[160px]"
                        style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: tokens.text.quaternary }}>
                          Transférer vers
                        </div>
                        {otherCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => { onTransfer(cat.id); setTransferOpen(false); }}
                            className="w-full text-left px-2.5 py-1.5 text-xs transition-colors"
                            style={{ color: tokens.text.secondary }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.secondary; }}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={onConfirmDelete}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: tokens.text.tertiary }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = tokens.danger.bg; e.currentTarget.style.color = tokens.danger.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; }}
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
