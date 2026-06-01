import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Layers, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ALL_THEMES, type ThemeEntry } from './themeData';
import { ThemeCard } from './ThemeCard';
import GlassPresetsGrid from './GlassPresetsGrid';
import { supabase } from '../../lib/supabase';

interface ThemeConfigLite {
  theme_key: string;
  label: string;
  status: string;
  is_recommended: boolean;
  is_favorite: boolean;
  display_order: number;
  category: string;
}

interface CategoryLite {
  slug: string;
  name: string;
  sort_order: number;
}

interface Props { open: boolean; onClose: () => void; }

export default function ThemeSelectorModal({ open, onClose }: Props) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { theme, setTheme, glassConfig, setGlassConfig } = useTheme();
  const [configMap, setConfigMap] = useState<Map<string, ThemeConfigLite>>(new Map());
  const [dynamicCategories, setDynamicCategories] = useState<CategoryLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [configRes, catRes] = await Promise.all([
        supabase.from('theme_config').select('theme_key, label, status, is_recommended, is_favorite, display_order, category').order('display_order', { ascending: true }),
        supabase.from('theme_categories').select('slug, name, sort_order').order('sort_order', { ascending: true }),
      ]);
      if (cancelled) return;
      if (configRes.data) {
        const map = new Map<string, ThemeConfigLite>();
        for (const row of configRes.data) map.set(row.theme_key, row as ThemeConfigLite);
        setConfigMap(map);
      }
      if (catRes.data) {
        setDynamicCategories(catRes.data as CategoryLite[]);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const visibleThemes = useMemo(() => {
    if (!loaded) return ALL_THEMES;
    if (configMap.size === 0) return ALL_THEMES;
    return ALL_THEMES
      .filter(t => {
        const cfg = configMap.get(t.value);
        return !cfg || cfg.status === 'visible' || cfg.status === 'premium';
      })
      .map(t => {
        const cfg = configMap.get(t.value);
        if (!cfg) return t;
        return { ...t, label: cfg.label || t.label, category: cfg.category as typeof t.category };
      })
      .sort((a, b) => {
        const oA = configMap.get(a.value)?.display_order ?? 999;
        const oB = configMap.get(b.value)?.display_order ?? 999;
        return oA - oB;
      });
  }, [configMap, loaded]);

  const tabs = useMemo(() => {
    const virtualSlugs = new Set(['all', 'recommended', 'rework', 'hidden']);
    const cats = dynamicCategories.filter(c => !virtualSlugs.has(c.slug) || c.slug === 'all');
    if (cats.length === 0) {
      return [
        { key: 'all', label: 'Tous' },
        { key: 'dark', label: 'Sombres' },
        { key: 'light', label: 'Clairs' },
        { key: 'premium', label: 'Premium' },
        { key: 'business', label: 'Business' },
        { key: 'glass', label: 'Glass' },
      ];
    }
    return cats.map(c => ({ key: c.slug, label: c.name }));
  }, [dynamicCategories]);

  const recommendedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, cfg] of configMap) { if (cfg.is_recommended) keys.add(key); }
    return keys;
  }, [configMap]);

  const favoriteKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, cfg] of configMap) { if (cfg.is_favorite) keys.add(key); }
    return keys;
  }, [configMap]);

  const premiumKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, cfg] of configMap) { if (cfg.status === 'premium') keys.add(key); }
    return keys;
  }, [configMap]);

  const entries = useMemo(() => {
    let list = visibleThemes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)) ||
        t.category.includes(q),
      );
    } else if (tab !== 'all') {
      list = list.filter(t => {
        const cfg = configMap.get(t.value);
        const cat = cfg?.category || t.category;
        return cat === tab;
      });
    }
    return list;
  }, [tab, search, visibleThemes, configMap]);

  if (!open) return null;

  function handleSelect(entry: ThemeEntry) {
    if (entry.isGlassCustom) return;
    setTheme(entry.value);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="ts-modal w-full sm:max-w-[1100px] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(165deg, #0c101c 0%, #0a0e1a 40%, #080c16 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          maxHeight: 'min(94vh, 880px)', height: '94vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <ModalHeader search={search} onSearchChange={setSearch} onClose={onClose} themeCount={visibleThemes.length} />

        {/* Tab bar */}
        <TabBar tab={tab} onTab={t => { setTab(t); setSearch(''); }} activeTheme={theme} themes={visibleThemes} tabs={tabs} configMap={configMap} />

        <div className="mx-5 sm:mx-8 h-px flex-shrink-0 bg-white/[0.06]" />

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 pt-5 sm:pt-6 pb-8">
          {tab === 'glass' && !search.trim() ? (
            <GlassPresetsGrid
              currentGlassConfig={glassConfig}
              isGlassActive={theme === 'glass'}
              onApply={(config) => { setGlassConfig(config); if (theme !== 'glass') setTheme('glass'); }}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {entries.filter(e => !e.isGlassCustom || tab !== 'all').map(entry => (
                <ThemeCard
                  key={entry.value}
                  entry={entry}
                  active={theme === entry.value}
                  onSelect={() => handleSelect(entry)}
                  isRecommended={recommendedKeys.has(entry.value)}
                  isFavorite={favoriteKeys.has(entry.value)}
                  isPremium={premiumKeys.has(entry.value)}
                />
              ))}
            </div>
          )}
          {entries.length === 0 && tab !== 'glass' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search className="w-8 h-8 text-white/15" />
              <p className="text-sm font-medium text-white/30">Aucun theme trouve</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModalHeader({ search, onSearchChange, onClose, themeCount }: {
  search: string; onSearchChange: (s: string) => void; onClose: () => void; themeCount: number;
}) {
  return (
    <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.10))', border: '1px solid rgba(59,130,246,0.20)', boxShadow: '0 0 24px rgba(59,130,246,0.08)' }}>
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold tracking-tight text-white/95">Design Studio</h2>
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

function TabBar({ tab, onTab, activeTheme, themes, tabs, configMap }: {
  tab: string; onTab: (t: string) => void; activeTheme: string;
  themes: ThemeEntry[]; tabs: { key: string; label: string }[];
  configMap: Map<string, ThemeConfigLite>;
}) {
  const activeCategory = (() => {
    const cfg = configMap.get(activeTheme);
    if (cfg) return cfg.category;
    return themes.find(t => t.value === activeTheme)?.category;
  })();

  return (
    <div className="px-5 sm:px-8 flex gap-1.5 sm:gap-2 pb-4 sm:pb-5 flex-shrink-0 overflow-x-auto no-scrollbar">
      {tabs.map(t => {
        const isActive = tab === t.key;
        const count = t.key === 'all' ? themes.length : themes.filter(th => {
          const cfg = configMap.get(th.value);
          const cat = cfg?.category || th.category;
          return cat === t.key;
        }).length;
        const hasActive = t.key === 'all' || t.key === activeCategory || (t.key === 'glass' && activeTheme === 'glass');
        if (t.key !== 'all' && t.key !== 'glass' && count === 0) return null;
        return (
          <button key={t.key} onClick={() => onTab(t.key)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex-shrink-0" style={{ background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent', border: isActive ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent', color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.40)', boxShadow: isActive ? '0 2px 12px rgba(59,130,246,0.06)' : 'none' }}>
            {t.key === 'glass' && <Layers className="w-3 h-3" />}
            {t.key === 'premium' && <Sparkles className="w-3 h-3" />}
            {t.label}
            {t.key !== 'glass' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)', color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>{count}</span>
            )}
            {hasActive && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
