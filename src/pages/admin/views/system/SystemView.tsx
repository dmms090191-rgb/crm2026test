import { useState, useMemo } from 'react';
import { Plus, Check, X, Settings2, BarChart3, ChevronsDown, ChevronsUp, RotateCcw, Search } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useSystemActions } from './useSystemActions';
import type { SystemItem, SystemCategory, SystemStatus } from './types';
import { buildTree } from './types';
import SystemSummaryBar from './components/SystemSummaryBar';
import SystemCategoryNode from './components/SystemCategoryNode';
import SystemStatusModal from './components/SystemStatusModal';

export type { SystemItem, SystemCategory, SystemStatus };

interface Props {
  items: SystemItem[];
  categories: SystemCategory[];
  statuses: SystemStatus[];
  onItemsChange: (items: SystemItem[]) => void;
  onCategoriesChange: (categories: SystemCategory[]) => void;
  onStatusesChange: (statuses: SystemStatus[]) => void;
}

export default function SystemView({ items, categories, statuses, onItemsChange, onCategoriesChange, onStatusesChange }: Props) {
  const tokens = useThemeTokens();
  const [openNodes, setOpenNodes] = useState<Set<string>>(() => new Set());
  const [addingRootCat, setAddingRootCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [childCatName, setChildCatName] = useState('');
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [colorPickerCatId, setColorPickerCatId] = useState<string | null>(null);
  const [addingItemToCat, setAddingItemToCat] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const actions = useSystemActions({ items, categories, statuses, onItemsChange, onCategoriesChange, onStatusesChange });
  const tree = buildTree(categories, items);
  const activeStatuses = statuses.filter((s) => s.is_active).sort((a, b) => a.position - b.position);

  const allCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const toggleNode = (id: string) => {
    setOpenNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenNodes(new Set(allCategoryIds));
  const collapseAll = () => setOpenNodes(new Set());

  const handleCreateRootCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const newId = await actions.handleCreateCategory(name, null);
    if (newId) setOpenNodes((prev) => new Set([...prev, newId]));
    setNewCatName('');
    setAddingRootCat(false);
  };

  const handleCreateChildCategory = async (parentId: string) => {
    const name = childCatName.trim();
    if (!name) return;
    const newId = await actions.handleCreateCategory(name, parentId);
    if (newId) setOpenNodes((prev) => new Set([...prev, parentId, newId]));
    setChildCatName('');
    setAddingChildOf(null);
  };

  const handleRename = async (id: string) => {
    const name = renameDraft.trim();
    if (!name) return;
    await actions.handleRenameCategory(id, name);
    setRenamingCatId(null);
    setRenameDraft('');
  };

  const handleCreateItem = async (catId: string) => {
    const title = newItemTitle.trim();
    if (!title) return;
    await actions.handleCreateItem(title, catId);
    setNewItemTitle('');
    setAddingItemToCat(null);
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    return filterTree(tree, q);
  }, [tree, searchQuery]);

  return (
    <div className="flex flex-col flex-1">
      {/* Summary */}
      <SystemSummaryBar items={items} statuses={activeStatuses} tokens={tokens} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mt-4 mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 mr-auto">
          <BarChart3 className="w-4 h-4 hidden sm:block" style={{ color: tokens.accent.text }} />
          <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>Suivi Fonctionnel</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto order-last sm:order-none mt-2 sm:mt-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full sm:w-[200px] pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={expandAll} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }} title="Tout deplier">
            <ChevronsDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deplier</span>
          </button>
          <button onClick={collapseAll} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }} title="Tout replier">
            <ChevronsUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Replier</span>
          </button>
          <button onClick={actions.handleResetHistory} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }} title="Reset historique">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button onClick={() => setStatusModalOpen(true)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }} title="Gerer les statuts">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Statuts</span>
          </button>
          {addingRootCat ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRootCategory(); if (e.key === 'Escape') { setAddingRootCat(false); setNewCatName(''); } }}
                placeholder="Nom..."
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none w-[140px] sm:w-[180px]"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                autoFocus
              />
              <button onClick={handleCreateRootCategory} className="p-1.5 rounded-md" style={{ color: tokens.success.text }}>
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setAddingRootCat(false); setNewCatName(''); }} className="p-1.5 rounded-md" style={{ color: tokens.text.tertiary }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingRootCat(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Grande categorie</span>
              <span className="xs:hidden">Categorie</span>
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-3 pb-4">
        {filteredTree.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune categorie.</p>
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>Cliquez sur "Grande categorie" pour commencer.</p>
          </div>
        )}
        {filteredTree.length === 0 && searchQuery && (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: tokens.text.quaternary }}>
            Aucun resultat pour "{searchQuery}"
          </div>
        )}

        {filteredTree.map((node) => (
          <SystemCategoryNode
            key={node.category.id}
            node={node}
            depth={0}
            openNodes={openNodes}
            toggleNode={toggleNode}
            addingChildOf={addingChildOf}
            childCatName={childCatName}
            renamingCatId={renamingCatId}
            renameDraft={renameDraft}
            confirmDeleteCatId={actions.confirmDeleteCatId}
            confirmDeleteId={actions.confirmDeleteId}
            tokens={tokens}
            statuses={activeStatuses}
            addingItemToCat={addingItemToCat}
            newItemTitle={newItemTitle}
            onSetAddingChildOf={(id) => { setAddingChildOf(id); setChildCatName(''); }}
            onChildCatNameChange={setChildCatName}
            onCreateChild={handleCreateChildCategory}
            onCancelAddChild={() => { setAddingChildOf(null); setChildCatName(''); }}
            onStartRename={(id, name) => { setRenamingCatId(id); setRenameDraft(name); }}
            onRenameDraftChange={setRenameDraft}
            onConfirmRename={handleRename}
            onCancelRename={() => { setRenamingCatId(null); setRenameDraft(''); }}
            onConfirmDeleteCat={actions.setConfirmDeleteCatId}
            onDeleteCat={actions.handleDeleteCategory}
            onCancelDeleteCat={() => actions.setConfirmDeleteCatId(null)}
            onMoveCatUp={actions.handleMoveCategoryUp}
            onMoveCatDown={actions.handleMoveCategoryDown}
            onSetAddingItem={(id) => { setAddingItemToCat(id); setNewItemTitle(''); }}
            onNewItemTitleChange={setNewItemTitle}
            onCreateItem={handleCreateItem}
            onCancelAddItem={() => { setAddingItemToCat(null); setNewItemTitle(''); }}
            onSetItemStatus={actions.handleSetItemStatus}
            onDeleteItem={actions.handleDeleteItem}
            onConfirmDeleteItem={actions.setConfirmDeleteId}
            onCancelDeleteItem={() => actions.setConfirmDeleteId(null)}
            onMoveItemUp={actions.handleMoveItemUp}
            onMoveItemDown={actions.handleMoveItemDown}
            colorPickerCatId={colorPickerCatId}
            onOpenColorPicker={setColorPickerCatId}
            onSetColor={actions.handleSetCategoryColor}
          />
        ))}
      </div>

      {statusModalOpen && (
        <SystemStatusModal
          statuses={statuses}
          tokens={tokens}
          onCreateStatus={actions.handleCreateStatus}
          onUpdateStatus={actions.handleUpdateStatus}
          onDeleteStatus={actions.handleDeleteStatus}
          onClose={() => setStatusModalOpen(false)}
        />
      )}
    </div>
  );
}

function filterTree(nodes: import('./types').SystemTreeNode[], query: string): import('./types').SystemTreeNode[] {
  const result: import('./types').SystemTreeNode[] = [];
  for (const node of nodes) {
    const catMatch = node.category.name.toLowerCase().includes(query);
    const matchedItems = node.items.filter((i) => i.title.toLowerCase().includes(query));
    const filteredChildren = filterTree(node.children, query);
    if (catMatch || matchedItems.length > 0 || filteredChildren.length > 0) {
      result.push({
        category: node.category,
        children: filteredChildren.length > 0 ? filteredChildren : (catMatch ? node.children : []),
        items: matchedItems.length > 0 ? matchedItems : (catMatch ? node.items : []),
      });
    }
  }
  return result;
}
