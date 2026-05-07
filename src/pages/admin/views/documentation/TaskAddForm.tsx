import { Loader2, Check } from 'lucide-react';
import { NewTaskForm, TaskStatus, STATUS_ORDER, STATUS_CONFIG } from './pageTasksConstants';
import { getThemeTokens } from '../../../../lib/themeTokens';

interface Props {
  formData: NewTaskForm;
  setFormData: React.Dispatch<React.SetStateAction<NewTaskForm>>;
  onAdd: () => void;
  onClose: () => void;
  saving: boolean;
  tokens: ReturnType<typeof getThemeTokens>;
}

export default function TaskAddForm({ formData, setFormData, onAdd, onClose, saving, tokens }: Props) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: tokens.card.bg,
        border: `1px solid ${tokens.accent.border}`,
      }}
    >
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter' && formData.title.trim()) onAdd(); if (e.key === 'Escape') onClose(); }}
        placeholder="Titre de la tache *"
        className="w-full bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
        style={{
          border: `1px solid ${tokens.input.border}`,
          color: tokens.input.text,
          caretColor: tokens.accent.text,
        }}
        autoFocus
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Description (optionnel)"
        rows={2}
        className="w-full bg-transparent text-sm outline-none px-3 py-2 rounded-lg resize-none"
        style={{
          border: `1px solid ${tokens.input.border}`,
          color: tokens.input.text,
          caretColor: tokens.accent.text,
        }}
      />
      <div className="flex items-center gap-3">
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
          className="text-xs font-medium px-3 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{
            background: tokens.surface.tertiary,
            border: `1px solid ${tokens.surface.border}`,
            color: tokens.text.primary,
          }}
        >
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => { onClose(); setFormData({ title: '', description: '', status: 'todo' }); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: tokens.text.tertiary }}
          onMouseEnter={(e) => { e.currentTarget.style.color = tokens.text.primary; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.tertiary; }}
        >
          Annuler
        </button>
        <button
          onClick={onAdd}
          disabled={!formData.title.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          style={{
            background: tokens.accent.bg,
            border: `1px solid ${tokens.accent.border}`,
            color: tokens.accent.text,
          }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Valider
        </button>
      </div>
    </div>
  );
}
