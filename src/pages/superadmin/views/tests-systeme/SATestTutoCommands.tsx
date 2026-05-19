import { useState, useCallback } from 'react';
import { BookOpen, Plus, FolderPlus } from 'lucide-react';
import SATestTutoModal, { type TestTuto, type TestTutoCategory } from './SATestTutoModal';
import SATestCategoryModal from './SATestCategoryModal';
import SATestTutoMoveModal from './SATestTutoMoveModal';
import SATestTutoAccordion from './SATestTutoAccordion';

const STORAGE_KEY = 'crm_test_tutos';
const CATEGORIES_KEY = 'crm_test_tuto_categories';
const AUTRES_ID = '__autres__';

function loadCategories(): TestTutoCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TestTutoCategory[];
  } catch {
    return [];
  }
}

function saveCategories(items: TestTutoCategory[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(items));
}

function loadTutos(categories: TestTutoCategory[]): TestTuto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item, idx) => {
      let categoryId = (item.categoryId as string) || '';
      if (!categoryId || (!categories.find(c => c.id === categoryId) && categoryId !== AUTRES_ID)) {
        categoryId = AUTRES_ID;
      }
      return {
        id: (item.id as string) || crypto.randomUUID(),
        title: (item.title as string) || '',
        steps: (item.steps as string) || '',
        categoryId,
        order: typeof item.order === 'number' ? (item.order as number) : idx,
      };
    });
  } catch {
    return [];
  }
}

function saveTutos(items: TestTuto[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function sortedByCategoryOrder(items: TestTuto[], categoryId: string): TestTuto[] {
  return items.filter(f => f.categoryId === categoryId).sort((a, b) => a.order - b.order);
}

export default function SATestTutoCommands() {
  const [categories, setCategories] = useState<TestTutoCategory[]>(loadCategories);
  const [items, setItems] = useState<TestTuto[]>(() => loadTutos(categories));
  const [tutoModalOpen, setTutoModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [editingTuto, setEditingTuto] = useState<TestTuto | null>(null);
  const [editingCategory, setEditingCategory] = useState<TestTutoCategory | null>(null);
  const [movingItem, setMovingItem] = useState<TestTuto | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([...categories.map(c => c.id), AUTRES_ID]));

  const orphanItems = sortedByCategoryOrder(items, AUTRES_ID);
  const hasOrphans = orphanItems.length > 0;

  const categoriesForModals: TestTutoCategory[] = [
    ...categories,
    { id: AUTRES_ID, name: 'Sans categorie' },
  ];

  const handleSaveTuto = useCallback((entry: TestTuto) => {
    setItems(prev => {
      const exists = prev.findIndex(f => f.id === entry.id);
      const next = exists >= 0 ? prev.map(f => (f.id === entry.id ? entry : f)) : [...prev, entry];
      saveTutos(next);
      return next;
    });
    setEditingTuto(null);
  }, []);

  const handleDeleteTuto = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(f => f.id !== id);
      saveTutos(next);
      return next;
    });
  }, []);

  const handleMoveToCategory = useCallback((itemId: string, targetCategoryId: string) => {
    setItems(prev => {
      const targetItems = prev.filter(f => f.categoryId === targetCategoryId);
      const maxOrder = targetItems.length > 0 ? Math.max(...targetItems.map(f => f.order)) + 1 : 0;
      const next = prev.map(f => f.id === itemId ? { ...f, categoryId: targetCategoryId, order: maxOrder } : f);
      saveTutos(next);
      return next;
    });
  }, []);

  const handleReorder = useCallback((itemId: string, direction: 'up' | 'down') => {
    setItems(prev => {
      const item = prev.find(f => f.id === itemId);
      if (!item) return prev;
      const catItems = sortedByCategoryOrder(prev, item.categoryId);
      const idx = catItems.findIndex(f => f.id === itemId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= catItems.length) return prev;
      const swapItem = catItems[swapIdx];
      const next = prev.map(f => {
        if (f.id === item.id) return { ...f, order: swapItem.order };
        if (f.id === swapItem.id) return { ...f, order: item.order };
        return f;
      });
      saveTutos(next);
      return next;
    });
  }, []);

  const handleSaveCategory = useCallback((entry: TestTutoCategory) => {
    setCategories(prev => {
      const exists = prev.findIndex(c => c.id === entry.id);
      const next = exists >= 0 ? prev.map(c => (c.id === entry.id ? entry : c)) : [...prev, entry];
      saveCategories(next);
      setOpenCategories(s => new Set([...s, entry.id]));
      return next;
    });
    setEditingCategory(null);
  }, []);

  const handleDeleteCategory = useCallback((catId: string) => {
    if (catId === AUTRES_ID) return;
    setCategories(prev => {
      const next = prev.filter(c => c.id !== catId);
      saveCategories(next);
      return next;
    });
    setItems(prev => {
      const next = prev.map(f => f.categoryId === catId ? { ...f, categoryId: AUTRES_ID } : f);
      saveTutos(next);
      return next;
    });
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Tuto commande</h2>
            <p className="text-[11px] text-slate-400">{items.length} tuto{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}>
            <FolderPlus className="w-3.5 h-3.5" />
            Creer une categorie
          </button>
          <button onClick={() => { setEditingTuto(null); setTutoModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}>
            <Plus className="w-3.5 h-3.5" />
            Ajouter un tuto
          </button>
        </div>
      </div>

      {items.length === 0 && categories.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}>
          <p className="text-xs text-slate-500">Aucun tuto enregistre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <SATestTutoAccordion
              key={cat.id}
              cat={cat}
              catItems={sortedByCategoryOrder(items, cat.id)}
              isOpen={openCategories.has(cat.id)}
              isDeletable={true}
              onToggle={() => toggleCategory(cat.id)}
              onEdit={() => { setEditingCategory(cat); setCategoryModalOpen(true); }}
              onDelete={() => handleDeleteCategory(cat.id)}
              onEditItem={item => { setEditingTuto(item); setTutoModalOpen(true); }}
              onDeleteItem={handleDeleteTuto}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          ))}

          {hasOrphans && (
            <SATestTutoAccordion
              cat={{ id: AUTRES_ID, name: 'Sans categorie' }}
              catItems={orphanItems}
              isOpen={openCategories.has(AUTRES_ID)}
              isDeletable={false}
              onToggle={() => toggleCategory(AUTRES_ID)}
              onEdit={() => {}}
              onDelete={() => {}}
              onEditItem={item => { setEditingTuto(item); setTutoModalOpen(true); }}
              onDeleteItem={handleDeleteTuto}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          )}
        </div>
      )}

      <SATestTutoModal open={tutoModalOpen} initial={editingTuto} categories={categoriesForModals} onSave={handleSaveTuto} onClose={() => setTutoModalOpen(false)} />
      <SATestCategoryModal open={categoryModalOpen} initial={editingCategory} onSave={handleSaveCategory} onClose={() => setCategoryModalOpen(false)} />
      <SATestTutoMoveModal open={moveModalOpen} item={movingItem} categories={categoriesForModals} onMove={handleMoveToCategory} onClose={() => setMoveModalOpen(false)} />
    </div>
  );
}
