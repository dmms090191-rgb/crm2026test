import { useState, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Pencil, Trash2, Plus, Check, Shield, GripVertical } from 'lucide-react';
import type { ThemeCategoryRow } from '../../../../hooks/useThemeCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: ThemeCategoryRow[];
  themeCounts: Record<string, number>;
  onRename: (id: string, name: string) => Promise<void>;
  onSwap: (idA: string, idB: string) => Promise<void>;
  onCreate: (name: string, slug: string) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
}

export default function CategoryManagerModal({ open, onClose, categories, themeCounts, onRename, onSwap, onCreate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const startEdit = useCallback((cat: ThemeCategoryRow) => {
    setEditingId(cat.id);
    setEditValue(cat.name);
  }, []);

  const confirmEdit = useCallback(async () => {
    if (!editingId || !editValue.trim()) return;
    await onRename(editingId, editValue.trim());
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onRename]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.some(c => c.slug === slug)) {
      setError('Une categorie avec ce nom existe deja');
      return;
    }
    const { error: err } = await onCreate(name, slug);
    if (err) { setError('Erreur lors de la creation'); return; }
    setNewName('');
    setCreating(false);
  }, [newName, categories, onCreate]);

  const handleDelete = useCallback(async (cat: ThemeCategoryRow) => {
    const count = themeCounts[cat.slug] || 0;
    if (count > 0) { setError(`Impossible : ${count} theme(s) dans cette categorie`); return; }
    setError('');
    await onDelete(cat.id);
  }, [themeCounts, onDelete]);

  const handleMoveUp = useCallback(async (idx: number) => {
    if (idx <= 0) return;
    await onSwap(categories[idx].id, categories[idx - 1].id);
  }, [categories, onSwap]);

  const handleMoveDown = useCallback(async (idx: number) => {
    if (idx >= categories.length - 1) return;
    await onSwap(categories[idx].id, categories[idx + 1].id);
  }, [categories, onSwap]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-4 rounded-2xl flex flex-col max-h-[85vh]" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white/90">Organiser les categories</h3>
            <p className="text-[10px] mt-0.5 text-white/35">Renommez, reordonnez ou creez des categories</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-1.5">
          {categories.map((cat, idx) => {
            const count = themeCounts[cat.slug] || 0;
            const isEditing = editingId === cat.id;

            return (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group transition-colors" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <GripVertical className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />

                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white/[0.06] border border-blue-500/30 text-xs text-white/90 outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-xs font-medium truncate" style={{ color: cat.is_system ? 'rgba(245,158,11,0.70)' : 'rgba(255,255,255,0.75)' }}>
                    {cat.name}
                  </span>
                )}

                {cat.is_system && (
                  <Shield className="w-3 h-3 text-amber-500/40 flex-shrink-0" title="Categorie systeme" />
                )}

                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.30)' }}>
                  {cat.slug === 'all' ? '' : count}
                </span>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {isEditing ? (
                    <button onClick={confirmEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(cat)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}

                  <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  <button onClick={() => handleMoveDown(idx)} disabled={idx === categories.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {!cat.is_system && (
                    <button onClick={() => handleDelete(cat)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors" title={count > 0 ? 'Deplacez les themes avant de supprimer' : 'Supprimer'}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }}>
            {error}
          </div>
        )}

        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Create */}
        <div className="p-5 pt-4 flex-shrink-0">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                placeholder="Nom de la categorie..."
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white/90 placeholder-white/25 outline-none focus:border-blue-500/40 transition-colors"
                autoFocus
              />
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40">
                Creer
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); setError(''); }} className="px-3 py-2.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 transition-colors">
                Annuler
              </button>
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
  );
}
