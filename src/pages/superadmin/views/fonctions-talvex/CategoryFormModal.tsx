import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TalvexCategorie } from './fonctionsTalvexTypes';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  initial?: TalvexCategorie | null;
}

export default function CategoryFormModal({ isOpen, onClose, onSave, initial }: Props) {
  const t = useThemeTokens();
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (isOpen) setLabel(initial?.label ?? '');
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave(label.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>
            {initial ? 'Modifier la categorie' : 'Nouvelle categorie'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: t.text.tertiary }}>Nom</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-colors"
            style={{ background: t.input.bg, color: t.input.text, border: `1px solid ${t.input.border}`, caretColor: t.input.text }}
            placeholder="Nom de la categorie"
          />
        </form>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-medium" style={{ color: t.text.secondary }}>Annuler</button>
          <button
            onClick={() => { if (label.trim()) { onSave(label.trim()); onClose(); } }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: '#f59e0b' }}
          >
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}
