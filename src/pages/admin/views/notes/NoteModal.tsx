import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface NoteFormData {
  title: string;
  content: string;
  note_date: string;
  time_start: string;
  time_end: string;
}

interface NoteModalProps {
  initial?: NoteFormData;
  onSave: (data: NoteFormData) => Promise<void>;
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NoteModal({ initial, onSave, onClose }: NoteModalProps) {
  const tokens = useThemeTokens();

  const [form, setForm] = useState<NoteFormData>(
    initial ?? { title: '', content: '', note_date: todayStr(), time_start: '', time_end: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Le titre est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: tokens.text.tertiary }}>{label}</span>
      {node}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    background: tokens.modal.fieldBg,
    border: `1px solid ${tokens.modal.fieldBorder}`,
    borderRadius: '8px',
    padding: '8px 12px',
    color: tokens.text.secondary,
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    caretColor: tokens.accent.text,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl flex flex-col"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}
        >
          <h3 className="text-sm font-semibold" style={{ color: tokens.modal.title }}>
            {initial ? 'Modifier la note' : 'Nouvelle note'}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
            style={{ color: tokens.modal.closeBtnText }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.modal.closeBtnHoverText; e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = tokens.modal.closeBtnText; e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {field('Titre', (
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre de la note"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`; }}
              onBlur={(e) => { e.currentTarget.style.border = `1px solid ${tokens.modal.fieldBorder}`; }}
              autoFocus
            />
          ))}

          <div className="grid grid-cols-3 gap-3">
            {field('Date', (
              <input
                type="date"
                value={form.note_date}
                onChange={(e) => setForm(f => ({ ...f, note_date: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`; }}
                onBlur={(e) => { e.currentTarget.style.border = `1px solid ${tokens.modal.fieldBorder}`; }}
              />
            ))}
            {field('Heure début', (
              <input
                type="time"
                value={form.time_start}
                onChange={(e) => setForm(f => ({ ...f, time_start: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`; }}
                onBlur={(e) => { e.currentTarget.style.border = `1px solid ${tokens.modal.fieldBorder}`; }}
              />
            ))}
            {field('Heure fin', (
              <input
                type="time"
                value={form.time_end}
                onChange={(e) => setForm(f => ({ ...f, time_end: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`; }}
                onBlur={(e) => { e.currentTarget.style.border = `1px solid ${tokens.modal.fieldBorder}`; }}
              />
            ))}
          </div>

          {field('Contenu', (
            <textarea
              value={form.content}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Contenu de la note…"
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit' }}
              onFocus={(e) => { e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`; }}
              onBlur={(e) => { e.currentTarget.style.border = `1px solid ${tokens.modal.fieldBorder}`; }}
            />
          ))}

          {error && <p className="text-xs" style={{ color: tokens.danger.text }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface.hover; e.currentTarget.style.color = tokens.text.secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.modal.fieldBg; e.currentTarget.style.color = tokens.text.tertiary; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: saving ? tokens.accent.bg : tokens.accent.bgHover,
                border: `1px solid ${tokens.accent.border}`,
                color: saving ? 'rgba(103,232,249,0.5)' : tokens.accent.text,
              }}
              onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = 'rgba(34,211,238,0.18)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = saving ? tokens.accent.bg : tokens.accent.bgHover; }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
