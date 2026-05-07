import { useState, useEffect } from 'react';
import { Bot, Pencil, Trash2, Copy, Check, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ContextCard } from './contextCardsTypes';
import { formatDate } from './contextCardsTypes';

export default function ContextDetailModal({
  card,
  onClose,
  onEdit,
  onDelete,
}: {
  card: ContextCard;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tokens = useThemeTokens();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleCopy() {
    const text = `${card.title}\n\n${card.content}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 flex-shrink-0" style={{ color: tokens.accent.text }} />
              <h2
                className="font-semibold leading-tight break-words text-base md:text-xl"
                style={{ color: tokens.modal.title, letterSpacing: '-0.01em' }}
              >
                {card.title}
              </h2>
            </div>
            <p className="text-xs mt-2" style={{ color: tokens.text.quaternary }}>
              {formatDate(card.created_at)}
            </p>
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
          {card.content ? (
            <p
              className="whitespace-pre-wrap break-words text-[13px] md:text-[0.9rem]"
              style={{ color: tokens.text.secondary, lineHeight: '1.8', letterSpacing: '0.01em' }}
            >
              {card.content}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: tokens.text.quaternary }}>
              Aucun contenu.
            </p>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2 px-4 md:px-8 py-4 md:py-5"
          style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}
        >
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
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap"
            style={
              copied
                ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
                : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.solid }
            }
            onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = tokens.accent.bgHover; } }}
            onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = tokens.accent.bg; } }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copie !' : 'Copier le contexte'}
          </button>
        </div>
      </div>
    </div>
  );
}
