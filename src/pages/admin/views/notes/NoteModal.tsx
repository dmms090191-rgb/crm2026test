import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

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
      <span className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.8)' }}>{label}</span>
      {node}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    caretColor: '#22d3ee',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)',
          border: '1px solid rgba(56,189,248,0.15)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white">
            {initial ? 'Modifier la note' : 'Nouvelle note'}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
            style={{ color: 'rgba(148,163,184,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.6)'; e.currentTarget.style.background = 'transparent'; }}
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
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
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
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
              />
            ))}
            {field('Heure début', (
              <input
                type="time"
                value={form.time_start}
                onChange={(e) => setForm(f => ({ ...f, time_start: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
              />
            ))}
            {field('Heure fin', (
              <input
                type="time"
                value={form.time_end}
                onChange={(e) => setForm(f => ({ ...f, time_end: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
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
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
            />
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.8)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(148,163,184,0.8)'; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: saving ? 'rgba(34,211,238,0.06)' : 'rgba(34,211,238,0.12)',
                border: '1px solid rgba(34,211,238,0.3)',
                color: saving ? 'rgba(103,232,249,0.5)' : '#67e8f9',
              }}
              onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = 'rgba(34,211,238,0.18)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = saving ? 'rgba(34,211,238,0.06)' : 'rgba(34,211,238,0.12)'; }}
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
