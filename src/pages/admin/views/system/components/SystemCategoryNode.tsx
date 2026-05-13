import { useState } from 'react';
import { Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import type { SystemTreeNode, SystemStatus } from '../types';
import { countAllItems } from '../types';
import SystemColorPicker from './SystemColorPicker';
import SystemCategoryActions from './SystemCategoryActions';
import SystemItemRow from './SystemItemRow';

export interface CategoryNodeProps {
  node: SystemTreeNode;
  depth: number;
  openNodes: Set<string>;
  toggleNode: (id: string) => void;
  addingChildOf: string | null;
  childCatName: string;
  renamingCatId: string | null;
  renameDraft: string;
  confirmDeleteCatId: string | null;
  confirmDeleteId: string | null;
  tokens: ReturnType<typeof useThemeTokens>;
  statuses: SystemStatus[];
  addingItemToCat: string | null;
  newItemTitle: string;
  onSetAddingChildOf: (id: string) => void;
  onChildCatNameChange: (v: string) => void;
  onCreateChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onStartRename: (id: string, name: string) => void;
  onRenameDraftChange: (v: string) => void;
  onConfirmRename: (id: string) => void;
  onCancelRename: () => void;
  onConfirmDeleteCat: (id: string | null) => void;
  onDeleteCat: (id: string) => Promise<{ blocked?: boolean; message?: string }>;
  onCancelDeleteCat: () => void;
  onMoveCatUp: (id: string) => void;
  onMoveCatDown: (id: string) => void;
  onSetAddingItem: (catId: string) => void;
  onNewItemTitleChange: (v: string) => void;
  onCreateItem: (catId: string) => void;
  onCancelAddItem: () => void;
  onSetItemStatus: (itemId: string, statusId: string | null) => void;
  onDeleteItem: (id: string) => void;
  onConfirmDeleteItem: (id: string | null) => void;
  onCancelDeleteItem: () => void;
  onMoveItemUp: (id: string) => void;
  onMoveItemDown: (id: string) => void;
  colorPickerCatId: string | null;
  onOpenColorPicker: (id: string | null) => void;
  onSetColor: (id: string, color: string | null) => void;
}

export default function SystemCategoryNode(props: CategoryNodeProps) {
  const { node, depth, openNodes, toggleNode, tokens, statuses } = props;
  const cat = node.category;
  const isOpen = openNodes.has(cat.id);
  const isRenaming = props.renamingCatId === cat.id;
  const isAddingChild = props.addingChildOf === cat.id;
  const isAddingItem = props.addingItemToCat === cat.id;
  const totalItems = countAllItems(node);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);

  const styles = getDepthStyles(depth, tokens, cat.color);

  return (
    <div className={styles.container} style={styles.containerStyle}>
      {/* Header */}
      <div
        className={`flex items-center gap-2 cursor-pointer select-none group/header ${styles.header}`}
        style={styles.headerStyle}
        onClick={() => toggleNode(cat.id)}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: cat.color || tokens.text.tertiary }} />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: cat.color || tokens.text.tertiary }} />
        )}

        {cat.color && depth === 0 && (
          <div className="w-3 h-3 rounded-full shrink-0 hidden sm:block" style={{ background: cat.color }} />
        )}

        {isRenaming ? (
          <input
            type="text"
            value={props.renameDraft}
            onChange={(e) => props.onRenameDraftChange(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') props.onConfirmRename(cat.id); if (e.key === 'Escape') props.onCancelRename(); }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-0.5 rounded text-sm outline-none min-w-0 flex-1 max-w-[200px]"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.borderFocus}`, color: tokens.input.text }}
            autoFocus
          />
        ) : (
          <span className={`${styles.titleClass} min-w-0 break-words`} style={{ color: cat.color || styles.titleColor }}>
            {cat.name}
          </span>
        )}

        {totalItems > 0 && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary }}>
            {totalItems}
          </span>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isRenaming ? (
            <div className="flex items-center gap-0.5">
              <button onClick={() => props.onConfirmRename(cat.id)} className="p-1.5 rounded-md" style={{ color: tokens.success.text }}><Check className="w-4 h-4" /></button>
              <button onClick={props.onCancelRename} className="p-1.5 rounded-md" style={{ color: tokens.text.tertiary }}><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              {props.colorPickerCatId === cat.id && (
                <SystemColorPicker
                  currentColor={cat.color}
                  tokens={tokens}
                  onSelect={(c) => { props.onSetColor(cat.id, c); props.onOpenColorPicker(null); }}
                  onClose={() => props.onOpenColorPicker(null)}
                />
              )}
              <SystemCategoryActions
                depth={depth}
                name={cat.name}
                tokens={tokens}
                onAddChild={() => props.onSetAddingChildOf(cat.id)}
                onAddItem={() => props.onSetAddingItem(cat.id)}
                onRename={() => props.onStartRename(cat.id, cat.name)}
                onDelete={async () => {
                  const result = await props.onDeleteCat(cat.id);
                  if (result.blocked) {
                    setBlockMsg(result.message || 'Suppression impossible.');
                    setTimeout(() => setBlockMsg(null), 3500);
                  }
                }}
                onOpenColorPicker={() => props.onOpenColorPicker(props.colorPickerCatId === cat.id ? null : cat.id)}
                onMoveUp={() => props.onMoveCatUp(cat.id)}
                onMoveDown={() => props.onMoveCatDown(cat.id)}
              />
            </>
          )}
        </div>
      </div>

      {blockMsg && (
        <div className="px-3 py-2 text-xs font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, borderTop: `1px solid ${tokens.danger.border}` }}>
          {blockMsg}
        </div>
      )}

      {/* Content */}
      {isOpen && (
        <div style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
          {/* Add child input */}
          {isAddingChild && (
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2">
              <input
                type="text"
                value={props.childCatName}
                onChange={(e) => props.onChildCatNameChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') props.onCreateChild(cat.id); if (e.key === 'Escape') props.onCancelAddChild(); }}
                placeholder="Nom de la sous-categorie..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                autoFocus
              />
              <button onClick={() => props.onCreateChild(cat.id)} className="p-1.5 rounded-md shrink-0" style={{ color: tokens.success.text }}><Check className="w-4 h-4" /></button>
              <button onClick={props.onCancelAddChild} className="p-1.5 rounded-md shrink-0" style={{ color: tokens.text.tertiary }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Add item input */}
          {isAddingItem && (
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2">
              <input
                type="text"
                value={props.newItemTitle}
                onChange={(e) => props.onNewItemTitleChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') props.onCreateItem(cat.id); if (e.key === 'Escape') props.onCancelAddItem(); }}
                placeholder="Nouvel item de test..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                autoFocus
              />
              <button onClick={() => props.onCreateItem(cat.id)} className="p-1.5 rounded-md shrink-0" style={{ color: tokens.success.text }}><Check className="w-4 h-4" /></button>
              <button onClick={props.onCancelAddItem} className="p-1.5 rounded-md shrink-0" style={{ color: tokens.text.tertiary }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Child categories */}
          {node.children.length > 0 && (
            <div className="space-y-2 px-2 sm:px-3 py-2">
              {node.children.map((child) => (
                <SystemCategoryNode key={child.category.id} {...props} node={child} depth={depth + 1} />
              ))}
            </div>
          )}

          {/* Items */}
          {node.items.length > 0 && (
            <div className="space-y-1.5 px-2 sm:px-3 py-2">
              {node.items.map((item, idx) => (
                <SystemItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  total={node.items.length}
                  tokens={tokens}
                  statuses={statuses}
                  confirmDeleteId={props.confirmDeleteId}
                  onSetStatus={props.onSetItemStatus}
                  onDelete={() => props.onDeleteItem(item.id)}
                  onConfirmDelete={() => props.onConfirmDeleteItem(item.id)}
                  onCancelDelete={props.onCancelDeleteItem}
                  onMoveUp={() => props.onMoveItemUp(item.id)}
                  onMoveDown={() => props.onMoveItemDown(item.id)}
                />
              ))}
            </div>
          )}

          {node.children.length === 0 && node.items.length === 0 && !isAddingChild && !isAddingItem && (
            <div className="py-3 px-3 flex flex-col items-center gap-2">
              <p className="text-xs" style={{ color: tokens.text.quaternary }}>Vide</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => props.onSetAddingChildOf(cat.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>+ Sous-categorie</button>
                <button onClick={() => props.onSetAddingItem(cat.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>+ Item</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDepthStyles(depth: number, tokens: ReturnType<typeof useThemeTokens>, color: string | null) {
  if (depth === 0) {
    return {
      container: 'rounded-xl overflow-hidden',
      containerStyle: {
        border: `1px solid ${color ? `${color}40` : tokens.surface.border}`,
        borderLeft: color ? `4px solid ${color}` : undefined,
        background: tokens.surface.primary,
      },
      header: 'px-3 sm:px-4 py-2.5 sm:py-3',
      headerStyle: { background: color ? `${color}06` : tokens.surface.secondary },
      titleClass: 'text-sm font-semibold',
      titleColor: tokens.text.primary,
    };
  }
  if (depth === 1) {
    return {
      container: 'rounded-lg overflow-hidden',
      containerStyle: {
        border: `1px solid ${color ? `${color}30` : tokens.surface.border}`,
        borderLeft: color ? `3px solid ${color}` : `3px solid ${tokens.surface.border}`,
        background: tokens.surface.primary,
      },
      header: 'px-3 py-2',
      headerStyle: { background: tokens.surface.primary },
      titleClass: 'text-xs font-semibold',
      titleColor: tokens.text.secondary,
    };
  }
  return {
    container: 'rounded-md overflow-hidden',
    containerStyle: {
      border: `1px solid ${tokens.surface.border}`,
      borderLeft: color ? `2px solid ${color}` : `2px solid ${tokens.surface.border}`,
    },
    header: 'px-2.5 py-1.5',
    headerStyle: { background: tokens.surface.primary },
    titleClass: 'text-xs font-medium',
    titleColor: tokens.text.tertiary,
  };
}
