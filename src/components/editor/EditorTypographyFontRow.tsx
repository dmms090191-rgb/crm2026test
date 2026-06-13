import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Star } from 'lucide-react';
import { getCategoryLabel, type FontEntry } from './editorFontList';
import type { EditorPanelTokens } from './editorPanelTheme';

const loadedFonts = new Set<string>();

export function ensureGoogleFont(font: string) {
  if (loadedFonts.has(font)) return;
  loadedFonts.add(font);
  const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function LazyFontRow({ entry, selected, committed, isFavorite, onToggleFavorite, pt, onClick, scrollContainer }: {
  entry: FontEntry;
  selected: boolean;
  committed: boolean;
  isFavorite: boolean;
  onToggleFavorite: (name: string) => void;
  pt: EditorPanelTokens;
  onClick: () => void;
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const [fontLoaded, setFontLoaded] = useState(() => loadedFonts.has(entry.name));

  const loadFont = useCallback(() => {
    if (!fontLoaded) {
      ensureGoogleFont(entry.name);
      setFontLoaded(true);
    }
  }, [entry.name, fontLoaded]);

  useEffect(() => {
    if (fontLoaded) return;
    const el = rowRef.current;
    const root = scrollContainer.current;
    if (!el || !root) return;

    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { loadFont(); observer.disconnect(); } },
      { root, rootMargin: '100px 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fontLoaded, loadFont, scrollContainer]);

  const catLabel = getCategoryLabel(entry.category);

  return (
    <button
      ref={rowRef}
      onClick={onClick}
      data-font-name={entry.name}
      className="w-full flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-[11px] transition-all duration-150 hover:scale-[1.003] group"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
          : 'transparent',
        color: selected ? '#fff' : pt.text.primary,
        border: `1px solid ${selected ? pt.accent.border : 'transparent'}`,
      }}
    >
      <span
        className="flex-1 text-left truncate"
        style={{ fontFamily: fontLoaded ? `"${entry.name}", sans-serif` : undefined }}
      >
        {entry.name}
      </span>
      <span
        className="text-[7px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded flex-shrink-0"
        style={{
          background: selected ? 'rgba(255,255,255,0.18)' : pt.surface.secondary,
          color: selected ? 'rgba(255,255,255,0.7)' : pt.label.muted,
          border: `1px solid ${selected ? 'rgba(255,255,255,0.15)' : pt.surface.border}`,
        }}
      >
        {catLabel}
      </span>
      <span
        className="flex-shrink-0 transition-all duration-200 hover:scale-125"
        onClick={e => { e.stopPropagation(); onToggleFavorite(entry.name); }}
        role="button"
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Star
          className="w-3 h-3"
          fill={isFavorite ? '#d97706' : 'none'}
          stroke={isFavorite ? '#d97706' : selected ? 'rgba(255,255,255,0.4)' : pt.label.muted}
          strokeWidth={2}
          style={{ opacity: isFavorite ? 1 : 0.5, transition: 'all 0.2s' }}
        />
      </span>
      {committed && !selected && (
        <Check className="w-3 h-3 flex-shrink-0" style={{ color: pt.accent.solid }} />
      )}
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
    </button>
  );
}
