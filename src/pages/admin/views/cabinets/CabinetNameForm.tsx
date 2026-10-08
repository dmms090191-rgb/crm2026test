import { useState } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { formatCabinetDate } from './cabinetTypes';
import type { CabinetTemplate } from './cabinetTypes';

interface Props {
  /** Modele retenu, ou null pour un cabinet cree de zero. */
  template: CabinetTemplate | null;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

/**
 * Derniere etape, partagee par les deux parcours.
 * La date de creation est automatique : elle est posee par la base, on se
 * contente de l'afficher a titre indicatif.
 */
export default function CabinetNameForm({ template, saving, error, onCancel, onSubmit }: Props) {
  const t = useThemeTokens();
  const [name, setName] = useState('');
  const today = formatCabinetDate(new Date().toISOString());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saving) onSubmit(name);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {template && (
        <div className="px-4 py-3 rounded-lg text-xs"
          style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          Modèle retenu : <strong>{template.name} — {template.category}</strong>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: t.label.text }}>
          Nom du cabinet
        </label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
          data-testid="cabinet-nom"
          placeholder={template ? `${template.name} Cabinet 1` : 'Mon cabinet'}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
        />
      </div>

      <div>
        <span className="block text-xs font-semibold mb-1.5" style={{ color: t.label.text }}>Date de création</span>
        <div className="px-3 py-2.5 rounded-lg text-sm"
          style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}>
          {today} <span className="text-xs" style={{ color: t.label.hint }}>— automatique</span>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
          Annuler
        </button>
        <button type="submit" disabled={saving || !name.trim()}
          data-testid="cabinet-creer"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          style={{ background: t.accent.solid, color: t.text.inverse, opacity: saving || !name.trim() ? 0.5 : 1 }}>
          {saving ? 'Création…' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
