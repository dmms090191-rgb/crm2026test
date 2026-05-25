import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface TestFunction {
  id: string;
  name: string;
  description: string;
  components: string;
  categoryId: string;
  order: number;
}

export interface TestFunctionCategory {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  initial: TestFunction | null;
  categories: TestFunctionCategory[];
  onSave: (entry: TestFunction) => void;
  onClose: () => void;
}

export default function SATestFunctionModal({ open, initial, categories, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setComponents(initial.components || '');
      setCategoryId(initial.categoryId || '');
    } else {
      setName('');
      setDescription('');
      setComponents('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
    }
  }, [initial, open, categories]);

  if (!open) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName || !trimmedDesc) return;

    const resolvedCategoryId = categoryId || (categories.length > 0 ? categories[0].id : '');

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmedName,
      description: trimmedDesc,
      components: components.trim(),
      categoryId: resolvedCategoryId,
      order: initial?.order ?? Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">
            {initial ? 'Modifier la fonction' : 'Ajouter une fonction'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nom de la fonction
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='exemple "connectAdmin()"'
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ce que ca fait / ce que ca regroupe
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="exemple : Connexion complete a l'admin, ouvre la page, clique Connexion, remplit email + PIN, valide et verifie le dashboard."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Composants / boutons utilises
            </label>
            <textarea
              value={components}
              onChange={e => setComponents(e.target.value)}
              placeholder={"1. Bouton Connexion accueil\n2. Champ email\n3. Cases PIN\n4. Bouton Valider"}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Categorie
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none cursor-pointer"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.secondary }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !description.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
