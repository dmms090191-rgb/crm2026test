import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import type { AmeliorationRowProps } from './types';
import { formatDate, formatTime } from './types';
import { renderNumberedTitle } from './ameliorationRowHelpers';
import AmeliorationRowActions from './AmeliorationRowActions';

export default function AmeliorationRow({
  item, index, tokens, confirmDeleteId, isReordering, isFirst, isLast,
  isMoved, isDragging, categories, onMoveUp, onMoveDown, onDragStart,
  onDragOver, onDrop, onDragEnd, onEdit, onDelete, onConfirmDelete,
  onCancelDelete, onTransfer,
}: AmeliorationRowProps) {
  const isDone = item.status === 'done';

  const statusBadge = (
    <span
      className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: isDone ? tokens.success.bg : tokens.accent.bg,
        color: isDone ? tokens.success.text : tokens.accent.text,
        border: `1px solid ${isDone ? tokens.success.border : tokens.accent.border}`,
      }}
    >
      {isDone ? 'Implemente' : 'A faire'}
    </span>
  );

  const actionProps = {
    itemId: item.id,
    categoryId: item.category_id,
    tokens,
    confirmDeleteId,
    categories,
    onEdit,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    onTransfer,
  };

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
            <button onClick={onMoveUp} disabled={isFirst}
              className="p-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: tokens.text.secondary }}
              onMouseEnter={(e) => { if (!isFirst) e.currentTarget.style.color = tokens.accent.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={onMoveDown} disabled={isLast}
              className="p-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: tokens.text.secondary }}
              onMouseEnter={(e) => { if (!isLast) e.currentTarget.style.color = tokens.accent.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}>
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
          {statusBadge}
          {!isReordering && <AmeliorationRowActions {...actionProps} variant="mobile" />}
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
        {statusBadge}
        {!isReordering && <AmeliorationRowActions {...actionProps} variant="desktop" />}
      </div>
    </div>
  );
}
