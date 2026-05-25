import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface FinishedTest {
  id: string;
  title: string;
  filename: string;
  description: string;
  commands: string;
  test_code: string;
  subcategoryId: string;
  order: number;
}

export interface FinishedSubcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface FinishedCategory {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  initial: FinishedTest | null;
  subcategoryId: string;
  categories: FinishedCategory[];
  subcategories: FinishedSubcategory[];
  onSave: (entry: FinishedTest) => void;
  onClose: () => void;
}

export default function SATestFinishedModal({ open, initial, subcategoryId, categories, subcategories, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('');
  const [description, setDescription] = useState('');
  const [commands, setCommands] = useState('');
  const [testCode, setTestCode] = useState('');
  const [selectedSubcatId, setSelectedSubcatId] = useState(subcategoryId);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setFilename(initial.filename || '');
      setDescription(initial.description || '');
      setCommands(initial.commands || '');
      setTestCode(initial.test_code || '');
      setSelectedSubcatId(initial.subcategoryId);
    } else {
      setTitle('');
      setFilename('');
      setDescription('');
      setCommands('');
      setTestCode('');
      setSelectedSubcatId(subcategoryId || subcategories[0]?.id || '');
    }
  }, [initial, open, subcategoryId, subcategories]);

  if (!open) return null;

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !selectedSubcatId) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: trimmedTitle,
      filename: filename.trim(),
      description: description.trim(),
      commands: commands.trim(),
      test_code: testCode.trim(),
      subcategoryId: selectedSubcatId,
      order: initial?.order ?? Date.now(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">
            {initial ? 'Modifier le test' : 'Ajouter un test fini'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Sous-categorie</label>
            <select
              value={selectedSubcatId}
              onChange={e => setSelectedSubcatId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            >
              {categories.map(cat => {
                const subs = subcategories.filter(s => s.categoryId === cat.id);
                if (subs.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={cat.name}>
                    {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Titre du test fini</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Exemple : Info admin — modification prenom/nom/PIN"
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nom du fichier</label>
            <input
              type="text"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              placeholder="Exemple : info-admin.spec.ts"
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description du test</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Exemple : Verifie que l'admin peut modifier son prenom, son nom et son PIN..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Commandes du test</label>
            <p className="text-[10px] text-slate-500 mb-1.5">Une commande par ligne, dans l'ordre d'execution.</p>
            <textarea
              value={commands}
              onChange={e => setCommands(e.target.value)}
              placeholder={"npm.cmd install\nnpm.cmd run dev\nnpm.cmd run test:e2e:slow -- e2e/admin/info-admin.spec.ts"}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none font-mono"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Code du test</label>
            <p className="text-[10px] text-slate-500 mb-1.5">Collez le code complet du fichier Playwright (TypeScript).</p>
            <textarea
              value={testCode}
              onChange={e => setTestCode(e.target.value)}
              placeholder={"import { test, expect } from '@playwright/test';\n\ntest('mon test', async ({ page }) => {\n  await page.goto('/');\n  // ...\n});"}
              rows={10}
              className="w-full px-3 py-2 rounded-lg text-[12px] text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-y font-mono leading-relaxed"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, maxHeight: '50vh' }}
            />
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
            disabled={!title.trim() || !selectedSubcatId}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
