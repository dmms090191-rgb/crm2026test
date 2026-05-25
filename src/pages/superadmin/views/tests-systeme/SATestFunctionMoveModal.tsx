import { useState } from 'react';
import { X, MoveRight } from 'lucide-react';
import type { TestFunction, TestFunctionCategory } from './SATestFunctionModal';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  open: boolean;
  item: TestFunction | null;
  categories: TestFunctionCategory[];
  onMove: (itemId: string, targetCategoryId: string) => void;
  onClose: () => void;
}

export default function SATestFunctionMoveModal({ open, item, categories, onMove, onClose }: Props) {
  const t = useThemeTokens();
  const [targetId, setTargetId] = useState('');

  if (!open || !item) return null;

  const otherCategories = categories.filter(c => c.id !== item.categoryId);
  const selectedTarget = targetId || (otherCategories.length > 0 ? otherCategories[0].id : '');

  const handleMove = () => {
    if (!selectedTarget) return;
    onMove(item.id, selectedTarget);
    onClose();
  };

  const currentCat = categories.find(c => c.id === item.categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-xl p-6"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">Deplacer la fonction</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="mb-4 px-3 py-2 rounded-lg" style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}>
          <p className="text-[11px] text-slate-400 mb-1">Fonction :</p>
          <p className="text-xs font-semibold text-amber-400 font-mono truncate">{item.name}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            Actuellement dans : <span className="text-amber-400">{currentCat?.name || 'Sans categorie'}</span>
          </p>
        </div>

        {otherCategories.length === 0 ? (
          <p className="text-xs text-slate-500 italic mb-4">Aucune autre categorie disponible.</p>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Categorie de destination
            </label>
            <select
              value={selectedTarget}
              onChange={e => setTargetId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none cursor-pointer"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            >
              {otherCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.secondary }}
          >
            Annuler
          </button>
          <button
            onClick={handleMove}
            disabled={otherCategories.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
            }}
          >
            <MoveRight className="w-3.5 h-3.5" />
            Deplacer
          </button>
        </div>
      </div>
    </div>
  );
}
