import { useState, useCallback, useMemo } from 'react';
import { X, Trash2, Plus, CheckSquare } from 'lucide-react';
import { type ThemeCategoryRow, isProtectedCategory } from '../../../../hooks/useThemeCategories';
import CategoryRow from './CategoryRow';
import CategoryDeleteConfirmModal from './CategoryDeleteConfirmModal';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: ThemeCategoryRow[];
  themeCounts: Record<string, number>;
  onRename: (id: string, name: string) => Promise<void>;
  onSwap: (idA: string, idB: string) => Promise<void>;
  onCreate: (name: string, slug: string) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
  onBulkDelete: (ids: string[]) => Promise<{ error: unknown; deleted: number }>;
}

export default function CategoryManagerModal({ open, onClose, categories, themeCounts, onRename, onSwap, onCreate, onDelete, onBulkDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<'single' | 'bulk' | null>(null);
  const [pendingSingleId, setPendingSingleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const deletableSelected = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const cat = categories.find(c => c.id === id);
      return cat && !isProtectedCategory(cat);
    });
  }, [selectedIds, categories]);

  const startEdit = useCallback((cat: ThemeCategoryRow) => {
    setEditingId(cat.id); setEditValue(cat.name);
  }, []);

  const confirmEdit = useCallback(async () => {
    if (!editingId || !editValue.trim()) return;
    await onRename(editingId, editValue.trim());
    setEditingId(null); setEditValue('');
  }, [editingId, editValue, onRename]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.some(c => c.slug === slug)) { setError('Une categorie avec ce nom existe deja'); return; }
    const { error: err } = await onCreate(name, slug);
    if (err) { setError('Erreur lors de la creation'); return; }
    setNewName(''); setCreating(false);
  }, [newName, categories, onCreate]);

  const requestDeleteSingle = useCallback((cat: ThemeCategoryRow) => {
    if (isProtectedCategory(cat)) return;
    setError(''); setPendingSingleId(cat.id); setConfirmTarget('single');
  }, []);

  const confirmDeleteSingle = useCallback(async () => {
    if (!pendingSingleId) return;
    setBusy(true);
    const { error: err } = await onDelete(pendingSingleId);
    setBusy(false);
    if (err) setError('Erreur lors de la suppression');
    setPendingSingleId(null); setConfirmTarget(null);
  }, [pendingSingleId, onDelete]);

  const requestDeleteBulk = useCallback(() => {
    if (deletableSelected.length === 0) return;
    setError(''); setConfirmTarget('bulk');
  }, [deletableSelected]);

  const confirmDeleteBulk = useCallback(async () => {
    setBusy(true);
    const { error: err } = await onBulkDelete(deletableSelected);
    setBusy(false);
    if (err) setError('Erreur lors de la suppression');
    setSelectedIds(new Set()); setSelectionMode(false); setConfirmTarget(null);
  }, [deletableSelected, onBulkDelete]);

  const cancelConfirm = useCallback(() => { setConfirmTarget(null); setPendingSingleId(null); }, []);

  const handleMoveUp = useCallback(async (idx: number) => {
    if (idx <= 0) return;
    await onSwap(categories[idx].id, categories[idx - 1].id);
  }, [categories, onSwap]);

  const handleMoveDown = useCallback(async (idx: number) => {
    if (idx >= categories.length - 1) return;
    await onSwap(categories[idx].id, categories[idx + 1].id);
  }, [categories, onSwap]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => { if (prev) setSelectedIds(new Set()); return !prev; });
  }, []);

  const pendingSingleCat = pendingSingleId ? categories.find(c => c.id === pendingSingleId) : null;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
        <div className="w-full max-w-lg mx-4 rounded-2xl flex flex-col max-h-[85vh]" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 pb-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white/90">Organiser les categories</h3>
              <p className="text-[10px] mt-0.5 text-white/35">
                {categories.length} categorie{categories.length > 1 ? 's' : ''}
                {' '}&middot; Renommez, reordonnez ou supprimez
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={toggleSelectionMode} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: selectionMode ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)', border: selectionMode ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.06)', color: selectionMode ? '#60a5fa' : 'rgba(255,255,255,0.40)' }}>
                <CheckSquare className="w-3 h-3" />
                {selectionMode ? 'Annuler' : 'Selectionner'}
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mx-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-1.5">
            {categories.map((cat, idx) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                idx={idx}
                total={categories.length}
                count={themeCounts[cat.slug] ?? 0}
                isEditing={editingId === cat.id}
                editValue={editValue}
                onEditValueChange={setEditValue}
                onStartEdit={() => startEdit(cat)}
                onConfirmEdit={confirmEdit}
                onCancelEdit={() => setEditingId(null)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                onDelete={() => requestDeleteSingle(cat)}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(cat.id)}
                onToggleSelect={() => toggleSelect(cat.id)}
              />
            ))}
          </div>

          {error && (
            <div className="mx-5 px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }}>
              {error}
            </div>
          )}

          {selectionMode && deletableSelected.length > 0 && (
            <div className="mx-5 mt-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <span className="text-[11px] font-bold flex-1" style={{ color: '#f87171' }}>
                {deletableSelected.length} categorie{deletableSelected.length > 1 ? 's' : ''} selectionnee{deletableSelected.length > 1 ? 's' : ''}
              </span>
              <button onClick={requestDeleteBulk} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-110" style={{ background: 'rgba(239,68,68,0.70)', color: '#fff' }}>
                <Trash2 className="w-3 h-3" />
                Supprimer selection
              </button>
            </div>
          )}

          <div className="mx-5 mt-2 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="p-5 pt-4 flex-shrink-0">
            {creating ? (
              <div className="flex items-center gap-2">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }} placeholder="Nom de la categorie..." className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white/90 placeholder-white/25 outline-none focus:border-blue-500/40 transition-colors" autoFocus />
                <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40">Creer</button>
                <button onClick={() => { setCreating(false); setNewName(''); setError(''); }} className="px-3 py-2.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 transition-colors">Annuler</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all w-full justify-center hover:bg-white/[0.04]" style={{ border: '1px dashed rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)' }}>
                <Plus className="w-3.5 h-3.5" />
                Nouvelle categorie
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmTarget && (
        <CategoryDeleteConfirmModal
          type={confirmTarget}
          singleName={pendingSingleCat?.name}
          singleThemeCount={pendingSingleCat ? (themeCounts[pendingSingleCat.slug] || 0) : 0}
          bulkCount={deletableSelected.length}
          busy={busy}
          onConfirm={confirmTarget === 'single' ? confirmDeleteSingle : confirmDeleteBulk}
          onCancel={cancelConfirm}
        />
      )}
    </>
  );
}
