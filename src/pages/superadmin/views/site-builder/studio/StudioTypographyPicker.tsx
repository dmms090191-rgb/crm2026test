import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Type, Search, ChevronDown, Star } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { FONT_LIST, type FontFilterId, FONT_CATEGORIES, loadFontFavorites, saveFontFavorites } from '../../../../../components/editor/editorFontList';
import { ensureGoogleFont } from '../../../../../components/editor/EditorTypographyFontRow';

interface Props {
  value: string;
  onChange: (fontFamily: string) => void;
  t: ThemeTokens;
}

export default function StudioTypographyPicker({ value, onChange, t }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FontFilterId>('all');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFontFavorites());
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleFavorite = useCallback((name: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      saveFontFavorites(next);
      return next;
    });
  }, []);

  const { favFonts, mainFonts, flatList } = useMemo(() => {
    let list = FONT_LIST;
    if (filter !== 'all' && filter !== 'favorites') {
      list = list.filter(f => f.category === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    if (filter === 'favorites') {
      const fav = list.filter(f => favorites.has(f.name));
      return { favFonts: [], mainFonts: fav, flatList: fav };
    }
    const fav = list.filter(f => favorites.has(f.name));
    const main = list.filter(f => !favorites.has(f.name));
    return { favFonts: fav, mainFonts: main, flatList: [...fav, ...main] };
  }, [search, filter, favorites]);

  useEffect(() => {
    setHighlightIdx(-1);
  }, [search, filter]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const scrollToIdx = useCallback((idx: number) => {
    const container = listRef.current;
    if (!container) return;
    const rows = container.querySelectorAll('[data-font-row]');
    const row = rows[idx] as HTMLElement | undefined;
    if (row) row.scrollIntoView({ block: 'nearest' });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!flatList.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = highlightIdx < flatList.length - 1 ? highlightIdx + 1 : 0;
      setHighlightIdx(next);
      scrollToIdx(next);
      const font = flatList[next];
      ensureGoogleFont(font.name);
      onChange(font.name);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = highlightIdx > 0 ? highlightIdx - 1 : flatList.length - 1;
      setHighlightIdx(prev);
      scrollToIdx(prev);
      const font = flatList[prev];
      ensureGoogleFont(font.name);
      onChange(font.name);
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [flatList, highlightIdx, onChange, scrollToIdx]);

  const selectFont = useCallback((name: string, idx: number) => {
    ensureGoogleFont(name);
    onChange(name);
    setHighlightIdx(idx);
  }, [onChange]);

  const displayName = value || 'Par defaut';

  if (value) ensureGoogleFont(value);

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-semibold block" style={{ color: t.text.tertiary }}>
        Typographie
      </label>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: t.surface.secondary,
          border: `1.5px solid ${open ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
          color: t.text.primary,
        }}
      >
        <Type className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0ea5e9' }} />
        <span
          className="flex-1 text-[11px] font-semibold truncate"
          style={{ fontFamily: value ? `"${value}", sans-serif` : undefined }}
        >
          {displayName}
        </span>
        <ChevronDown
          className="w-3 h-3 flex-shrink-0 transition-transform"
          style={{ color: t.text.quaternary, transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: t.surface.secondary,
            border: `1.5px solid ${t.surface.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="px-2 pt-2 pb-1.5 space-y-1.5">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3"
                style={{ color: t.text.quaternary }}
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une police..."
                className="w-full pl-6 pr-2 py-1.5 rounded-lg text-[10px] outline-none"
                style={{
                  background: t.surface.primary,
                  border: `1px solid ${t.surface.border}`,
                  color: t.text.primary,
                }}
              />
            </div>
            <div className="flex gap-0.5 overflow-x-auto pb-0.5">
              {FONT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className="px-2 py-1 rounded-md text-[8px] font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: filter === cat.id ? 'rgba(14,165,233,0.1)' : 'transparent',
                    border: `1px solid ${filter === cat.id ? 'rgba(14,165,233,0.25)' : 'transparent'}`,
                    color: filter === cat.id ? '#0ea5e9' : t.text.quaternary,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto px-1.5 pb-1.5"
            style={{ maxHeight: 200 }}
          >
            {flatList.length === 0 ? (
              <p className="text-center py-4 text-[10px]" style={{ color: t.text.quaternary }}>
                {filter === 'favorites' ? 'Aucun favori' : 'Aucune police trouvee'}
              </p>
            ) : (
              <>
                {favFonts.length > 0 && (
                  <>
                    <p className="text-[8px] font-bold uppercase tracking-wider px-2 pt-1.5 pb-1" style={{ color: t.text.quaternary }}>
                      Favoris
                    </p>
                    {favFonts.map((f, idx) => (
                      <FontRow key={`fav-${f.name}`} name={f.name} selected={value === f.name}
                        highlighted={highlightIdx === idx} isFavorite t={t} listRef={listRef}
                        onClick={() => selectFont(f.name, idx)} onToggleFav={() => toggleFavorite(f.name)} />
                    ))}
                    <div className="mx-2 my-1.5" style={{ borderTop: `1px solid ${t.surface.border}` }} />
                  </>
                )}
                {mainFonts.map((f, idx) => {
                  const flatIdx = favFonts.length + idx;
                  return (
                    <FontRow key={f.name} name={f.name} selected={value === f.name}
                      highlighted={highlightIdx === flatIdx} isFavorite={favorites.has(f.name)} t={t} listRef={listRef}
                      onClick={() => selectFont(f.name, flatIdx)} onToggleFav={() => toggleFavorite(f.name)} />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FontRow({ name, selected, highlighted, isFavorite, t, listRef, onClick, onToggleFav }: {
  name: string; selected: boolean; highlighted: boolean; isFavorite?: boolean;
  t: ThemeTokens; listRef: React.RefObject<HTMLDivElement | null>;
  onClick: () => void; onToggleFav?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const el = ref.current;
    const root = listRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { ensureGoogleFont(name); setLoaded(true); obs.disconnect(); } },
      { root, rootMargin: '80px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loaded, name, listRef]);

  const isActive = selected || highlighted;

  return (
    <button
      ref={ref}
      data-font-row
      onClick={onClick}
      className="w-full flex items-center gap-1.5 text-left px-2 py-[6px] rounded-lg text-[10px] transition-all group"
      style={{
        background: isActive ? 'rgba(14,165,233,0.1)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(14,165,233,0.2)' : 'transparent'}`,
        color: isActive ? '#0ea5e9' : t.text.primary,
        fontFamily: loaded ? `"${name}", sans-serif` : undefined,
      }}
    >
      <span className="flex-1 truncate">{name}</span>
      {onToggleFav && (
        <span
          role="button"
          onClick={e => { e.stopPropagation(); onToggleFav(); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: isFavorite ? 1 : undefined, color: isFavorite ? '#f59e0b' : t.text.quaternary }}
        >
          <Star className="w-3 h-3" fill={isFavorite ? '#f59e0b' : 'none'} />
        </span>
      )}
    </button>
  );
}
