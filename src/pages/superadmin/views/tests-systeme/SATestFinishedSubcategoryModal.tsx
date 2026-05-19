import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FinishedSubcategory } from './SATestFinishedModal';

interface Props {
  open: boolean;
  initial: FinishedSubcategory | null;
  categoryId: string;
  onSave: (entry: FinishedSubcategory) => void;
  onClose: () => void;
}

export default function SATestFinishedSubcategoryModal({ open, initial, categoryId, onSave, onClose }: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
    } else {
      setName('');
    }
  }, [initial, open]);

  if (!open) return null;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      categoryId: initial?.categoryId ?? categoryId,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-xl p-6"
        style={{ background: '#0f172a', border: '1px solid rgba(51,65,85,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">
            {initial ? 'Modifier la sous-categorie' : 'Ajouter une sous-categorie'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Nom de la sous-categorie</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Exemple : Onglet Info admin"
            className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
            style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.5)' }}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}
          >
            {initial ? 'Enregistrer' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}
