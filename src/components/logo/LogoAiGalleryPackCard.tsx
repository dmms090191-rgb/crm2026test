import { Heart, Layers, GripVertical } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo } from './logoAiTypes';
import { CHECKER_BG } from './logoAiTypes';

interface PackCardProps {
  logos: SavedLogo[];
  groupId: string;
  t: ReturnType<typeof useThemeTokens>;
  anySelected: boolean;
  anyChecked: boolean;
  isSelectionMode: boolean;
  onToggleFavorite: (id: string, fav: boolean) => void;
  onClick: () => void;
  variant: 'desktop' | 'mobile';
  reordering?: boolean;
  entryIdx?: number;
  onDragStart?: (idx: number) => void;
  onDragEnd?: () => void;
}

export default function LogoAiGalleryPackCard({
  logos, groupId, t, anySelected, anyChecked, isSelectionMode, onToggleFavorite, onClick,
  variant, reordering, entryIdx, onDragStart, onDragEnd,
}: PackCardProps) {
  const isDesktop = variant === 'desktop';
  const d = new Date(logos[0].created_at);
  const groupDate = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const allFav = logos.every(l => l.is_favorite);

  return (
    <div key={groupId}
      className={`${isDesktop ? 'flex-shrink-0 w-[180px]' : 'col-span-2'} rounded-xl overflow-hidden transition-all ${isDesktop ? 'group/family' : ''} ${reordering ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={reordering}
      onDragStart={reordering && entryIdx !== undefined && onDragStart ? () => onDragStart(entryIdx) : undefined}
      onDragEnd={reordering && onDragEnd ? onDragEnd : undefined}
      style={{
        border: reordering
          ? '1px dashed rgba(245,158,11,0.4)'
          : anySelected ? '2px solid #f59e0b'
          : anyChecked && isSelectionMode ? '2px solid #0ea5e9'
          : `1px solid rgba(245,158,11,0.25)`,
        boxShadow: anySelected && !reordering
          ? '0 0 0 2px rgba(245,158,11,0.15), 0 3px 12px rgba(245,158,11,0.1)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        background: `linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.02))`,
      }}>
      <button onClick={reordering ? undefined : onClick}
        className="w-full focus:outline-none" disabled={reordering}>
        <div className="flex relative">
          {reordering && isDesktop && (
            <span className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(4px)' }}>
              <GripVertical className="w-3 h-3" style={{ color: '#d97706' }} />
            </span>
          )}
          {logos.map((logo, li) => {
            const isPng = logo.url?.toLowerCase().includes('.png');
            const imgSize = isDesktop ? 'max-h-[56px] max-w-[72px]' : 'max-h-[64px] max-w-[80px]';
            const padding = isDesktop ? 'p-2' : 'p-3';
            return (
              <div key={logo.id} className={`flex-1 aspect-square flex items-center justify-center relative ${padding}`}
                style={{
                  background: isPng ? CHECKER_BG : `linear-gradient(160deg, ${t.surface.primary}, ${t.surface.secondary})`,
                  backgroundSize: isPng ? '14px 14px' : undefined,
                  backgroundPosition: isPng ? '0 0,0 7px,7px -7px,-7px 0px' : undefined,
                  borderRight: li < logos.length - 1 ? `1px solid rgba(245,158,11,0.1)` : undefined,
                }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.28) 100%)' }} />
                <img src={logo.url} alt={logo.file_name}
                  className={`relative ${imgSize} object-contain transition-transform ${reordering ? '' : isDesktop ? 'group-hover/family:scale-105' : ''}`}
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
              </div>
            );
          })}
        </div>
      </button>
      <div className={`${isDesktop ? 'px-2 py-1.5' : 'px-2.5 py-2'} flex items-center gap-${isDesktop ? '1' : '1.5'}`}
        style={{
          background: `linear-gradient(180deg, ${t.surface.primary}, ${t.surface.secondary})`,
          borderTop: `1px solid rgba(245,158,11,0.18)`,
        }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Layers className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0`} style={{ color: '#d97706' }} />
            <span className={`text-[${isDesktop ? '8' : '9'}px] font-extrabold uppercase tracking-wider`} style={{ color: '#d97706' }}>Pack</span>
          </div>
          <p className={`text-[${isDesktop ? '8' : '9'}px] font-semibold tabular-nums`} style={{ color: t.text.secondary }}>{groupDate}</p>
        </div>
        {!isSelectionMode && !reordering && (
          <button
            onClick={(e) => { e.stopPropagation(); logos.forEach(l => onToggleFavorite(l.id, !allFav)); }}
            className={`flex-shrink-0 ${isDesktop ? 'w-5 h-5' : 'w-7 h-7'} rounded-full flex items-center justify-center transition-all ${isDesktop && !allFav ? 'opacity-0 group-hover/family:opacity-100' : ''}`}
            style={allFav ? { background: 'rgba(239,68,68,0.1)' } : {}}>
            <Heart className={`${isDesktop ? 'w-3 h-3' : 'w-3.5 h-3.5'} transition-all`}
              style={{ color: allFav ? '#ef4444' : t.text.quaternary }}
              fill={allFav ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}
