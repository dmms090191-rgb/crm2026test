import { useState, useEffect } from 'react';
import { X, Lightbulb, Clock, CheckCircle2 } from 'lucide-react';
import type { IdeaStatus } from './IdeasView';

export interface IdeaFormData {
  title: string;
  content: string;
  idea_date: string;
  status: IdeaStatus;
}

interface Props {
  initial?: IdeaFormData;
  onSave: (data: IdeaFormData) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: IdeaStatus; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  { value: 'idea', label: 'Idée', icon: <Lightbulb className="w-3.5 h-3.5" />, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { value: 'todo', label: 'À faire', icon: <Clock className="w-3.5 h-3.5" />, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
  { value: 'done', label: 'Implémenté', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)' },
];

export default function IdeaModal({ initial, onSave, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [idea_date] = useState(initial?.idea_date ?? today);
  const [status, setStatus] = useState<IdeaStatus>(initial?.status ?? 'idea');

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
    onSave({ title: title.trim(), content, idea_date, status });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              {initial ? "Modifier l'idée" : 'Nouvelle idée'}
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
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Date
              </label>
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(148,163,184,0.5)',
                }}
              >
                {new Date(idea_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Statut
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex-1 justify-center"
                  style={{
                    background: status === opt.value ? opt.bg : 'rgba(255,255,255,0.02)',
                    border: status === opt.value ? `1px solid ${opt.border}` : '1px solid rgba(255,255,255,0.06)',
                    color: status === opt.value ? opt.color : 'rgba(148,163,184,0.5)',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Titre <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de l'idée…"
              style={inputStyle}
              autoFocus
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; e.currentTarget.style.background = 'rgba(34,211,238,0.02)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Description
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez l'idée en détail…"
              rows={5}
              style={{ ...inputStyle, resize: 'none', lineHeight: '1.6' }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(34,211,238,0.3)'; e.currentTarget.style.background = 'rgba(34,211,238,0.02)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
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
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.12)'; }}
            >
              {initial ? "Enregistrer" : "Ajouter l'idée"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
