import { X, Sparkles, Layers, Search, Check, Paintbrush, Star, Share2 } from 'lucide-react';
import type { ThemeEntry } from './themeData';
import { FavoriteButton } from './ThemeCard';
import { CUSTOM_CATEGORY, FAV_TAB, PERSONAL_TAB, COMMUNITY_TAB, type ThemeConfigLite, type CustomThemeRow } from './themeSelectorTypes';

export function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color }}>{icon}</span>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: `${color}cc` }}>{label}</span>
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${color}18`, color: `${color}99` }}>{count}</span>
    </div>
  );
}

export function ModalHeader({ search, onSearchChange, onClose, themeCount }: {
  search: string; onSearchChange: (s: string) => void; onClose: () => void; themeCount: number;
}) {
  return (
    <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.10))', border: '1px solid rgba(59,130,246,0.20)', boxShadow: '0 0 24px rgba(59,130,246,0.08)' }}>
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold tracking-tight text-white/95">Bibliotheque de themes</h2>
          <p className="text-[10px] sm:text-xs mt-0.5 font-medium text-white/35">{themeCount} themes disponibles</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] focus-within:border-blue-500/40 transition-colors w-52">
          <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => onSearchChange(e.target.value)} className="bg-transparent text-xs text-white/90 placeholder-white/25 outline-none flex-1 font-medium" />
        </div>
        <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white/70">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}

export function TabBar({ tab, onTab, activeTheme, themes, tabs, configMap, customThemeCount, customThemeKey, favCount, userFavorites, personalCount, communityCount }: {
  tab: string; onTab: (t: string) => void; activeTheme: string;
  themes: ThemeEntry[]; tabs: { key: string; label: string }[];
  configMap: Map<string, ThemeConfigLite>;
  customThemeCount: number;
  customThemeKey: string | null;
  favCount: number;
  userFavorites: Set<string>;
  personalCount?: number;
  communityCount?: number;
}) {
  const activeCategory = (() => {
    if (customThemeKey) return CUSTOM_CATEGORY;
    const cfg = configMap.get(activeTheme);
    if (cfg) return cfg.category;
    return themes.find(t => t.value === activeTheme)?.category;
  })();

  const activeIsFavorite = customThemeKey ? userFavorites.has(customThemeKey) : userFavorites.has(activeTheme);

  return (
    <div className="px-5 sm:px-8 flex gap-1.5 sm:gap-2 pb-4 sm:pb-5 flex-shrink-0 overflow-x-auto no-scrollbar">
      {tabs.map(t => {
        const isActive = tab === t.key;
        const isCustomTab = t.key === CUSTOM_CATEGORY;
        const isFavTab = t.key === FAV_TAB;
        const isPersonalTab = t.key === PERSONAL_TAB;
        const isCommunityTab = t.key === COMMUNITY_TAB;
        const count = t.key === 'all'
          ? themes.length + customThemeCount
          : isFavTab
          ? favCount
          : isCustomTab
          ? customThemeCount
          : isPersonalTab
          ? (personalCount ?? 0)
          : isCommunityTab
          ? (communityCount ?? 0)
          : themes.filter(th => {
              const cfg = configMap.get(th.value);
              const cat = cfg?.category || th.category;
              return cat === t.key;
            }).length;
        const hasActive = t.key === 'all'
          || t.key === activeCategory
          || (t.key === 'glass' && activeTheme === 'glass')
          || (isFavTab && activeIsFavorite);
        if (t.key !== 'all' && !isCustomTab && !isFavTab && !isPersonalTab && !isCommunityTab && t.key !== 'glass' && count === 0) return null;

        const accentColor = isCustomTab || isFavTab || isPersonalTab ? '#f59e0b' : isCommunityTab ? '#22d3ee' : '#3b82f6';
        return (
          <button key={t.key} onClick={() => onTab(t.key)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex-shrink-0" style={{ background: isActive ? `${accentColor}1f` : 'transparent', border: isActive ? `1px solid ${accentColor}40` : '1px solid transparent', color: isActive ? accentColor : 'rgba(255,255,255,0.40)', boxShadow: isActive ? `0 2px 12px ${accentColor}10` : 'none' }}>
            {isFavTab && <Star className="w-3 h-3" />}
            {isCustomTab && <Paintbrush className="w-3 h-3" />}
            {isPersonalTab && <Paintbrush className="w-3 h-3" />}
            {isCommunityTab && <Share2 className="w-3 h-3" />}
            {t.key === 'glass' && <Layers className="w-3 h-3" />}
            {t.key === 'premium' && <Sparkles className="w-3 h-3" />}
            {t.label}
            {t.key !== 'glass' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: isActive ? `${accentColor}1f` : 'rgba(255,255,255,0.05)', color: isActive ? accentColor : 'rgba(255,255,255,0.25)' }}>{count}</span>
            )}
            {hasActive && !isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accentColor }} />}
          </button>
        );
      })}
    </div>
  );
}

export function CustomThemeCard({ ct, active, onSelect, isFavorite, onToggleFavorite, isShared }: {
  ct: CustomThemeRow; active: boolean; onSelect: () => void;
  isFavorite?: boolean; onToggleFavorite?: () => void; isShared?: boolean;
}) {
  const tokens = ct.theme_tokens;
  const z1 = tokens?.zone_css?.zone1;
  const z2 = tokens?.zone_css?.zone2;
  const z3 = tokens?.zone_css?.zone3;
  const z4 = tokens?.zone_css?.zone4;
  const accent = '#f59e0b';

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
      style={{
        background: active ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)',
        border: active ? '1.5px solid rgba(245,158,11,0.50)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: active ? '0 0 0 1px rgba(245,158,11,0.10), 0 12px 40px rgba(245,158,11,0.10), 0 0 24px rgba(245,158,11,0.06)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {active && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: accent, boxShadow: `0 2px 12px ${accent}50` }}>
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: isShared ? 'rgba(34,211,238,0.12)' : 'rgba(245,158,11,0.12)', border: isShared ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(245,158,11,0.25)', color: isShared ? '#22d3ee' : '#f59e0b' }}>
        {isShared ? <Share2 className="w-2.5 h-2.5" /> : <Paintbrush className="w-2.5 h-2.5" />}
        {isShared ? 'Communaute' : 'Personnel'}
      </div>

      <div className="p-3 pb-0 sm:p-4 sm:pb-0">
        <CustomThemePreview z1={z1} z2={z2} z3={z3} z4={z4} />
      </div>

      <div className="p-3 pt-3 sm:p-4 sm:pt-3.5 flex items-end gap-1">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[11px] sm:text-xs font-bold truncate" style={{ color: active ? accent : 'rgba(255,255,255,0.88)' }}>
            {ct.label}
          </span>
          <p className="text-[10px] font-medium leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Theme personnalise
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

function CustomThemePreview({ z1, z2, z3, z4 }: { z1?: string | null; z2?: string | null; z3?: string | null; z4?: string | null }) {
  const mainBg = z4 || '#0c101c';
  const sidebarBg = z2 || 'rgba(255,255,255,0.05)';
  const topbarBg = z3 || 'rgba(255,255,255,0.03)';
  const logoBg = z1 || sidebarBg;

  return (
    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden relative" style={{ background: mainBg }}>
      <div className="absolute top-0 left-0 bottom-0 w-[22%] flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="h-[18%] flex-shrink-0" style={{ background: logoBg, borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
        <div className="flex-1" style={{ background: sidebarBg }}>
          <div className="p-2 space-y-2 mt-1.5">
            <div className="h-1.5 w-[60%] rounded-full bg-white/20" />
            <div className="h-1.5 w-[80%] rounded-full bg-white/10" />
            <div className="h-1.5 w-[50%] rounded-full bg-white/10" />
            <div className="h-1.5 w-[70%] rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="absolute top-0 left-[22%] right-0 bottom-0 flex flex-col">
        <div className="h-3 flex items-center justify-between px-2 flex-shrink-0" style={{ background: topbarBg }}>
          <div className="h-1 w-[30%] rounded-full bg-white/15" />
          <div className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 6px rgba(245,158,11,0.4)' }} />
        </div>
        <div className="flex-1 p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {[70, 50].map((w, i) => (
              <div key={i} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="h-1 rounded-full mb-1.5" style={{ width: `${w}%`, background: 'rgba(245,158,11,0.20)' }} />
                <div className="h-5 rounded" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))' }} />
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {[0.06, 0.04, 0.06].map((a, i) => (
              <div key={i} className="h-2.5 rounded" style={{ background: `rgba(255,255,255,${a})` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
