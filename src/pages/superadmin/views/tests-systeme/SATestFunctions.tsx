import { useState, useCallback } from 'react';
import { Blocks, Plus, FolderPlus } from 'lucide-react';
import SATestFunctionModal, { type TestFunction, type TestFunctionCategory } from './SATestFunctionModal';
import SATestCategoryModal from './SATestCategoryModal';
import SATestFunctionMoveModal from './SATestFunctionMoveModal';
import SATestFunctionAccordion from './SATestFunctionAccordion';

const STORAGE_KEY = 'crm_test_functions';
const CATEGORIES_KEY = 'crm_test_function_categories';
const AUTRES_ID = '__autres__';

const DEFAULT_FUNCTIONS: TestFunction[] = [
  {
    id: 'default-connect-super-admin',
    name: 'connectSuperAdmin()',
    description: "Connecte automatiquement le Super Admin au CRM depuis la page d'accueil.",
    components: "1. Page d'accueil\n2. Bouton Connexion\n3. Modal Connexion\n4. Champ email Super Admin\n5. Cases PIN / mot de passe\n6. Bouton Valider\n7. Verification du dashboard Super Admin",
    categoryId: AUTRES_ID,
    order: 0,
  },
  {
    id: 'default-connect-admin',
    name: 'connectAdmin()',
    description: "Connecte automatiquement un Admin au CRM depuis la page d'accueil.",
    components: "1. Page d'accueil\n2. Bouton Connexion\n3. Modal Connexion\n4. Champ email Admin\n5. Cases PIN / mot de passe\n6. Bouton Valider\n7. Verification du panel Admin",
    categoryId: AUTRES_ID,
    order: 1,
  },
  {
    id: 'default-connect-client',
    name: 'connectClient()',
    description: "Connecte automatiquement un Client au CRM depuis la page d'accueil.",
    components: "1. Page d'accueil\n2. Bouton Connexion\n3. Modal Connexion\n4. Champ email Client\n5. Cases PIN / mot de passe\n6. Bouton Valider\n7. Verification du panel Client",
    categoryId: AUTRES_ID,
    order: 2,
  },
  {
    id: 'default-connect-vendor',
    name: 'connectVendor()',
    description: "Connecte automatiquement un Vendeur au CRM depuis la page d'accueil.",
    components: "1. Page d'accueil\n2. Bouton Connexion\n3. Modal Connexion\n4. Champ email Vendeur\n5. Cases PIN / mot de passe\n6. Bouton Valider\n7. Verification du dashboard Vendeur",
    categoryId: AUTRES_ID,
    order: 3,
  },
  {
    id: 'default-go-to-liste-admins',
    name: 'goToListeAdmins()',
    description: "Va dans l'onglet Liste admins depuis le panel Super Admin.",
    components: "1. Menu lateral Super Admin\n2. Onglet Liste admins\n3. Verification que la page Liste admins est affichee",
    categoryId: AUTRES_ID,
    order: 4,
  },
  {
    id: 'default-open-admin-detail',
    name: 'openAdminDetail()',
    description: "Clique sur le bouton Detail d'un admin et verifie que le modal de detail s'ouvre.",
    components: "1. Tableau Liste admins\n2. Ligne admin ciblee\n3. Bouton Detail\n4. Modal detail admin\n5. Onglet Informations si necessaire",
    categoryId: AUTRES_ID,
    order: 5,
  },
];

function loadCategories(): TestFunctionCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TestFunctionCategory[];
  } catch {
    return [];
  }
}

function saveCategories(items: TestFunctionCategory[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(items));
}

function loadFunctions(categories: TestFunctionCategory[]): TestFunction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FUNCTIONS));
      return DEFAULT_FUNCTIONS;
    }
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item, idx) => {
      let categoryId = (item.categoryId as string) || '';
      if (!categoryId || (!categories.find(c => c.id === categoryId) && categoryId !== AUTRES_ID)) {
        categoryId = AUTRES_ID;
      }
      return {
        id: (item.id as string) || crypto.randomUUID(),
        name: (item.name as string) || '',
        description: (item.description as string) || '',
        components: (item.components as string) || '',
        categoryId,
        order: typeof item.order === 'number' ? (item.order as number) : idx,
      };
    });
  } catch {
    return DEFAULT_FUNCTIONS;
  }
}

function saveFunctions(items: TestFunction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function sortedByCategoryOrder(items: TestFunction[], categoryId: string): TestFunction[] {
  return items.filter(f => f.categoryId === categoryId).sort((a, b) => a.order - b.order);
}

function SATestFunctions() {
  const [categories, setCategories] = useState<TestFunctionCategory[]>(loadCategories);
  const [items, setItems] = useState<TestFunction[]>(() => loadFunctions(categories));
  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<TestFunction | null>(null);
  const [editingCategory, setEditingCategory] = useState<TestFunctionCategory | null>(null);
  const [movingItem, setMovingItem] = useState<TestFunction | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([...categories.map(c => c.id), AUTRES_ID]));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const orphanItems = sortedByCategoryOrder(items, AUTRES_ID);
  const hasOrphans = orphanItems.length > 0;

  const categoriesForModals: TestFunctionCategory[] = hasOrphans
    ? [...categories, { id: AUTRES_ID, name: 'Sans categorie' }]
    : categories;

  const handleSaveFunction = useCallback((entry: TestFunction) => {
    setItems(prev => {
      const exists = prev.findIndex(f => f.id === entry.id);
      const next = exists >= 0 ? prev.map(f => (f.id === entry.id ? entry : f)) : [...prev, entry];
      saveFunctions(next);
      return next;
    });
    setEditingFunction(null);
  }, []);

  const handleDeleteFunction = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFunctions(next);
      return next;
    });
  }, []);

  const handleMoveToCategory = useCallback((itemId: string, targetCategoryId: string) => {
    setItems(prev => {
      const targetItems = prev.filter(f => f.categoryId === targetCategoryId);
      const maxOrder = targetItems.length > 0 ? Math.max(...targetItems.map(f => f.order)) + 1 : 0;
      const next = prev.map(f => f.id === itemId ? { ...f, categoryId: targetCategoryId, order: maxOrder } : f);
      saveFunctions(next);
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
      saveFunctions(next);
      return next;
    });
  }, []);

  const handleSaveCategory = useCallback((entry: TestFunctionCategory) => {
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
      saveFunctions(next);
      return next;
    });
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Blocks className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Fonctions reutilisables</h2>
            <p className="text-[11px] text-slate-400">{items.length} fonction{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}>
            <FolderPlus className="w-3.5 h-3.5" />
            Creer une categorie
          </button>
          <button onClick={() => { setEditingFunction(null); setFunctionModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}>
            <Plus className="w-3.5 h-3.5" />
            Ajouter une fonction
          </button>
        </div>
      </div>

      {items.length === 0 && categories.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}>
          <p className="text-xs text-slate-500">Aucune fonction enregistree.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <SATestFunctionAccordion
              key={cat.id}
              cat={cat}
              catItems={sortedByCategoryOrder(items, cat.id)}
              isOpen={openCategories.has(cat.id)}
              expandedIds={expandedIds}
              isDeletable={true}
              onToggle={() => toggleCategory(cat.id)}
              onToggleExpand={toggleExpand}
              onEdit={() => { setEditingCategory(cat); setCategoryModalOpen(true); }}
              onDelete={() => handleDeleteCategory(cat.id)}
              onEditItem={item => { setEditingFunction(item); setFunctionModalOpen(true); }}
              onDeleteItem={handleDeleteFunction}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          ))}

          {hasOrphans && (
            <SATestFunctionAccordion
              cat={{ id: AUTRES_ID, name: 'Sans categorie' }}
              catItems={orphanItems}
              isOpen={openCategories.has(AUTRES_ID)}
              expandedIds={expandedIds}
              isDeletable={false}
              onToggle={() => toggleCategory(AUTRES_ID)}
              onToggleExpand={toggleExpand}
              onEdit={() => {}}
              onDelete={() => {}}
              onEditItem={item => { setEditingFunction(item); setFunctionModalOpen(true); }}
              onDeleteItem={handleDeleteFunction}
              onMoveItem={item => { setMovingItem(item); setMoveModalOpen(true); }}
              onReorder={handleReorder}
            />
          )}
        </div>
      )}

      <SATestFunctionModal open={functionModalOpen} initial={editingFunction} categories={categoriesForModals} onSave={handleSaveFunction} onClose={() => setFunctionModalOpen(false)} />
      <SATestCategoryModal open={categoryModalOpen} initial={editingCategory} onSave={handleSaveCategory} onClose={() => setCategoryModalOpen(false)} />
      <SATestFunctionMoveModal open={moveModalOpen} item={movingItem} categories={categoriesForModals} onMove={handleMoveToCategory} onClose={() => setMoveModalOpen(false)} />
    </div>
  );
}

export default SATestFunctions;
