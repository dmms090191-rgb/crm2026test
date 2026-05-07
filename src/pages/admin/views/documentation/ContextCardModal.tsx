import { useState, useEffect } from 'react';
import { X, Bot } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface ContextCardFormData {
  title: string;
  content: string;
}

interface Props {
  initial?: ContextCardFormData;
  onSave: (data: ContextCardFormData) => void;
  onClose: () => void;
}

export default function ContextCardModal({ initial, onSave, onClose }: Props) {
  const tokens = useThemeTokens();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  const inputStyle = {
    background: tokens.input.bg,
    border: `1px solid ${tokens.input.border}`,
    borderRadius: '8px',
    color: tokens.input.text,
    caretColor: tokens.accent.solid,
    outline: 'none',
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
  } as React.CSSProperties;

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
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: tokens.accent.solid }} />
            <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>
              {initial ? 'Modifier le contexte' : 'Nouveau contexte'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors duration-150"
            style={{ color: tokens.text.tertiary }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.tertiary; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: tokens.text.tertiary }}>
              Titre <span style={{ color: tokens.danger.text }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Architecture du projet, Stack technique…"
              style={inputStyle}
              autoFocus
              onFocus={(e) => {
                e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`;
                e.currentTarget.style.background = tokens.accent.bg;
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1px solid ${tokens.input.border}`;
                e.currentTarget.style.background = tokens.input.bg;
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: tokens.text.tertiary }}>
              Contenu
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez ce contexte en détail. Ce texte sera copié tel quel pour ChatGPT…"
              rows={8}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
              onFocus={(e) => {
                e.currentTarget.style.border = `1px solid ${tokens.input.borderFocus}`;
                e.currentTarget.style.background = tokens.accent.bg;
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1px solid ${tokens.input.border}`;
                e.currentTarget.style.background = tokens.input.bg;
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: tokens.text.tertiary }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.1)'; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.solid }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.accent.bg; }}
            >
              {initial ? 'Enregistrer' : 'Ajouter le contexte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
