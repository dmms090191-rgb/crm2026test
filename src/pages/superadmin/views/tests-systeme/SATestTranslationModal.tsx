import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface TestTranslation {
  id: string;
  testName: string;
  description: string;
  steps: string;
  categoryId: string;
  order: number;
}

export interface TestCategoryItem {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  initial: TestTranslation | null;
  categories: TestCategoryItem[];
  onSave: (entry: TestTranslation) => void;
  onClose: () => void;
}

export default function SATestTranslationModal({ open, initial, categories, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [testName, setTestName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (initial) {
      setTestName(initial.testName);
      setDescription(initial.description);
      setSteps(initial.steps || '');
      setCategoryId(initial.categoryId || '');
    } else {
      setTestName('');
      setDescription('');
      setSteps('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
    }
  }, [initial, open, categories]);

  if (!open) return null;

  const handleSave = () => {
    const trimmedName = testName.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName || !trimmedDesc) return;

    const autresCategory = categories.find(c => c.name === 'Autres');
    const resolvedCategoryId = categoryId || autresCategory?.id || '';

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      testName: trimmedName,
      description: trimmedDesc,
      steps: steps.trim(),
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
            {initial ? 'Modifier la traduction' : 'Ajouter une traduction'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nom du test Playwright
            </label>
            <input
              type="text"
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="inscription-public.spec.ts"
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ce que ca fait
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Teste l'inscription client depuis la page d'accueil"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Parcours du test
            </label>
            <textarea
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder={"1. Ouvre la page d'accueil\n2. Clique sur Connexion\n3. Clique sur S'inscrire\n4. Remplit le formulaire\n5. Clique sur S'INSCRIRE\n6. Verifie le message Inscription confirmee"}
              rows={5}
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
            disabled={!testName.trim() || !description.trim()}
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
