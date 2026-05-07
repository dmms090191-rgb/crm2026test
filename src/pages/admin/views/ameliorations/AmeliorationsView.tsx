import { useState } from 'react';
import { Plus, TrendingUp, Check, X, ChevronRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useAmeliorationActions } from './useAmeliorationActions';
import AmeliorationModal from './AmeliorationModal';
import AmeliorationRow from './AmeliorationRow';
import CategoryAccordion from './CategoryAccordion';
import type { Amelioration, AmeliorationCategory } from './types';

export type { Amelioration, AmeliorationCategory };

interface Props {
  ameliorations: Amelioration[];
  categories: AmeliorationCategory[];
  onAmeliorationsChange: (ameliorations: Amelioration[]) => void;
  onCategoriesChange: (categories: AmeliorationCategory[]) => void;
}

export default function AmeliorationsView({ ameliorations, categories, onAmeliorationsChange, onCategoriesChange }: Props) {
  const tokens = useThemeTokens();
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const actions = useAmeliorationActions({ ameliorations, categories, onAmeliorationsChange, onCategoriesChange });

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const newId = await actions.handleCreateCategory(name);
    if (newId) setOpenAccordions((prev) => new Set([...prev, newId]));
    setNewCatName('');
    setAddingCategory(false);
  };

  const handleRenameCategory = async (id: string) => {
    const name = renameDraft.trim();
    if (!name) return;
    await actions.handleRenameCategory(id, name);
    setRenamingCatId(null);
    setRenameDraft('');
  };

  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);
  const uncategorized = ameliorations.filter((a) => !a.category_id).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: tokens.accent.text }} />
          <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>Améliorations</h2>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
            {ameliorations.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {addingCategory ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); if (e.key === 'Escape') { setAddingCategory(false); setNewCatName(''); } }}
                placeholder="Nom de la catégorie..."
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, width: '180px' }}
                autoFocus
              />
              <button onClick={handleCreateCategory} className="p-1.5 rounded-md" style={{ color: tokens.success.text }}>
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setAddingCategory(false); setNewCatName(''); }} className="p-1.5 rounded-md" style={{ color: tokens.text.tertiary }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
            >
              <Plus className="w-3.5 h-3.5" />
              Créer une catégorie
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {sortedCategories.length === 0 && uncategorized.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: tokens.text.quaternary }}>
            Aucune catégorie créée. Cliquez sur "Créer une catégorie" pour commencer.
          </div>
        )}

        {sortedCategories.map((cat) => {
          const items = actions.reorderingCatId === cat.id ? actions.reorderItems : actions.getItemsForCategory(cat.id);
          return (
            <CategoryAccordion
              key={cat.id}
              cat={cat}
              items={items}
              isOpen={openAccordions.has(cat.id)}
              isReordering={actions.reorderingCatId === cat.id}
              renamingCatId={renamingCatId}
              renameDraft={renameDraft}
              confirmDeleteCatId={actions.confirmDeleteCatId}
              confirmDeleteId={actions.confirmDeleteId}
              movedId={actions.movedId}
              dragIndex={actions.dragIndex}
              dragOverIndex={actions.dragOverIndex}
              categories={categories}
              tokens={tokens}
              onToggle={() => toggleAccordion(cat.id)}
              onStartRename={() => { setRenamingCatId(cat.id); setRenameDraft(cat.name); }}
              onRenameDraftChange={setRenameDraft}
              onConfirmRename={() => handleRenameCategory(cat.id)}
              onCancelRename={() => { setRenamingCatId(null); setRenameDraft(''); }}
              onConfirmDeleteCat={() => actions.setConfirmDeleteCatId(cat.id)}
              onDeleteCat={() => actions.handleDeleteCategory(cat.id)}
              onCancelDeleteCat={() => actions.setConfirmDeleteCatId(null)}
              onStartReorder={() => actions.startReorder(cat.id)}
              onCancelReorder={actions.cancelReorder}
              onSaveOrder={actions.handleSaveOrder}
              onAddAmelioration={() => actions.openModal(cat.id)}
              onMoveUp={actions.handleMoveUp}
              onMoveDown={actions.handleMoveDown}
              onDragStart={actions.handleDragStart}
              onDragOver={actions.handleDragOver}
              onDragDrop={actions.handleDragDrop}
              onDragEnd={actions.handleDragEnd}
              onEditItem={(item) => actions.openModal(item.category_id, item)}
              onDeleteItem={actions.handleDeleteAmelioration}
              onConfirmDeleteItem={actions.setConfirmDeleteId}
              onCancelDeleteItem={() => actions.setConfirmDeleteId(null)}
              onTransfer={actions.handleTransfer}
            />
          );
        })}

        {uncategorized.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.surface.border}` }}>
            <div
              className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none transition-colors"
              style={{ background: tokens.surface.secondary }}
              onClick={() => toggleAccordion('__uncategorized__')}
            >
              <ChevronRight
                className="w-4 h-4 transition-transform duration-200"
                style={{ color: tokens.text.tertiary, transform: openAccordions.has('__uncategorized__') ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
              <span className="text-sm font-medium italic" style={{ color: tokens.text.tertiary }}>Non classées</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: tokens.warning.bg, color: tokens.warning.text, border: `1px solid ${tokens.warning.border}` }}>
                {uncategorized.length}
              </span>
            </div>
            {openAccordions.has('__uncategorized__') && (
              <div className="px-4 py-3 space-y-1.5" style={{ background: tokens.surface.primary, borderTop: `1px solid ${tokens.surface.border}` }}>
                {uncategorized.map((item, idx) => (
                  <AmeliorationRow
                    key={item.id}
                    item={item}
                    index={idx}
                    tokens={tokens}
                    confirmDeleteId={actions.confirmDeleteId}
                    isReordering={false}
                    isFirst={idx === 0}
                    isLast={idx === uncategorized.length - 1}
                    isMoved={false}
                    categories={categories}
                    onMoveUp={() => {}}
                    onMoveDown={() => {}}
                    onEdit={() => actions.openModal(item.category_id, item)}
                    onDelete={() => actions.handleDeleteAmelioration(item.id)}
                    onConfirmDelete={() => actions.setConfirmDeleteId(item.id)}
                    onCancelDelete={() => actions.setConfirmDeleteId(null)}
                    onTransfer={(targetCatId) => actions.handleTransfer(item.id, targetCatId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {actions.modalOpen && (
        <AmeliorationModal
          initial={actions.editingItem}
          categories={categories}
          onSave={actions.handleSaveAmelioration}
          onClose={actions.closeModal}
        />
      )}
    </div>
  );
}
