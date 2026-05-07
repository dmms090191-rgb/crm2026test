import { DragEvent } from 'react';
import { ChevronRight, Pencil, Trash2, Check, X, ArrowUpDown, Plus } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Amelioration, AmeliorationCategory } from './types';
import AmeliorationRow from './AmeliorationRow';

interface Props {
  cat: AmeliorationCategory;
  items: Amelioration[];
  isOpen: boolean;
  isReordering: boolean;
  renamingCatId: string | null;
  renameDraft: string;
  confirmDeleteCatId: string | null;
  confirmDeleteId: string | null;
  movedId: string | null;
  dragIndex: number | null;
  dragOverIndex: number | null;
  categories: AmeliorationCategory[];
  tokens: ReturnType<typeof useThemeTokens>;
  onToggle: () => void;
  onStartRename: () => void;
  onRenameDraftChange: (value: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onConfirmDeleteCat: () => void;
  onDeleteCat: () => void;
  onCancelDeleteCat: () => void;
  onStartReorder: () => void;
  onCancelReorder: () => void;
  onSaveOrder: () => void;
  onAddAmelioration: () => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: DragEvent, idx: number) => void;
  onDragDrop: () => void;
  onDragEnd: () => void;
  onEditItem: (item: Amelioration) => void;
  onDeleteItem: (id: string) => void;
  onConfirmDeleteItem: (id: string) => void;
  onCancelDeleteItem: () => void;
  onTransfer: (itemId: string, targetCatId: string) => void;
}

export default function CategoryAccordion({
  cat, items, isOpen, isReordering, renamingCatId, renameDraft,
  confirmDeleteCatId, confirmDeleteId, movedId, dragIndex, dragOverIndex,
  categories, tokens, onToggle, onStartRename, onRenameDraftChange,
  onConfirmRename, onCancelRename, onConfirmDeleteCat, onDeleteCat,
  onCancelDeleteCat, onStartReorder, onCancelReorder, onSaveOrder,
  onAddAmelioration, onMoveUp, onMoveDown, onDragStart, onDragOver,
  onDragDrop, onDragEnd, onEditItem, onDeleteItem, onConfirmDeleteItem,
  onCancelDeleteItem, onTransfer,
}: Props) {
  const isRenaming = renamingCatId === cat.id;
  const isConfirmingDelete = confirmDeleteCatId === cat.id;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.surface.border}` }}>
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none transition-colors"
        style={{ background: tokens.surface.secondary }}
        onClick={onToggle}
      >
        <ChevronRight
          className="w-4 h-4 transition-transform duration-200"
          style={{ color: tokens.text.tertiary, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        {isRenaming ? (
          <input
            type="text"
            value={renameDraft}
            onChange={(e) => onRenameDraftChange(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') onCancelRename(); }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-0.5 rounded text-sm outline-none"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.borderFocus}`, color: tokens.input.text, width: '180px' }}
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium" style={{ color: tokens.text.secondary }}>{cat.name}</span>
        )}
        <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
          {items.length}
        </span>
        <div className="flex-1" />

        {isConfirmingDelete ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs" style={{ color: tokens.danger.text }}>
              Supprimer{items.length > 0 ? ` (${items.length} amélioration${items.length > 1 ? 's' : ''})` : ''} ?
            </span>
            <button onClick={onDeleteCat} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>
              Oui
            </button>
            <button onClick={onCancelDeleteCat} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>
              Non
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isRenaming ? (
              <>
                <button onClick={onConfirmRename} className="p-1 rounded-md" style={{ color: tokens.success.text }}>
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={onCancelRename} className="p-1 rounded-md" style={{ color: tokens.text.tertiary }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onStartRename}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: tokens.text.tertiary }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = tokens.accent.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.tertiary; }}
                  title="Renommer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onConfirmDeleteCat}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: tokens.text.tertiary }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = tokens.danger.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.tertiary; }}
                  title="Supprimer la catégorie"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="px-4 py-3 space-y-1.5" style={{ background: tokens.surface.primary, borderTop: `1px solid ${tokens.surface.border}` }}>
          <div className="flex justify-end gap-2 mb-2">
            {isReordering ? (
              <>
                <button
                  onClick={onCancelReorder}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}
                >
                  <X className="w-3 h-3" />
                  Annuler
                </button>
                <button
                  onClick={onSaveOrder}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}
                >
                  <Check className="w-3 h-3" />
                  Valider l'ordre
                </button>
              </>
            ) : (
              <>
                {items.length > 1 && (
                  <button
                    onClick={onStartReorder}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    Réorganiser
                  </button>
                )}
                <button
                  onClick={onAddAmelioration}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                >
                  <Plus className="w-3 h-3" />
                  Ajouter une amélioration
                </button>
              </>
            )}
          </div>

          {items.length === 0 && (
            <div className="text-xs py-3 text-center" style={{ color: tokens.text.quaternary }}>
              Aucune amélioration dans cette catégorie
            </div>
          )}

          {items.map((item, idx) => (
            <div key={item.id}>
              {isReordering && dragOverIndex === idx && dragIndex !== idx && (
                <div className="flex items-center gap-2 my-1 px-2">
                  <div className="flex-1 h-0.5 rounded-full" style={{ background: tokens.accent.text }} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: tokens.accent.text }}>déposer ici</span>
                  <div className="flex-1 h-0.5 rounded-full" style={{ background: tokens.accent.text }} />
                </div>
              )}
              <AmeliorationRow
                item={item}
                index={idx}
                tokens={tokens}
                confirmDeleteId={confirmDeleteId}
                isReordering={isReordering}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                isMoved={movedId === item.id}
                isDragging={dragIndex === idx}
                categories={categories}
                onMoveUp={() => onMoveUp(idx)}
                onMoveDown={() => onMoveDown(idx)}
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={onDragDrop}
                onDragEnd={onDragEnd}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
                onConfirmDelete={() => onConfirmDeleteItem(item.id)}
                onCancelDelete={onCancelDeleteItem}
                onTransfer={(targetCatId) => onTransfer(item.id, targetCatId)}
              />
              {isReordering && dragOverIndex === items.length && idx === items.length - 1 && dragIndex !== idx && (
                <div className="flex items-center gap-2 my-1 px-2">
                  <div className="flex-1 h-0.5 rounded-full" style={{ background: tokens.accent.text }} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: tokens.accent.text }}>déposer ici</span>
                  <div className="flex-1 h-0.5 rounded-full" style={{ background: tokens.accent.text }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
