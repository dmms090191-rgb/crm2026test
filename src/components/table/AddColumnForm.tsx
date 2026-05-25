import { PlusCircle, X } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import { FIELD_TYPES } from './columnModalTypes';

interface AddColumnFormProps {
  show: boolean;
  newLabel: string;
  newType: string;
  creating: boolean;
  t: ThemeTokens;
  onToggle: () => void;
  onLabelChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export default function AddColumnForm({
  show, newLabel, newType, creating, t,
  onToggle, onLabelChange, onTypeChange, onCreate, onCancel,
}: AddColumnFormProps) {
  if (!show) return null;

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
      <div className="flex items-center gap-2">
        <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.accent.text }} />
        <span className="text-xs font-bold" style={{ color: t.accent.text }}>Nouvelle colonne</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: t.text.tertiary }}>Nom</label>
          <input
            autoFocus
            value={newLabel}
            onChange={e => onLabelChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onCreate(); }}
            placeholder="Ex: Note interne, Score..."
            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
            style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.primary }}
            onFocus={e => { e.currentTarget.style.borderColor = t.accent.border; }}
            onBlur={e => { e.currentTarget.style.borderColor = t.modal.fieldBorder; }}
          />
        </div>
        <div className="w-full sm:w-40 flex-shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: t.text.tertiary }}>Type</label>
          <select
            value={newType}
            onChange={e => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
            style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.primary }}
          >
            {FIELD_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
        >
          Annuler
        </button>
        <button
          onClick={onCreate}
          disabled={!newLabel.trim() || creating}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: newLabel.trim() ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : t.surface.tertiary }}
        >
          {creating ? 'Creation...' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}
