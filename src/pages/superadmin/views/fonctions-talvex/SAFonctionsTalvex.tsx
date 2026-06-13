import { useState, useCallback, useMemo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { TalvexFonction, TalvexCategorie, FonctionEtat } from './fonctionsTalvexTypes';
import { SEED_CATEGORIES, SEED_FONCTIONS } from './fonctionsTalvexSeed';
import { LS_KEY_CAT, LS_KEY_FN, loadState, saveState } from './fonctionsTalvexStorage';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import SAFonctionsTalvexHeader from './SAFonctionsTalvexHeader';
import FonctionCategoryList from './FonctionCategoryList';
import FonctionCard from './FonctionCard';
import FonctionDetailPanel from './FonctionDetailPanel';
import FonctionFormPanel from './FonctionFormPanel';
import FonctionListHeader from './FonctionListHeader';
import CategoryFormModal from './CategoryFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';

type RightPanel = { mode: 'closed' } | { mode: 'detail'; fnId: string } | { mode: 'add' } | { mode: 'edit'; fnId: string };

export default function SAFonctionsTalvex() {
  const t = useThemeTokens();
  const [categories, setCategories] = useState<TalvexCategorie[]>(() => loadState(LS_KEY_CAT, SEED_CATEGORIES));
  const [fonctions, setFonctions] = useState<TalvexFonction[]>(() => loadState(LS_KEY_FN, SEED_FONCTIONS));
  const [selectedCatId, setSelectedCatId] = useState<string | null>(categories[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [filterEtat, setFilterEtat] = useState<FonctionEtat | null>(null);

  const [rightPanel, setRightPanel] = useState<RightPanel>({ mode: 'closed' });
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<TalvexCategorie | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'fn' | 'cat'; id: string; label: string } | null>(null);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [catSelectMode, setCatSelectMode] = useState(false);
  const [catCheckedIds, setCatCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteCatsOpen, setBulkDeleteCatsOpen] = useState(false);

  const persist = useCallback((cats: TalvexCategorie[], fns: TalvexFonction[]) => {
    saveState(LS_KEY_CAT, cats); saveState(LS_KEY_FN, fns);
  }, []);

  const filtered = useMemo(() => {
    let list = fonctions;
    if (selectedCatId) list = list.filter(f => f.categoryId === selectedCatId);
    if (filterEtat) list = list.filter(f => f.etat === filterEtat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.titre.toLowerCase().includes(q) || f.descriptionCourte.toLowerCase().includes(q) || f.utilisateurs.toLowerCase().includes(q));
    }
    return list;
  }, [fonctions, selectedCatId, filterEtat, search]);

  const activeFnId = rightPanel.mode === 'detail' ? rightPanel.fnId : rightPanel.mode === 'edit' ? rightPanel.fnId : null;
  const activeFn = activeFnId ? fonctions.find(f => f.id === activeFnId) ?? null : null;
  const catLabel = (catId: string) => categories.find(c => c.id === catId)?.label ?? '';

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => { if (prev) setCheckedIds(new Set()); return !prev; });
  }, []);
  const exitSelectMode = useCallback(() => { setSelectMode(false); setCheckedIds(new Set()); }, []);
  const toggleCheck = useCallback((id: string) => {
    setCheckedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleAll = useCallback(() => {
    setCheckedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(f => f.id)));
  }, [filtered]);

  const handleToggleCatSelectMode = useCallback(() => {
    setCatSelectMode(prev => { if (prev) setCatCheckedIds(new Set()); return !prev; });
  }, []);
  const exitCatSelectMode = useCallback(() => { setCatSelectMode(false); setCatCheckedIds(new Set()); }, []);
  const toggleCatCheck = useCallback((id: string) => {
    setCatCheckedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleCatAll = useCallback(() => {
    setCatCheckedIds(prev => prev.size === categories.length ? new Set() : new Set(categories.map(c => c.id)));
  }, [categories]);

  const openDetail = useCallback((fnId: string) => { setRightPanel({ mode: 'detail', fnId }); setMobileRightOpen(true); }, []);
  const openAdd = useCallback(() => { setRightPanel({ mode: 'add' }); setMobileRightOpen(true); }, []);
  const openEdit = useCallback((fnId: string) => { setRightPanel({ mode: 'edit', fnId }); setMobileRightOpen(true); }, []);
  const closeRight = useCallback(() => { setRightPanel({ mode: 'closed' }); setMobileRightOpen(false); }, []);

  const handleBulkDelete = useCallback(() => {
    const next = fonctions.filter(f => !checkedIds.has(f.id));
    setFonctions(next);
    if (activeFnId && checkedIds.has(activeFnId)) { setRightPanel({ mode: 'closed' }); setMobileRightOpen(false); }
    persist(categories, next);
    exitSelectMode(); setBulkDeleteOpen(false);
  }, [fonctions, checkedIds, activeFnId, categories, persist, exitSelectMode]);

  const handleBulkDeleteCats = useCallback(() => {
    const nextCats = categories.filter(c => !catCheckedIds.has(c.id));
    const nextFns = fonctions.filter(f => !catCheckedIds.has(f.categoryId));
    setCategories(nextCats); setFonctions(nextFns);
    if (selectedCatId && catCheckedIds.has(selectedCatId)) setSelectedCatId(nextCats[0]?.id ?? null);
    closeRight(); persist(nextCats, nextFns);
    exitCatSelectMode(); setBulkDeleteCatsOpen(false);
  }, [categories, fonctions, catCheckedIds, selectedCatId, closeRight, persist, exitCatSelectMode]);

  const handleSaveFn = useCallback((data: Omit<TalvexFonction, 'id' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    if (rightPanel.mode === 'edit') {
      const next = fonctions.map(f => f.id === rightPanel.fnId ? { ...f, ...data, updatedAt: now } : f);
      setFonctions(next); persist(categories, next);
      setRightPanel({ mode: 'detail', fnId: rightPanel.fnId });
    } else {
      const newId = `fn-${Date.now()}`;
      const next = [...fonctions, { ...data, id: newId, updatedAt: now }];
      setFonctions(next); persist(categories, next);
      setRightPanel({ mode: 'detail', fnId: newId });
    }
  }, [rightPanel, fonctions, categories, persist]);

  const handleSaveCat = useCallback((label: string) => {
    let next: TalvexCategorie[];
    if (editingCat) {
      next = categories.map(c => c.id === editingCat.id ? { ...c, label } : c);
    } else {
      next = [...categories, { id: `cat-${Date.now()}`, label, order: categories.length }];
    }
    setCategories(next); persist(next, fonctions); setEditingCat(null);
  }, [editingCat, categories, fonctions, persist]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'fn') {
      const next = fonctions.filter(f => f.id !== deleteTarget.id);
      setFonctions(next);
      if (activeFnId === deleteTarget.id) closeRight();
      persist(categories, next);
    } else {
      const nextCats = categories.filter(c => c.id !== deleteTarget.id);
      const nextFns = fonctions.filter(f => f.categoryId !== deleteTarget.id);
      setCategories(nextCats); setFonctions(nextFns);
      if (selectedCatId === deleteTarget.id) setSelectedCatId(nextCats[0]?.id ?? null);
      closeRight(); persist(nextCats, nextFns);
    }
    setDeleteTarget(null);
  }, [deleteTarget, fonctions, categories, selectedCatId, activeFnId, closeRight, persist]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ categories, fonctions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fonctions-talvex.json'; a.click();
    URL.revokeObjectURL(url);
  }, [categories, fonctions]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.categories && data.fonctions) {
          setCategories(data.categories); setFonctions(data.fonctions);
          persist(data.categories, data.fonctions);
          setSelectedCatId(data.categories[0]?.id ?? null); closeRight();
        }
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file); e.target.value = '';
  }, [persist, closeRight]);

  const rightPanelOpen = rightPanel.mode !== 'closed';
  const checkedCount = checkedIds.size;
  const allChecked = filtered.length > 0 && checkedCount === filtered.length;
  const someChecked = checkedCount > 0 && !allChecked;
  const catCheckedCount = catCheckedIds.size;
  const catAllChecked = categories.length > 0 && catCheckedCount === categories.length;
  const catSomeChecked = catCheckedCount > 0 && !catAllChecked;

  return (
    <div className="flex flex-col h-full min-h-0">
      <SAFonctionsTalvexHeader
        search={search} onSearchChange={setSearch}
        filterEtat={filterEtat} onFilterChange={setFilterEtat}
        onAddFonction={openAdd}
        onAddCategory={() => { setEditingCat(null); setCatModalOpen(true); }}
        onExport={handleExport} onImport={() => importRef.current?.click()}
        totalFonctions={fonctions.length} totalCategories={categories.length}
      />
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      <div className="md:hidden flex-shrink-0 px-4 pb-2">
        <button onClick={() => setMobileCatOpen(!mobileCatOpen)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium" style={{ background: t.surface.secondary, color: t.text.primary, border: `1px solid ${t.surface.border}` }}>
          {categories.find(c => c.id === selectedCatId)?.label ?? 'Choisir une categorie'}
        </button>
        {mobileCatOpen && (
          <div className="mt-1 rounded-lg overflow-y-auto max-h-52 py-1" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => { setSelectedCatId(cat.id); setMobileCatOpen(false); closeRight(); }}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={{ background: selectedCatId === cat.id ? t.surface.active : 'transparent', color: t.text.primary }}>
                {cat.label} ({fonctions.filter(f => f.categoryId === cat.id).length})
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 flex min-h-0 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 gap-2 md:gap-3">
        <div className="hidden md:flex flex-col w-[220px] lg:w-[260px] flex-shrink-0 rounded-xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <FonctionCategoryList categories={categories} fonctions={fonctions} selectedId={selectedCatId}
            onSelect={id => { setSelectedCatId(id); closeRight(); exitSelectMode(); }}
            onAdd={() => { setEditingCat(null); setCatModalOpen(true); }}
            onEdit={cat => { setEditingCat(cat); setCatModalOpen(true); }}
            onDelete={cat => setDeleteTarget({ type: 'cat', id: cat.id, label: cat.label })}
            catSelectMode={catSelectMode} catCheckedIds={catCheckedIds}
            onToggleCatSelectMode={handleToggleCatSelectMode} onToggleCatCheck={toggleCatCheck}
            onToggleCatAll={toggleCatAll} catAllChecked={catAllChecked} catSomeChecked={catSomeChecked}
            onBulkDeleteCats={() => setBulkDeleteCatsOpen(true)} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <FonctionListHeader catLabel={selectedCatId ? catLabel(selectedCatId) : ''} count={filtered.length}
            selectMode={selectMode} checkedCount={checkedCount} allChecked={allChecked} someChecked={someChecked}
            onToggleSelectMode={handleToggleSelectMode} toggleAll={toggleAll}
            onBulkDelete={() => setBulkDeleteOpen(true)} />
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs" style={{ color: t.text.tertiary }}>Aucune fonction trouvee</p>
              </div>
            )}
            {filtered.map(fn => (
              <FonctionCard key={fn.id} fonction={fn} isSelected={activeFnId === fn.id}
                onSelect={() => openDetail(fn.id)} onEdit={() => openEdit(fn.id)}
                onDelete={() => setDeleteTarget({ type: 'fn', id: fn.id, label: fn.titre })}
                selectMode={selectMode} isChecked={checkedIds.has(fn.id)}
                onToggleCheck={() => toggleCheck(fn.id)} />
            ))}
          </div>
        </div>
        {rightPanelOpen && (
          <div className="hidden md:flex flex-col w-[320px] lg:w-[400px] flex-shrink-0 rounded-xl overflow-hidden transition-all" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            {rightPanel.mode === 'detail' && activeFn && (
              <FonctionDetailPanel fonction={activeFn} categoryLabel={catLabel(activeFn.categoryId)} onClose={closeRight}
                onEdit={() => openEdit(activeFn.id)}
                onDelete={() => setDeleteTarget({ type: 'fn', id: activeFn.id, label: activeFn.titre })} />
            )}
            {rightPanel.mode === 'edit' && activeFn && (
              <FonctionFormPanel categories={categories} initial={activeFn} onSave={handleSaveFn} onCancel={() => setRightPanel({ mode: 'detail', fnId: activeFn.id })} />
            )}
            {rightPanel.mode === 'add' && (
              <FonctionFormPanel categories={categories} defaultCategoryId={selectedCatId ?? undefined} onSave={handleSaveFn} onCancel={closeRight} />
            )}
          </div>
        )}
      </div>

      {selectMode && checkedCount > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9980] flex items-center justify-between px-4 py-3 gap-2" style={{ background: t.surface.secondary, borderTop: `1px solid ${t.surface.border}` }}>
          <span className="text-xs font-semibold" style={{ color: t.danger.text }}>{checkedCount} selectionnee{checkedCount > 1 ? 's' : ''}</span>
          <button onClick={() => setBulkDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold" style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>
            <Trash2 className="w-3.5 h-3.5" /> Supprimer {checkedCount}
          </button>
        </div>
      )}
      {rightPanelOpen && mobileRightOpen && (
        <div className="md:hidden fixed inset-0 z-[9990] flex flex-col" onClick={closeRight}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative mt-auto rounded-t-2xl max-h-[85vh] flex flex-col" style={{ background: t.surface.secondary }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-2 mb-1" style={{ background: t.surface.border }} />
            {rightPanel.mode === 'detail' && activeFn && (
              <FonctionDetailPanel fonction={activeFn} categoryLabel={catLabel(activeFn.categoryId)} onClose={closeRight}
                onEdit={() => openEdit(activeFn.id)}
                onDelete={() => setDeleteTarget({ type: 'fn', id: activeFn.id, label: activeFn.titre })} />
            )}
            {rightPanel.mode === 'edit' && activeFn && (
              <FonctionFormPanel categories={categories} initial={activeFn} onSave={handleSaveFn} onCancel={() => setRightPanel({ mode: 'detail', fnId: activeFn.id })} />
            )}
            {rightPanel.mode === 'add' && (
              <FonctionFormPanel categories={categories} defaultCategoryId={selectedCatId ?? undefined} onSave={handleSaveFn} onCancel={closeRight} />
            )}
          </div>
        </div>
      )}


      <CategoryFormModal isOpen={catModalOpen} onClose={() => { setCatModalOpen(false); setEditingCat(null); }} onSave={handleSaveCat} initial={editingCat} />
      <DeleteConfirmModal isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'cat' ? 'Supprimer la categorie' : 'Supprimer la fonction'}
        message={deleteTarget?.type === 'cat' ? `Supprimer la categorie "${deleteTarget?.label}" et toutes ses fonctions ?` : `Supprimer la fonction "${deleteTarget?.label}" ?`}
        onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      <DeleteConfirmModal isOpen={bulkDeleteOpen}
        title="Suppression groupee"
        message={`Voulez-vous vraiment supprimer ${checkedCount} fonction${checkedCount > 1 ? 's' : ''} ? Cette action est irreversible.`}
        onConfirm={handleBulkDelete} onClose={() => setBulkDeleteOpen(false)} />
      <DeleteConfirmModal isOpen={bulkDeleteCatsOpen}
        title="Suppression groupee de categories"
        message={`Voulez-vous vraiment supprimer ${catCheckedCount} categorie${catCheckedCount > 1 ? 's' : ''} et toutes leurs fonctions ? Cette action est irreversible.`}
        onConfirm={handleBulkDeleteCats} onClose={() => setBulkDeleteCatsOpen(false)} />
    </div>
  );
}
