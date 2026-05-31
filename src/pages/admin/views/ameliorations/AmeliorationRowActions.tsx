import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import type { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { AmeliorationCategory } from './types';

interface Props {
  itemId: string;
  categoryId: string | null;
  tokens: ReturnType<typeof useThemeTokens>;
  confirmDeleteId: string | null;
  categories?: AmeliorationCategory[];
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onTransfer?: (targetCategoryId: string) => void;
  variant: 'mobile' | 'desktop';
}

export default function AmeliorationRowActions({
  itemId, categoryId, tokens, confirmDeleteId, categories,
  onEdit, onDelete, onConfirmDelete, onCancelDelete, onTransfer, variant,
}: Props) {
  const [transferOpen, setTransferOpen] = useState(false);
  const transferRef = useRef<HTMLDivElement>(null);
  const otherCategories = (categories ?? []).filter((c) => c.id !== categoryId);

  useEffect(() => {
    if (!transferOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (transferRef.current && !transferRef.current.contains(e.target as Node)) {
        setTransferOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [transferOpen]);

  if (confirmDeleteId === itemId) {
    return (
      <div className={`flex items-center gap-2 ${variant === 'desktop' ? 'shrink-0 ml-2' : ''}`}>
        <span className="text-xs" style={{ color: tokens.danger.text }}>Supprimer ?</span>
        <button onClick={onDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>Oui</button>
        <button onClick={onCancelDelete} className="px-2 py-1 rounded text-xs font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}>Non</button>
      </div>
    );
  }

  const isMobile = variant === 'mobile';

  return (
    <div className={`flex items-center gap-1.5 ${isMobile ? '' : 'shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: tokens.text.tertiary }}
        onMouseEnter={isMobile ? undefined : (e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; }}
        onMouseLeave={isMobile ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; }}
        title="Modifier"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {otherCategories.length > 0 && onTransfer && (
        <div className="relative" ref={transferRef}>
          <button
            onClick={() => setTransferOpen(!transferOpen)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: transferOpen ? tokens.accent.text : tokens.text.tertiary, background: transferOpen ? tokens.accent.bg : 'transparent' }}
            onMouseEnter={isMobile ? undefined : (e) => { if (!transferOpen) { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; } }}
            onMouseLeave={isMobile ? undefined : (e) => { if (!transferOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; } }}
            title="Transferer vers..."
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          {transferOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}
            >
              <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: tokens.text.quaternary }}>
                Transferer vers
              </div>
              {otherCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { onTransfer(cat.id); setTransferOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 text-xs transition-colors"
                  style={{ color: tokens.text.secondary }}
                  onMouseEnter={isMobile ? undefined : (e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.color = tokens.accent.text; }}
                  onMouseLeave={isMobile ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.secondary; }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        onClick={onConfirmDelete}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: tokens.text.tertiary }}
        onMouseEnter={isMobile ? undefined : (e) => { e.currentTarget.style.background = tokens.danger.bg; e.currentTarget.style.color = tokens.danger.text; }}
        onMouseLeave={isMobile ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.text.tertiary; }}
        title="Supprimer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
