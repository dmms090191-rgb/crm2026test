import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Amelioration, AmeliorationCategory } from './types';

export interface AmeliorationFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  status: string;
  useNewDate: boolean;
  categoryId?: string | null;
}

interface Props {
  initial: Amelioration | null;
  categories?: AmeliorationCategory[];
  saveError?: string | null;
  onSave: (data: AmeliorationFormData) => void;
  onClose: () => void;
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export default function AmeliorationModal({ initial, categories, saveError, onSave, onClose }: Props) {
  const tokens = useThemeTokens();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'todo');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category_id ?? null);
  const [date, setDate] = useState(() => {
    if (initial) return new Date(initial.created_at).toISOString().slice(0, 10);
    return nowDate();
  });
  const [time, setTime] = useState(() => {
    if (initial) return new Date(initial.created_at).toTimeString().slice(0, 5);
    return nowTime();
  });
  const [useNewDate, setUseNewDate] = useState(false);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const lines = title.slice(0, start).split('\n');
    const currentLine = lines[lines.length - 1];
    const match = currentLine.match(/^(\d+)\.\s?/);

    if (match && currentLine.trim() === match[0].trim()) {
      const cleared = lines.slice(0, -1).join('\n');
      setTitle(cleared + title.slice(start));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = cleared.length; });
      return;
    }

    const nextNum = match ? parseInt(match[1], 10) + 1 : (lines.length === 1 && !currentLine.match(/^\d+\./) ? 1 : lines.length);
    const prefix = title.length === 0 ? '1. ' : `\n${nextNum}. `;
    const before = title.slice(0, start);
    const after = title.slice(start);

    if (title.length === 0) {
      setTitle(prefix);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = prefix.length; });
    } else {
      const newVal = before + prefix;
      setTitle(newVal + after);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newVal.length; });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (title === '' && val.length === 1) {
      setTitle('1. ' + val);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = 3 + val.length;
      });
      return;
    }
    setTitle(val);
  };

  const canSubmit = title.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ title: title.trim(), description: description.trim(), date, time, status, useNewDate, categoryId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: tokens.modal.overlayBg }}>
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}` }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
          style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; e.currentTarget.style.color = tokens.modal.closeBtnHoverText; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = tokens.modal.closeBtnBg; e.currentTarget.style.color = tokens.modal.closeBtnText; }}
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-base font-semibold mb-5" style={{ color: tokens.modal.title }}>
            {isEdit ? 'Modifier l\'amélioration' : 'Nouvelle amélioration'}
          </h3>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); if (isEdit) setUseNewDate(true); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                  Heure
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => { setTime(e.target.value); if (isEdit) setUseNewDate(true); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                />
              </div>
            </div>

            {isEdit && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateChoice"
                    checked={!useNewDate}
                    onChange={() => {
                      setUseNewDate(false);
                      setDate(new Date(initial!.created_at).toISOString().slice(0, 10));
                      setTime(new Date(initial!.created_at).toTimeString().slice(0, 5));
                    }}
                    className="accent-current"
                    style={{ accentColor: tokens.accent.text }}
                  />
                  <span className="text-xs" style={{ color: tokens.text.tertiary }}>Garder la date d'origine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateChoice"
                    checked={useNewDate}
                    onChange={() => {
                      setUseNewDate(true);
                      setDate(nowDate());
                      setTime(nowTime());
                    }}
                    className="accent-current"
                    style={{ accentColor: tokens.accent.text }}
                  />
                  <span className="text-xs" style={{ color: tokens.text.tertiary }}>Utiliser la date de modification</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
              >
                <option value="todo">À faire</option>
                <option value="done">Implémenté</option>
              </select>
            </div>

            {isEdit && categories && categories.length > 1 && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                  Catégorie
                </label>
                <select
                  value={categoryId ?? ''}
                  onChange={(e) => setCategoryId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                Amélioration
              </label>
              <textarea
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Décrivez ce qui a été amélioré..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.modal.fieldLabel }}>
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details supplementaires, contexte, liens..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
              />
            </div>
          </div>

          {saveError && (
            <div
              className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Erreur : {saveError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
