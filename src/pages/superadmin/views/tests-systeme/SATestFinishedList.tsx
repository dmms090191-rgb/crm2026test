import { useState, useCallback } from 'react';
import { Plus, FolderPlus, Layers, FlaskConical } from 'lucide-react';
import SATestFinishedModal, { type FinishedTest, type FinishedSubcategory, type FinishedCategory } from './SATestFinishedModal';
import SATestFinishedSubcategoryModal from './SATestFinishedSubcategoryModal';
import SATestCategoryModal from './SATestCategoryModal';
import SATestFinishedCategoryBlock from './SATestFinishedCategory';

const TESTS_KEY = 'crm_finished_tests';
const SUBCATS_KEY = 'crm_finished_tests_subcategories';
const CATS_KEY = 'crm_finished_tests_categories';

function load<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

export default function SATestFinishedList() {
  const [categories, setCategories] = useState<FinishedCategory[]>(() => load(CATS_KEY));
  const [subcategories, setSubcategories] = useState<FinishedSubcategory[]>(() => load(SUBCATS_KEY));
  const [tests, setTests] = useState<FinishedTest[]>(() => load(TESTS_KEY));

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FinishedCategory | null>(null);

  const [subcatModalOpen, setSubcatModalOpen] = useState(false);
  const [editingSubcat, setEditingSubcat] = useState<FinishedSubcategory | null>(null);
  const [subcatParentId, setSubcatParentId] = useState('');

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<FinishedTest | null>(null);
  const [testSubcatId, setTestSubcatId] = useState('');

  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(categories.map(c => c.id)));
  const [openSubcats, setOpenSubcats] = useState<Set<string>>(() => new Set(subcategories.map(s => s.id)));

  const toggleCat = (id: string) => setOpenCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSubcat = (id: string) => setOpenSubcats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSaveCat = useCallback((entry: FinishedCategory) => {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === entry.id);
      const next = idx >= 0 ? prev.map(c => c.id === entry.id ? entry : c) : [...prev, entry];
      save(CATS_KEY, next);
      setOpenCats(s => new Set([...s, entry.id]));
      return next;
    });
    setEditingCat(null);
  }, []);

  const handleDeleteCat = useCallback((id: string) => {
    const subIds = subcategories.filter(s => s.categoryId === id).map(s => s.id);
    setTests(prev => { const next = prev.filter(t => !subIds.includes(t.subcategoryId)); save(TESTS_KEY, next); return next; });
    setSubcategories(prev => { const next = prev.filter(s => s.categoryId !== id); save(SUBCATS_KEY, next); return next; });
    setCategories(prev => { const next = prev.filter(c => c.id !== id); save(CATS_KEY, next); return next; });
  }, [subcategories]);

  const handleSaveSubcat = useCallback((entry: FinishedSubcategory) => {
    setSubcategories(prev => {
      const idx = prev.findIndex(s => s.id === entry.id);
      const next = idx >= 0 ? prev.map(s => s.id === entry.id ? entry : s) : [...prev, entry];
      save(SUBCATS_KEY, next);
      setOpenSubcats(s => new Set([...s, entry.id]));
      return next;
    });
    setEditingSubcat(null);
  }, []);

  const handleDeleteSubcat = useCallback((id: string) => {
    setTests(prev => { const next = prev.filter(t => t.subcategoryId !== id); save(TESTS_KEY, next); return next; });
    setSubcategories(prev => { const next = prev.filter(s => s.id !== id); save(SUBCATS_KEY, next); return next; });
  }, []);

  const handleSaveTest = useCallback((entry: FinishedTest) => {
    setTests(prev => {
      const idx = prev.findIndex(t => t.id === entry.id);
      const next = idx >= 0 ? prev.map(t => t.id === entry.id ? entry : t) : [...prev, entry];
      save(TESTS_KEY, next);
      return next;
    });
    setEditingTest(null);
  }, []);

  const handleDeleteTest = useCallback((id: string) => {
    setTests(prev => { const next = prev.filter(t => t.id !== id); save(TESTS_KEY, next); return next; });
  }, []);

  const totalTests = tests.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <FlaskConical className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Liste des tests prets</h2>
            <p className="text-[11px] text-slate-400">{totalTests} test{totalTests !== 1 ? 's' : ''} valide{totalTests !== 1 ? 's' : ''} &middot; {categories.length} categorie{categories.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingCat(null); setCatModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{ background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Creer une categorie
          </button>
          <button
            onClick={() => { setEditingTest(null); setTestSubcatId(subcategories[0]?.id ?? ''); setTestModalOpen(true); }}
            disabled={subcategories.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un test fini
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(51,65,85,0.6)' }}>
          <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-500">Aucune categorie creee.</p>
          <p className="text-[11px] text-slate-600 mt-1">Cliquez sur "Creer une categorie" pour commencer a organiser vos tests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const catSubcats = subcategories.filter(s => s.categoryId === cat.id);
            const catTests = tests.filter(t => catSubcats.some(s => s.id === t.subcategoryId));
            const catOpen = openCats.has(cat.id);
            return (
              <SATestFinishedCategoryBlock
                key={cat.id}
                cat={cat}
                subcatCount={catSubcats.length}
                testCount={catTests.length}
                isOpen={catOpen}
                onToggle={() => toggleCat(cat.id)}
                onEdit={() => { setEditingCat(cat); setCatModalOpen(true); }}
                onDelete={() => handleDeleteCat(cat.id)}
                onAddSubcat={() => { setEditingSubcat(null); setSubcatParentId(cat.id); setSubcatModalOpen(true); }}
                subcategories={catSubcats}
                tests={tests}
                openSubcats={openSubcats}
                onToggleSubcat={toggleSubcat}
                onEditSubcat={s => { setEditingSubcat(s); setSubcatParentId(s.categoryId); setSubcatModalOpen(true); }}
                onDeleteSubcat={handleDeleteSubcat}
                onAddTest={(subId) => { setEditingTest(null); setTestSubcatId(subId); setTestModalOpen(true); }}
                onEditTest={t => { setEditingTest(t); setTestSubcatId(t.subcategoryId); setTestModalOpen(true); }}
                onDeleteTest={handleDeleteTest}
              />
            );
          })}
        </div>
      )}

      <SATestCategoryModal open={catModalOpen} initial={editingCat} onSave={handleSaveCat} onClose={() => setCatModalOpen(false)} />
      <SATestFinishedSubcategoryModal open={subcatModalOpen} initial={editingSubcat} categoryId={subcatParentId} onSave={handleSaveSubcat} onClose={() => setSubcatModalOpen(false)} />
      <SATestFinishedModal open={testModalOpen} initial={editingTest} subcategoryId={testSubcatId} categories={categories} subcategories={subcategories} onSave={handleSaveTest} onClose={() => setTestModalOpen(false)} />
    </div>
  );
}
