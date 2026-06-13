import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Type, Search, Star } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { getEditorPanelTokens } from './editorPanelTheme';
import DraggablePanel from './DraggablePanel';
import { FONT_LIST, FONT_CATEGORIES, loadFontFavorites, saveFontFavorites, type FontFilterId } from './editorFontList';
import { TYPOGRAPHY_DEFAULT_SENTINEL } from '../../contexts/editorModeHelpers';
import { LazyFontRow, ensureGoogleFont } from './EditorTypographyFontRow';

export { ensureGoogleFont };

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

export default function EditorTypographyPanel({ visible, onClose, initialPos, onPositionChange }: Props) {
  const ctx = useEditorMode();
  const pt = getEditorPanelTokens(ctx.panelTheme, ctx.panelPalettePreview || ctx.customPanelPalette);
  const [minimized, setMinimized] = useState(false);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FontFilterId>('all');
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFontFavorites());
  const listRef = useRef<HTMLDivElement>(null);
  const target = ctx.typoTarget;

  const toggleFavorite = useCallback((fontName: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(fontName)) next.delete(fontName);
      else next.add(fontName);
      saveFontFavorites(next);
      return next;
    });
  }, []);

  const previewFont = target === 'categories' ? ctx.typographyPreview.categoryFont : target === 'items' ? ctx.typographyPreview.itemFont : target === 'rdr' ? ctx.typographyPreview.rdrFont : null;
  const isDefaultPreview = previewFont === TYPOGRAPHY_DEFAULT_SENTINEL;
  const currentFont = isDefaultPreview ? null
    : target === 'categories'
      ? (ctx.typographyPreview.categoryFont || ctx.typographyOverrides.categoryFont || null)
      : target === 'items'
        ? (ctx.typographyPreview.itemFont || ctx.typographyOverrides.itemFont || null)
        : target === 'rdr'
          ? (ctx.typographyPreview.rdrFont || ctx.typographyOverrides.rdrFont || null)
          : null;

  const committedFont = target === 'categories'
    ? ctx.typographyOverrides.categoryFont
    : target === 'items'
      ? ctx.typographyOverrides.itemFont
      : target === 'rdr'
        ? ctx.typographyOverrides.rdrFont
        : null;

  useEffect(() => {
    setFilter('');
    setCategoryFilter('all');
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [target]);

  const filtered = useMemo(() => {
    let list = FONT_LIST;
    if (categoryFilter === 'favorites') {
      list = list.filter(f => favorites.has(f.name));
    } else if (categoryFilter !== 'all') {
      list = list.filter(f => f.category === categoryFilter);
    }
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [filter, categoryFilter, favorites]);

  const label = target === 'categories' ? 'Categories' : target === 'items' ? 'Onglets' : 'RDR';

  const handleFontClick = useCallback((font: string) => {
    if (!target) return;
    ensureGoogleFont(font);
    const key = target === 'categories' ? 'categoryFont' : target === 'items' ? 'itemFont' : 'rdrFont';
    ctx.setTypographyPreview({ [key]: font });
  }, [target, ctx]);

  const handleValidate = useCallback(() => {
    ctx.commitTypography();
  }, [ctx]);

  useEffect(() => {
    if (!visible || !target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handleValidate();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (filtered.length === 0) return;
      e.preventDefault();
      const currentIdx = currentFont ? filtered.findIndex(f => f.name === currentFont) : -1;
      let nextIdx: number;
      if (currentIdx === -1) {
        nextIdx = e.key === 'ArrowDown' ? 0 : filtered.length - 1;
      } else {
        nextIdx = e.key === 'ArrowDown'
          ? (currentIdx + 1) % filtered.length
          : (currentIdx - 1 + filtered.length) % filtered.length;
      }
      const next = filtered[nextIdx];
      if (!next) return;
      handleFontClick(next.name);
      requestAnimationFrame(() => {
        const row = listRef.current?.querySelector<HTMLElement>(`[data-font-name="${CSS.escape(next.name)}"]`);
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, target, filtered, currentFont, handleFontClick, handleValidate, onClose]);

  if (!visible || !target) return null;

  function handleDefault() {
    if (!target) return;
    const key = target === 'categories' ? 'categoryFont' : target === 'items' ? 'itemFont' : 'rdrFont';
    ctx.setTypographyPreview({ [key]: TYPOGRAPHY_DEFAULT_SENTINEL });
  }

  const committedHasFont = target === 'categories'
    ? !!ctx.typographyOverrides.categoryFont
    : target === 'items'
      ? !!ctx.typographyOverrides.itemFont
      : target === 'rdr'
        ? !!ctx.typographyOverrides.rdrFont
        : false;

  const hasPreview = target === 'categories'
    ? !!ctx.typographyPreview.categoryFont
    : target === 'items'
      ? !!ctx.typographyPreview.itemFont
      : target === 'rdr'
        ? !!ctx.typographyPreview.rdrFont
        : false;

  return (
    <DraggablePanel
      title="Typographie"
      icon={<Type className="w-3.5 h-3.5" style={{ color: pt.accent.solid }} />}
      defaultX={16}
      defaultY={120}
      width={256}
      minimized={minimized}
      initialPos={initialPos}
      onPositionChange={onPositionChange}
      onMinimize={() => setMinimized(m => !m)}
      onClose={onClose}
    >
      <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pt.accent.text }}>
            {label}
          </span>
          <span className="text-[9px] font-medium tabular-nums" style={{ color: pt.label.muted }}>
            {filtered.length} police{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="px-2 pb-1">
          <div className="flex gap-0.5 flex-wrap">
            {FONT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategoryFilter(cat.id); if (listRef.current) listRef.current.scrollTop = 0; }}
                className="px-2 py-1 rounded-md text-[9px] font-semibold transition-all duration-150 flex items-center gap-1"
                style={{
                  background: categoryFilter === cat.id
                    ? cat.id === 'favorites' ? 'linear-gradient(135deg, #d97706, #b45309)' : `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
                    : pt.surface.secondary,
                  color: categoryFilter === cat.id ? '#fff' : cat.id === 'favorites' && favorites.size > 0 ? '#d97706' : pt.label.muted,
                  border: `1px solid ${categoryFilter === cat.id ? (cat.id === 'favorites' ? '#b45309' : pt.accent.border) : pt.surface.border}`,
                }}
              >
                {cat.id === 'favorites' && <Star className="w-2.5 h-2.5" fill={categoryFilter === cat.id || favorites.size > 0 ? 'currentColor' : 'none'} />}
                {cat.label}
                {cat.id === 'favorites' && favorites.size > 0 && (
                  <span className="text-[8px] tabular-nums opacity-80">{favorites.size}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2.5 pb-1.5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: pt.label.muted }} />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Rechercher une police..."
            className="w-full text-[11px] pl-7 pr-2.5 py-1.5 rounded-lg outline-none"
            style={{
              background: pt.surface.secondary,
              border: `1px solid ${pt.surface.border}`,
              color: pt.text.primary,
            }}
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-1.5 pb-1.5 min-h-0" style={{ maxHeight: 360 }}>
          <div className="flex flex-col gap-0.5">
            {filtered.map(entry => (
              <LazyFontRow
                key={entry.name}
                entry={entry}
                selected={currentFont === entry.name}
                committed={committedFont === entry.name}
                isFavorite={favorites.has(entry.name)}
                onToggleFavorite={toggleFavorite}
                pt={pt}
                onClick={() => handleFontClick(entry.name)}
                scrollContainer={listRef}
              />
            ))}
            {filtered.length === 0 && categoryFilter === 'favorites' && !filter && (
              <div className="flex flex-col items-center gap-2 py-8 px-4">
                <Star className="w-6 h-6" style={{ color: pt.label.muted }} />
                <p className="text-[10px] text-center font-medium" style={{ color: pt.label.muted }}>
                  Aucune typographie favorite
                </p>
                <p className="text-[9px] text-center leading-relaxed" style={{ color: pt.label.muted, opacity: 0.7 }}>
                  Clique sur l'etoile d'une police pour l'ajouter ici.
                </p>
              </div>
            )}
            {filtered.length === 0 && (categoryFilter !== 'favorites' || !!filter) && (
              <p className="text-[10px] text-center py-6" style={{ color: pt.label.muted }}>
                Aucune police trouvee
              </p>
            )}
          </div>
        </div>

        <div className="px-2.5 pt-1.5 pb-2.5 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${pt.surface.border}` }}>
          <button
            onClick={handleDefault}
            disabled={!committedHasFont && !isDefaultPreview}
            className="w-full py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{
              background: isDefaultPreview ? 'rgba(245,158,11,0.12)' : pt.surface.secondary,
              color: isDefaultPreview ? '#d97706' : pt.text.secondary,
              border: `1px solid ${isDefaultPreview ? 'rgba(245,158,11,0.3)' : pt.surface.border}`,
            }}
          >
            {isDefaultPreview ? 'Apercu : Defaut Talvex' : 'Defaut'}
          </button>
          <button
            onClick={handleValidate}
            disabled={!hasPreview}
            className="w-full py-2 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.02] disabled:opacity-35 disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{
              background: hasPreview
                ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
                : pt.surface.secondary,
              color: hasPreview ? '#fff' : pt.text.secondary,
              border: `1px solid ${hasPreview ? pt.accent.border : pt.surface.border}`,
              boxShadow: hasPreview ? `0 4px 16px ${pt.accent.bg}` : 'none',
            }}
          >
            Valider la typographie
          </button>
        </div>
      </div>
    </DraggablePanel>
  );
}
