import { Check, Sparkles, Star, Flame, Zap, Award, Crown } from 'lucide-react';
import type { ThemeEntry } from './themeData';

const TAG_ICONS: Record<string, typeof Star> = { nouveau: Zap, populaire: Flame, luxury: Star, neon: Sparkles };
const TAG_COLORS: Record<string, string> = {
  nouveau: '#22d3ee', populaire: '#f97316', luxury: '#d4af37',
  neon: '#ec4899', pro: '#3b82f6', minimal: '#6b7280',
};

export function ThemeCard({ entry, active, onSelect, isRecommended, isFavorite, isPremium, onToggleFavorite }: {
  entry: ThemeEntry; active: boolean; onSelect: () => void;
  isRecommended?: boolean; isFavorite?: boolean; isPremium?: boolean;
  onToggleFavorite?: () => void;
}) {
  const accent = entry.colors[2];
  const firstTag = entry.tags[0];
  const TagIcon = firstTag ? TAG_ICONS[firstTag] : null;
  const tagColor = firstTag ? TAG_COLORS[firstTag] || '#6b7280' : '';

  const badgeLabel = isRecommended ? 'Recommande' : isPremium ? 'Premium' : null;
  const badgeColor = isRecommended ? '#3b82f6' : isPremium ? '#a78bfa' : '';
  const BadgeIcon = isRecommended ? Award : isPremium ? Crown : null;

  return (
    <button
      onClick={onSelect}
      className="ts-card group relative flex flex-col rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
      style={{
        background: active ? `linear-gradient(165deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.025)',
        border: active ? `1.5px solid ${accent}60` : '1px solid rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 0 1px ${accent}15, 0 12px 40px ${accent}12, 0 0 24px ${accent}08` : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {active && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: accent, boxShadow: `0 2px 12px ${accent}50` }}>
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      {badgeLabel && BadgeIcon ? (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: `${badgeColor}18`, border: `1px solid ${badgeColor}30`, color: badgeColor }}>
          <BadgeIcon className="w-2.5 h-2.5" />
          {badgeLabel}
        </div>
      ) : firstTag ? (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: `${tagColor}18`, border: `1px solid ${tagColor}30`, color: tagColor }}>
          {TagIcon && <TagIcon className="w-2.5 h-2.5" />}
          {firstTag}
        </div>
      ) : null}
      <div className="p-3 pb-0 sm:p-4 sm:pb-0">
        <ThemePreview colors={entry.colors} />
      </div>
      <div className="p-3 pt-3 sm:p-4 sm:pt-3.5 flex items-end gap-1">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[11px] sm:text-xs font-bold truncate" style={{ color: active ? accent : 'rgba(255,255,255,0.88)' }}>
            {entry.label}
          </span>
          <p className="text-[10px] font-medium leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
            {entry.description}
          </p>
        </div>
        {onToggleFavorite && (
          <FavoriteButton isFavorite={!!isFavorite} onClick={onToggleFavorite} />
        )}
      </div>
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${accent}20, 0 0 20px ${accent}06` }} />
    </button>
  );
}

export function FavoriteButton({ isFavorite, onClick }: { isFavorite: boolean; onClick: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onClick(); } }}
      className="flex-shrink-0 p-1 rounded-lg transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer"
      style={{
        color: isFavorite ? '#f59e0b' : 'rgba(255,255,255,0.18)',
      }}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Star
        className="w-3.5 h-3.5 transition-all duration-200"
        fill={isFavorite ? '#f59e0b' : 'transparent'}
        strokeWidth={2}
      />
    </span>
  );
}

export function ThemePreview({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden relative" style={{ background: colors[0] }}>
      <div className="absolute top-0 left-0 bottom-0 w-[22%]" style={{ background: `${colors[1]}18`, borderRight: `1px solid ${colors[2]}12` }}>
        <div className="p-2 space-y-2 mt-3">
          <div className="h-1.5 w-[60%] rounded-full" style={{ background: `${colors[2]}50` }} />
          <div className="h-1.5 w-[80%] rounded-full" style={{ background: `${colors[2]}20` }} />
          <div className="h-1.5 w-[50%] rounded-full" style={{ background: `${colors[2]}20` }} />
          <div className="h-1.5 w-[70%] rounded-full" style={{ background: `${colors[2]}20` }} />
        </div>
      </div>
      <div className="absolute top-0 left-[22%] right-0 bottom-0 p-2.5">
        <div className="h-3 rounded-md mb-2.5 flex items-center justify-between px-2" style={{ background: `${colors[1]}12` }}>
          <div className="h-1 w-[30%] rounded-full" style={{ background: `${colors[2]}30` }} />
          <div className="w-2 h-2 rounded-full" style={{ background: colors[2], boxShadow: `0 0 6px ${colors[2]}40` }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[70, 50].map((w, i) => (
            <div key={i} className="rounded-lg p-2" style={{ background: `${colors[1]}10`, border: `1px solid ${colors[2]}0a` }}>
              <div className="h-1 rounded-full mb-1.5" style={{ width: `${w}%`, background: `${colors[2]}25` }} />
              <div className="h-5 rounded" style={{ background: `linear-gradient(135deg, ${colors[2]}18, ${colors[2]}08)` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {[0.1, 0.06, 0.1].map((a, i) => (
            <div key={i} className="h-2.5 rounded" style={{ background: `${colors[1]}${Math.round(a * 255).toString(16).padStart(2, '0')}` }} />
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full" style={{ background: colors[2], boxShadow: `0 0 10px ${colors[2]}60` }} />
    </div>
  );
}
