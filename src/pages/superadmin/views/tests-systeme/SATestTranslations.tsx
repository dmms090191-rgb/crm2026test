import { useState, useCallback } from 'react';
import { Languages, Plus, FolderPlus } from 'lucide-react';
import SATestTranslationModal, { type TestTranslation, type TestCategoryItem } from './SATestTranslationModal';
import SATestCategoryModal from './SATestCategoryModal';
import SATestMoveModal from './SATestMoveModal';
import SATestTranslationAccordion from './SATestTranslationAccordion';

const TRANSLATIONS_KEY = 'crm_test_translations';
const CATEGORIES_KEY = 'crm_test_categories';
const AUTRES_ID = '__autres__';

function loadCategories(): TestCategoryItem[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TestCategoryItem[];
  } catch {
    return [];
  }
}

function saveCategories(items: TestCategoryItem[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(items));
}

function loadTranslations(categories: TestCategoryItem[]): TestTranslation[] {
  try {
    const raw = localStorage.getItem(TRANSLATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item, idx) => {
      let categoryId = (item.categoryId as string) || '';
      if (!categoryId && item.category) {
        const match = categories.find(c => c.name === item.category);
        categoryId = match?.id || AUTRES_ID;
      }
      if (!categoryId || (!categories.find(c => c.id === categoryId) && categoryId !== AUTRES_ID)) {
        categoryId = AUTRES_ID;
      }
      return {
        id: (item.id as string) || crypto.randomUUID(),
        testName: (item.testName as string) || '',
        description: (item.description as string) || '',
        steps: (item.steps as string) || '',
        categoryId,
        order: typeof item.order === 'number' ? (item.order as number) : idx,
      };
    });
  } catch {
    return [];
  }
}

function saveTranslations(items: TestTranslation[]) {
  localStorage.setItem(TRANSLATIONS_KEY, JSON.stringify(items));
}

function sortedByCategoryOrder(items: TestTranslation[], categoryId: string): TestTranslation[] {
  return items.filter(t => t.categoryId === categoryId).sort((a, b) => a.order - b.order);
}

function SATestTranslations() {
  const [categories, setCategories] = useState<TestCategoryItem[]>(loadCategories);
  const [items, setItems] = useState<TestTranslation[]>(() => loadTranslations(categories));
  const [translationModalOpen, setTranslationModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<TestTranslation | null>(null);
  const [editingCategory, setEditingCategory] = useState<TestCategoryItem | null>(null);
  const [movingItem, setMovingItem] = useState<TestTranslation | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([...categories.map(c => c.id), AUTRES_ID]));
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const orphanItems = sortedByCategoryOrder(items, AUTRES_ID);
  const hasOrphans = orphanItems.length > 0;

  const categoriesForModals: TestCategoryItem[] = hasOrphans
    ? [...categories, { id: AUTRES_ID, name: 'Sans categorie' }]
    : categories;

  const handleSaveTranslation = useCallback((entry: TestTranslation) => {
    setItems(prev => {
      const exists = prev.findIndex(t => t.id === entry.id);
      const next = exists >= 0 ? prev.map(t => (t.id === entry.id ? entry : t)) : [...prev, entry];
      saveTranslations(next);
      return next;
    });
    setEditingTranslation(null);
  }, []);

  const handleDeleteTranslation = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTranslations(next);
      return next;
    });
  }, []);

  const handleMoveToCategory = useCallback((itemId: string, targetCategoryId: string) => {
    setItems(prev => {
      const targetItems = prev.filter(t => t.categoryId === targetCategoryId);
      const maxOrder = targetItems.length > 0 ? Math.max(...targetItems.map(t => t.order)) + 1 : 0;
      const next = prev.map(t => t.id === itemId ? { ...t, categoryId: targetCategoryId, order: maxOrder } : t);
      saveTranslations(next);
      return next;
    });
  }, []);

  const handleReorder = useCallback((itemId: string, direction: 'up' | 'down') => {
    setItems(prev => {
      const item = prev.find(t => t.id === itemId);
      if (!item) return prev;
      const catItems = sortedByCategoryOrder(prev, item.categoryId);
      const idx = catItems.findIndex(t => t.id === itemId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= catItems.length) return prev;
      const swapItem = catItems[swapIdx];
      const next = prev.map(t => {
        if (t.id === item.id) return { ...t, order: swapItem.order };
        if (t.id === swapItem.id) return { ...t, order: item.order };
        return t;
      });
      saveTranslations(next);
      return next;
    });
  }, []);

  const handleSaveCategory = useCallback((entry: TestCategoryItem) => {
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
      const next = prev.map(t => t.categoryId === catId ? { ...t, categoryId: AUTRES_ID } : t);
      saveTranslations(next);
      return next;
    });
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSteps = (id: string) => {
    setExpandedSteps(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Languages className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Traductions des tests</h2>
            <p className="text-[11px] text-slate-400">{items.length} traduction{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}>
            <FolderPlus className="w-3.5 h-3.5" />
            Creer une categorie
          </button>
          <button onClick={() => { setEditingTranslation(null); setTranslationModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}>
            <Plus className="w-3.5 h-3.5" />
            Traduction test
          </button>
        </div>
      </div>

      {items.length === 0 && categories.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}>
          <p className="text-xs text-slate-500">Aucune traduction enregistree.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <SATestTranslationAccordion
              key={cat.id}
              cat={cat}
              catItems={sortedByCategoryOrder(items, cat.id)}
              isOpen={openCategories.has(cat.id)}
              expandedSteps={expandedSteps}
              isDeletable={true}
              onToggle={() => toggleCategory(cat.id)}
              onToggleSteps={toggleSteps}
              onEdit={() => { setEditingCategory(cat); setCategoryModalOpen(true); }}
              onDelete={() => handleDeleteCategory(cat.id)}
              onEditItem={item => { setEditingTranslation(item); setTranslationModalOpen(true); }}
              onDeleteItem={handleDeleteTranslation}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          ))}

          {hasOrphans && (
            <SATestTranslationAccordion
              cat={{ id: AUTRES_ID, name: 'Sans categorie' }}
              catItems={orphanItems}
              isOpen={openCategories.has(AUTRES_ID)}
              expandedSteps={expandedSteps}
              isDeletable={false}
              onToggle={() => toggleCategory(AUTRES_ID)}
              onToggleSteps={toggleSteps}
              onEdit={() => {}}
              onDelete={() => {}}
              onEditItem={item => { setEditingTranslation(item); setTranslationModalOpen(true); }}
              onDeleteItem={handleDeleteTranslation}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          )}
        </div>
      )}

      <SATestTranslationModal open={translationModalOpen} initial={editingTranslation} categories={categoriesForModals} onSave={handleSaveTranslation} onClose={() => setTranslationModalOpen(false)} />
      <SATestCategoryModal open={categoryModalOpen} initial={editingCategory} onSave={handleSaveCategory} onClose={() => setCategoryModalOpen(false)} />
      <SATestMoveModal open={moveModalOpen} item={movingItem} categories={categoriesForModals} onMove={handleMoveToCategory} onClose={() => setMoveModalOpen(false)} />
    </div>
  );
}


export default SATestTranslations