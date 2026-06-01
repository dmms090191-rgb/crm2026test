import { useState } from 'react';
import { X, Check, FolderOpen } from 'lucide-react';
import type { ThemeCategoryRow } from '../../../../hooks/useThemeCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  themeLabel: string;
  currentCategorySlug: string;
  categories: ThemeCategoryRow[];
  onMove: (categoryId: string, categorySlug: string) => Promise<void>;
}

const VIRTUAL_SLUGS = new Set(['all', 'recommended', 'rework', 'hidden']);

export default function MoveThemeModal({ open, onClose, themeLabel, currentCategorySlug, categories, onMove }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetCategories = categories.filter(c => !VIRTUAL_SLUGS.has(c.slug));

  const handleConfirm = async () => {
    const cat = categories.find(c => c.id === selectedId);
    if (!cat) return;
    setSaving(true);
    await onMove(cat.id, cat.slug);
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-sm mx-4 rounded-2xl flex flex-col" style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90">Deplacer le theme</h3>
            <p className="text-[10px] mt-0.5 text-white/35 truncate">
              {themeLabel}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Category list */}
        <div className="p-5 flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-1">Choisir la categorie</span>
          {targetCategories.map(cat => {
            const isCurrent = cat.slug === currentCategorySlug;
            const isSelected = selectedId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedId(cat.id)}
                disabled={isCurrent}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: isSelected ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid rgba(59,130,246,0.30)' : '1px solid rgba(255,255,255,0.04)',
                  color: isSelected ? '#60a5fa' : isCurrent ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.65)',
                }}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ opacity: 0.5 }} />
                <span className="flex-1 min-w-0 truncate">{cat.name}</span>
                {isCurrent && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/25">Actuel</span>
                )}
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Actions */}
        <div className="p-5 pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 transition-colors">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={!selectedId || saving} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40">
            {saving ? 'Deplacement...' : 'Deplacer'}
          </button>
        </div>
      </div>
    </div>
  );
}
