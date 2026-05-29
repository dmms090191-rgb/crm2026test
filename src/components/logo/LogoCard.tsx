import { useState } from 'react';
import {
  Check, Trash2, ChevronUp, ChevronDown, Loader2, Pencil,
  GripVertical, Shield,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

export interface CompanyLogo {
  id: string;
  company_id: string;
  url: string;
  file_name: string;
  is_active: boolean;
  position: number;
  created_at: string;
}

interface Props {
  logo: CompanyLogo;
  reordering: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onEdit: (logo: CompanyLogo) => void;
  selecting: boolean;
  deleting: boolean;
}

const CHECKER_BG = `
  linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%),
  linear-gradient(-45deg, rgba(0,0,0,0.04) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.04) 75%),
  linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.04) 75%)
`;

function isPngTransparent(url: string): boolean {
  return url.toLowerCase().includes('.png') || url.toLowerCase().includes('transparent');
}

export default function LogoCard({
  logo, reordering, isFirst, isLast,
  onSelect, onDelete, onMoveUp, onMoveDown, onEdit,
  selecting, deleting,
}: Props) {
  const t = useThemeTokens();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);
  const busy = selecting || deleting;
  const isTransparent = isPngTransparent(logo.url);

  const displayName = logo.file_name || new Date(logo.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const dateStr = new Date(logo.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        background: t.surface.primary,
        border: `1px solid ${logo.is_active ? 'rgba(22,163,106,0.4)' : hovered ? 'rgba(245,158,11,0.3)' : t.surface.border}`,
        boxShadow: logo.is_active
          ? '0 0 0 1px rgba(22,163,106,0.08), 0 4px 16px rgba(22,163,106,0.08)'
          : hovered
            ? '0 8px 24px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.03)',
        transform: hovered && !reordering ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Preview area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          background: isTransparent ? CHECKER_BG : `linear-gradient(180deg, ${t.surface.secondary} 0%, ${t.surface.primary} 100%)`,
          backgroundSize: isTransparent ? '12px 12px' : undefined,
          backgroundPosition: isTransparent ? '0 0, 0 6px, 6px -6px, -6px 0px' : undefined,
          minHeight: 140,
          padding: '20px 16px',
        }}
      >
        {reordering && (
          <div
            className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            <GripVertical className="w-4 h-4" style={{ color: t.text.quaternary }} />
          </div>
        )}

        <img
          src={logo.url}
          alt={displayName}
          className="max-h-[100px] max-w-full object-contain transition-transform duration-200"
          style={{ transform: hovered && !reordering ? 'scale(1.05)' : 'scale(1)' }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
        />

        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {logo.is_active && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide"
              style={{
                background: 'rgba(22,163,106,0.12)',
                color: '#16a34a',
                border: '1px solid rgba(22,163,106,0.2)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Shield className="w-3 h-3" />
              Actif
            </span>
          )}
          {isTransparent && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-bold tracking-wide"
              style={{
                background: 'rgba(14,165,233,0.1)',
                color: '#0284c7',
                border: '1px solid rgba(14,165,233,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              PNG
            </span>
          )}
        </div>
      </div>

      {/* Info + actions */}
      <div
        className="px-3.5 py-3 space-y-2.5"
        style={{ borderTop: `1px solid ${t.surface.border}` }}
      >
        {/* Title & date */}
        <div>
          <p
            className="text-[11px] sm:text-xs font-semibold truncate leading-tight"
            style={{ color: t.text.primary }}
          >
            {displayName}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: t.text.quaternary }}>
            {dateStr}
          </p>
        </div>

        {/* Actions */}
        {reordering ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => onMoveUp(logo.id)}
              disabled={isFirst}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold disabled:opacity-20 transition-all"
              style={{
                background: t.surface.secondary,
                border: `1px solid ${t.surface.border}`,
                color: t.text.tertiary,
              }}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveDown(logo.id)}
              disabled={isLast}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold disabled:opacity-20 transition-all"
              style={{
                background: t.surface.secondary,
                border: `1px solid ${t.surface.border}`,
                color: t.text.tertiary,
              }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            {!logo.is_active && (
              <button
                onClick={() => onSelect(logo.id)}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(14,165,233,0.2)',
                }}
              >
                {selecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Selectionner
              </button>
            )}
            <button
              onClick={() => onEdit(logo)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)',
                color: '#d97706',
              }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  color: '#ef4444',
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => { onDelete(logo.id); setConfirmDelete(false); }}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                style={{ background: '#ef4444', color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
