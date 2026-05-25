import { useState } from 'react';
import { X, MoveRight } from 'lucide-react';
import type { TestTuto, TestTutoCategory } from './SATestTutoModal';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  open: boolean;
  item: TestTuto | null;
  categories: TestTutoCategory[];
  onMove: (itemId: string, targetCategoryId: string) => void;
  onClose: () => void;
}

export default function SATestTutoMoveModal({ open, item, categories, onMove, onClose }: Props) {
  const t = useThemeTokens();
  const [targetId, setTargetId] = useState('');

  if (!open || !item) return null;

  const availableCategories = categories.filter(c => c.id !== item.categoryId);

  const handleMove = () => {
    if (!targetId) return;
    onMove(item.id, targetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-xl p-6"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">Deplacer le tuto</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Deplacer <span className="text-amber-400 font-semibold">{item.title}</span> vers :
        </p>

        {availableCategories.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune autre categorie disponible.</p>
        ) : (
          <div className="space-y-1.5">
            {availableCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setTargetId(cat.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: targetId === cat.id ? t.accent.bg : t.modal.fieldBg,
                  border: targetId === cat.id ? `1px solid ${t.accent.border}` : `1px solid ${t.surface.border}`,
                  color: targetId === cat.id ? t.accent.text : t.text.primary,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.secondary }}
          >
            Annuler
          </button>
          <button
            onClick={handleMove}
            disabled={!targetId}
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
