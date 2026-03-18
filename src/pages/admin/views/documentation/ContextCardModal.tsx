import { useState, useEffect } from 'react';
import { X, Bot } from 'lucide-react';

export interface ContextCardFormData {
  title: string;
  content: string;
}

interface Props {
  initial?: ContextCardFormData;
  onSave: (data: ContextCardFormData) => void;
  onClose: () => void;
}

const inputStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#e2e8f0',
  caretColor: '#22d3ee',
  outline: 'none',
  width: '100%',
  padding: '10px 12px',
  fontSize: '13px',
} as React.CSSProperties;

export default function ContextCardModal({ initial, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), content });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)',
          border: '1px solid rgba(34,211,238,0.12)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: '#22d3ee' }} />
            <h2 className="text-sm font-semibold text-slate-200">
              {initial ? 'Modifier le contexte' : 'Nouveau contexte'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors duration-150"
            style={{ color: 'rgba(148,163,184,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Titre <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Architecture du projet, Stack technique…"
              style={inputStyle}
              autoFocus
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)';
                e.currentTarget.style.background = 'rgba(34,211,238,0.02)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Contenu
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez ce contexte en détail. Ce texte sera copié tel quel pour ChatGPT…"
              rows={8}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)';
                e.currentTarget.style.background = 'rgba(34,211,238,0.02)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.1)'; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.1)'; }}
            >
              {initial ? 'Enregistrer' : 'Ajouter le contexte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
