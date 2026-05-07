import { useEffect } from 'react';
import { Pencil, Trash2, CheckCircle2, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { Idea, IdeaStatus, STATUS_CONFIG, STATUS_CYCLE, formatDate } from './ideasConstants';

interface IdeaDetailModalProps {
  idea: Idea;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: IdeaStatus) => void;
}

export default function IdeaDetailModal({ idea, onClose, onEdit, onDelete, onStatusChange }: IdeaDetailModalProps) {
  const tokens = useThemeTokens();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const s = STATUS_CONFIG[idea.status ?? 'todo'];
  const isDone = (idea.status ?? 'todo') === 'done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3 md:px-6"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full rounded-2xl flex flex-col max-w-[calc(100vw-24px)] md:max-w-[76vw]"
        style={{
          maxHeight: '85vh',
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div
          className="flex items-start justify-between gap-3 md:gap-4 px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5"
          style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold leading-tight mb-3 break-words text-base md:text-xl"
              style={{ color: tokens.modal.title, letterSpacing: '-0.01em' }}
            >
              {idea.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
              >
                {s.icon}
                {s.label}
              </span>
              <span className="text-xs" style={{ color: tokens.text.quaternary }}>
                {formatDate(idea.idea_date)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 flex-shrink-0 transition-all duration-150"
            style={{ color: tokens.modal.closeBtnText, background: tokens.modal.fieldBg, border: `1px solid ${tokens.surface.borderLight}` }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.modal.closeBtnHoverText; e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = tokens.modal.closeBtnText; e.currentTarget.style.background = tokens.modal.fieldBg; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6" style={{ minHeight: 0 }}>
          {idea.content ? (
            <p
              className="whitespace-pre-wrap break-words text-[13px] md:text-[0.9rem]"
              style={{
                color: tokens.text.secondary,
                lineHeight: '1.8',
                letterSpacing: '0.01em',
              }}
            >
              {idea.content}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: tokens.text.quaternary }}>
              Aucune description.
            </p>
          )}
        </div>

        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-8 py-4 md:py-5"
          style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_CYCLE.map((st) => {
              const cfg = STATUS_CONFIG[st];
              const isActive = (idea.status ?? 'todo') === st;
              return (
                <button
                  key={st}
                  onClick={() => onStatusChange(st)}
                  className="inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                    border: isActive ? `1px solid ${cfg.border}` : `1px solid ${tokens.surface.borderLight}`,
                    color: isActive ? cfg.color : tokens.text.quaternary,
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = tokens.surface.hover; e.currentTarget.style.color = tokens.text.tertiary; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = tokens.text.quaternary; } }}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.accent.bg; }}
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.13)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.danger.bg; }}
            >
              <Trash2 className="w-3 h-3" />
              Supprimer
            </button>
            <button
              onClick={() => onStatusChange(isDone ? 'todo' : 'done')}
              className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap"
              style={
                isDone
                  ? { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
                  : { background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: 'rgba(74,222,128,0.7)' }
              }
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.15)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.45)'; e.currentTarget.style.color = '#4ade80'; }}
              onMouseLeave={(e) => {
                if (isDone) { e.currentTarget.style.background = 'rgba(74,222,128,0.12)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.35)'; e.currentTarget.style.color = '#4ade80'; }
                else { e.currentTarget.style.background = 'rgba(74,222,128,0.07)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)'; e.currentTarget.style.color = 'rgba(74,222,128,0.7)'; }
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isDone ? 'Implemente' : 'Fait'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
