import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Layers, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ALL_THEMES, THEME_TABS, getThemesByTab, getThemesBySearch, type ThemeTab, type ThemeEntry } from './themeData';
import { ThemeCard } from './ThemeCard';
import GlassPresetsGrid from './GlassPresetsGrid';

interface Props { open: boolean; onClose: () => void; }

export default function ThemeSelectorModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<ThemeTab>('all');
  const [search, setSearch] = useState('');
  const { theme, setTheme, glassConfig, setGlassConfig } = useTheme();

  const entries = useMemo(() => {
    if (search.trim()) return getThemesBySearch(search);
    return getThemesByTab(tab);
  }, [tab, search]);

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

        <ModalHeader search={search} onSearchChange={setSearch} onClose={onClose} themeCount={ALL_THEMES.length} />
        <TabBar tab={tab} onTab={t => { setTab(t); setSearch(''); }} activeTheme={theme} />
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
                <ThemeCard key={entry.value} entry={entry} active={theme === entry.value} onSelect={() => handleSelect(entry)} />
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
          <p className="text-[10px] sm:text-xs mt-0.5 font-medium text-white/35">{themeCount} themes premium disponibles</p>
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

function TabBar({ tab, onTab, activeTheme }: { tab: ThemeTab; onTab: (t: ThemeTab) => void; activeTheme: string }) {
  const activeCategory = ALL_THEMES.find(t => t.value === activeTheme)?.category;
  return (
    <div className="px-5 sm:px-8 flex gap-1.5 sm:gap-2 pb-4 sm:pb-5 flex-shrink-0 overflow-x-auto no-scrollbar">
      {THEME_TABS.map(t => {
        const isActive = tab === t.key;
        const count = t.key === 'all' ? ALL_THEMES.length : ALL_THEMES.filter(th => th.category === t.key).length;
        const hasActive = t.key === 'all' || t.key === activeCategory || (t.key === 'glass' && activeTheme === 'glass');
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
