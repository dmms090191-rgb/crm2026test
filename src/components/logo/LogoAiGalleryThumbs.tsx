import { Check, Heart, GripVertical } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo } from './logoAiTypes';
import { CHECKER_BG } from './logoAiTypes';

interface GalleryThumbProps {
  logo: SavedLogo;
  t: ReturnType<typeof useThemeTokens>;
  isSelected: boolean;
  onToggleFavorite: (id: string, fav: boolean) => void;
  onClick: () => void;
  selectionMode?: boolean;
  checked?: boolean;
  onToggleCheck?: (id: string) => void;
  reordering?: boolean;
  idx?: number;
  isDragTarget?: boolean;
  onDragStart?: (idx: number) => void;
  onDragOver?: (e: React.DragEvent, idx: number) => void;
  onDrop?: (e: React.DragEvent, idx: number) => void;
  onDragEnd?: () => void;
}

export function GalleryThumb({
  logo, t, isSelected, onToggleFavorite, onClick, selectionMode, checked, onToggleCheck,
  reordering, idx, isDragTarget, onDragStart, onDragOver, onDrop, onDragEnd,
}: GalleryThumbProps) {
  const isPng = logo.url?.toLowerCase().includes('.png');
  const displayName = logo.file_name || 'Logo';
  const d = new Date(logo.created_at);
  const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  const handleClick = selectionMode && onToggleCheck ? () => onToggleCheck(logo.id) : reordering ? undefined : onClick;

  const card = (
    <div className={`flex-shrink-0 w-[124px] rounded-xl overflow-hidden transition-all group/thumb ${reordering ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={reordering}
      onDragStart={reordering && idx !== undefined && onDragStart ? () => onDragStart(idx) : undefined}
      onDragEnd={reordering && onDragEnd ? onDragEnd : undefined}
      style={{
        border: selectionMode && checked
          ? '2px solid #0ea5e9'
          : isSelected && !reordering
            ? '2px solid #f59e0b'
            : reordering
              ? '1px dashed rgba(245,158,11,0.4)'
              : `1.5px solid ${logo.is_active ? 'rgba(22,163,106,0.3)' : t.surface.border}`,
        boxShadow: selectionMode && checked
          ? '0 0 0 2px rgba(14,165,233,0.2), 0 4px 16px rgba(14,165,233,0.08)'
          : isSelected && !reordering
            ? '0 0 0 2px rgba(245,158,11,0.15), 0 4px 16px rgba(245,158,11,0.08)'
            : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: selectionMode ? 'pointer' : reordering ? 'grab' : undefined,
      }}>
      <button onClick={handleClick} className="w-full focus:outline-none" disabled={reordering}>
        <div className="relative aspect-square flex items-center justify-center p-3"
          style={{
            background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
            backgroundSize: isPng ? '14px 14px' : undefined,
            backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.28) 100%)' }} />
          <img src={logo.url} alt={displayName}
            className={`relative max-h-[72px] max-w-[90px] object-contain transition-transform ${reordering ? '' : 'group-hover/thumb:scale-110'}`}
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          {reordering && (
            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(4px)' }}>
              <GripVertical className="w-3 h-3" style={{ color: '#d97706' }} />
            </span>
          )}
          {logo.is_active && !selectionMode && !reordering && (
            <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[7px] font-bold"
              style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)' }}>
              Actif
            </span>
          )}
          {selectionMode && (
            <span className="absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all"
              style={checked ? {
                background: '#0ea5e9', border: '2px solid #0ea5e9', boxShadow: '0 1px 4px rgba(14,165,233,0.3)',
              } : {
                background: 'rgba(255,255,255,0.9)', border: `2px solid ${t.surface.border}`, backdropFilter: 'blur(4px)',
              }}>
              {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
          )}
          {!selectionMode && !reordering && isSelected && (
            <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <Check className="w-2 h-2 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
      </button>
      <div className="px-2 py-1.5 flex items-center gap-1"
        style={{
          background: `linear-gradient(180deg, ${t.surface.primary}, ${t.surface.secondary})`,
          borderTop: `1px solid ${t.surface.border}`,
        }}>
        <button onClick={handleClick} className="flex-1 min-w-0 text-left focus:outline-none" disabled={reordering}>
          <p className="text-[10px] font-extrabold truncate leading-tight" style={{ color: selectionMode && checked ? '#0284c7' : isSelected && !reordering ? '#d97706' : t.text.primary }}>{displayName}</p>
          <p className="text-[8px] font-bold mt-0.5 tabular-nums" style={{ color: t.text.secondary }}>{dateStr}</p>
        </button>
        {!selectionMode && !reordering && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(logo.id, !logo.is_favorite); }}
            className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${logo.is_favorite ? '' : 'opacity-0 group-hover/thumb:opacity-100'}`}
            style={logo.is_favorite ? { background: 'rgba(239,68,68,0.1)' } : {}}
            title={logo.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className="w-3 h-3 transition-all"
              style={{ color: logo.is_favorite ? '#ef4444' : t.text.quaternary }}
              fill={logo.is_favorite ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );

  if (reordering) {
    return (
      <div className="flex-shrink-0 flex items-stretch"
        onDragOver={idx !== undefined && onDragOver ? (e) => onDragOver(e, idx) : undefined}
        onDrop={idx !== undefined && onDrop ? (e) => onDrop(e, idx) : undefined}
      >
        {isDragTarget && (
          <div className="w-[3px] flex-shrink-0 rounded-full self-stretch -mr-0.5 z-10"
            style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
        )}
        {card}
      </div>
    );
  }

  return card;
}

interface MobileGalleryThumbProps {
  logo: SavedLogo;
  t: ReturnType<typeof useThemeTokens>;
  isSelected: boolean;
  onToggleFavorite: (id: string, fav: boolean) => void;
  onClick: () => void;
  selectionMode?: boolean;
  checked?: boolean;
  onToggleCheck?: (id: string) => void;
}

export function MobileGalleryThumb({ logo, t, isSelected, onToggleFavorite, onClick, selectionMode, checked, onToggleCheck }: MobileGalleryThumbProps) {
  const isPng = logo.url?.toLowerCase().includes('.png');
  const displayName = logo.file_name || 'Logo';
  const handleClick = selectionMode && onToggleCheck ? () => onToggleCheck(logo.id) : onClick;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        border: selectionMode && checked
          ? '2px solid #0ea5e9'
          : isSelected
            ? '2px solid #f59e0b'
            : `1px solid ${logo.is_active ? 'rgba(22,163,106,0.3)' : t.surface.border}`,
        boxShadow: selectionMode && checked
          ? '0 0 0 2px rgba(14,165,233,0.2)'
          : isSelected ? '0 0 0 2px rgba(245,158,11,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}>
      <button onClick={handleClick} className="w-full focus:outline-none">
        <div className="relative aspect-square flex items-center justify-center p-4"
          style={{
            background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
            backgroundSize: isPng ? '14px 14px' : undefined,
            backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.18) 100%)' }} />
          <img src={logo.url} alt={displayName}
            className="relative max-h-full max-w-full object-contain"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          {logo.is_active && !selectionMode && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(22,163,106,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.25)' }}>
              Actif
            </span>
          )}
          {selectionMode && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-all"
              style={checked ? {
                background: '#0ea5e9', border: '2px solid #0ea5e9', boxShadow: '0 1px 4px rgba(14,165,233,0.3)',
              } : {
                background: 'rgba(255,255,255,0.9)', border: `2px solid ${t.surface.border}`, backdropFilter: 'blur(4px)',
              }}>
              {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
          )}
          {!selectionMode && isSelected && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
      </button>
      <div className="px-2.5 py-2 flex items-center gap-1.5" style={{ background: t.surface.primary, borderTop: `1px solid ${t.surface.border}` }}>
        <button onClick={handleClick} className="flex-1 min-w-0 text-left focus:outline-none">
          <p className="text-[11px] font-extrabold truncate leading-tight" style={{ color: selectionMode && checked ? '#0284c7' : isSelected ? '#d97706' : t.text.primary }}>{displayName}</p>
        </button>
        {!selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(logo.id, !logo.is_favorite); }}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={logo.is_favorite ? { background: 'rgba(239,68,68,0.1)' } : {}}>
            <Heart className="w-3.5 h-3.5 transition-all"
              style={{ color: logo.is_favorite ? '#ef4444' : t.text.quaternary }}
              fill={logo.is_favorite ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}
