import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { matchExtensions } from '../../../../lib/domainFilterModel';
import type { ExtensionCatalogState } from './useDomainExtensionFilter';
import { SITE_ACCENT } from './SiteUiParts';
import { SKELETON_FILL } from './SiteDomainResultParts';

/*
 * « Filtrer par extension » : cases a cocher sur le CATALOGUE des extensions vendues (fourni par le serveur),
 * pas seulement sur les resultats deja charges. Ordinateur : menu compact ; mobile : panneau en bas d'ecran.
 */
interface Props {
  t: ThemeTokens;
  catalog: ExtensionCatalogState;
  selected: string[];
  onOpen: () => void;
  onRetryCatalog: () => void;
  onToggle: (tld: string) => void;
  onClear: () => void;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

function useDesktop(): boolean {
  const query = '(min-width: 640px)';
  const [desktop, setDesktop] = useState(() => typeof window === 'undefined' || window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export default function SiteDomainExtensionFilter({ t, catalog, selected, onOpen, onRetryCatalog, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const desktop = useDesktop();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const count = selected.length;

  const close = (restoreFocus = true) => {
    setOpen(false);
    setTerm('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    // Sur mobile, le clavier ne s'ouvre pas d'office : la liste reste visible.
    if (desktop) inputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, desktop]);

  const matches = matchExtensions(catalog.tlds, term);
  const s = matches.length > 1 ? 's' : '';
  const statusLine = catalog.status === 'ok'
    ? `${term.trim() ? `${matches.length} extension${s} trouvée${s}` : `${catalog.tlds.length} extensions proposées`}${count > 0 ? ` · ${plural(count, 'sélectionnée')}` : ''}`
    : catalog.status === 'error' ? 'Liste indisponible' : 'Chargement des extensions…';

  const panel = (
    <div ref={panelRef} role="dialog" aria-label="Filtrer par extension" data-testid="site-domain-filter-menu"
      className={desktop
        ? 'absolute right-0 top-full mt-2 z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl flex flex-col overflow-hidden'
        : 'fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl flex flex-col overflow-hidden'}
      style={{ background: t.dropdown.bg, border: `1px solid ${t.dropdown.border}`, boxShadow: t.dropdown.shadow, '--dom-item-hover': t.dropdown.itemBgHover,
        // Au-dessus de la fenetre du gestionnaire de site (z-index 99990) quand la recherche y est ouverte.
        ...(desktop ? {} : { zIndex: 99996 }) } as CSSProperties}>
      {!desktop && (
        <div className="flex items-center justify-between gap-3 pl-5 pr-2 pt-2">
          <span className="text-base font-semibold" style={{ color: t.dropdown.itemTextHover }}>Filtrer par extension</span>
          <button type="button" onClick={() => close()} aria-label="Fermer" className={`w-11 h-11 rounded-xl inline-flex items-center justify-center ${FOCUS_RING}`}
            style={{ color: t.dropdown.itemText }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-3" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.dropdown.itemText }} aria-hidden="true" />
          <input ref={inputRef} type="search" value={term} onChange={event => setTerm(event.target.value)}
            placeholder="Rechercher une extension..." aria-label="Rechercher une extension" aria-controls={listId}
            autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search"
            className="w-full h-11 sm:h-10 pl-9 pr-3 rounded-xl text-base sm:text-sm outline-none placeholder:text-[color:var(--dom-filter-placeholder)] focus:[border-color:var(--dom-filter-focus)]"
            style={{ background: t.dropdown.itemBgHover, border: `1px solid ${t.dropdown.border}`, color: t.dropdown.itemTextHover,
              '--dom-filter-placeholder': t.dropdown.itemText, '--dom-filter-focus': SITE_ACCENT } as CSSProperties} />
        </div>
        <p className="mt-2 px-0.5 text-[11px] tabular-nums" style={{ color: t.dropdown.itemText }} aria-live="polite">{statusLine}</p>
      </div>

      <div id={listId} className={`overflow-y-auto overscroll-contain py-1 ${desktop ? 'max-h-72' : 'flex-1 min-h-[200px]'}`}>
        {catalog.status === 'error' ? (
          <div className="px-4 py-5 text-sm sm:text-xs" style={{ color: t.dropdown.itemText }}>
            <p>{catalog.message}</p>
            <button type="button" onClick={onRetryCatalog} className={`mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-lg font-semibold ${FOCUS_RING}`}
              style={{ border: `1px solid ${t.dropdown.border}`, color: t.dropdown.itemTextHover }}>
              <RefreshCw className="w-3.5 h-3.5" /> Réessayer
            </button>
          </div>
        ) : catalog.status !== 'ok' ? (
          <ul aria-hidden="true">
            {Array.from({ length: 7 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3 px-4 h-11 sm:h-9">
                <span className="w-[18px] h-[18px] rounded-[5px] animate-pulse" style={{ background: SKELETON_FILL }} />
                <span className="h-3.5 rounded animate-pulse" style={{ background: SKELETON_FILL, width: `${36 + (index % 3) * 14}px` }} />
              </li>
            ))}
          </ul>
        ) : matches.length === 0 ? (
          <p className="px-4 py-5 text-sm sm:text-xs" style={{ color: t.dropdown.itemText }}>Aucune extension ne correspond à « {term.trim()} ».</p>
        ) : (
          <ul aria-label="Extensions proposées">
            {matches.map(tld => {
              const on = selected.includes(tld);
              return (
                <li key={tld} className="px-1.5">
                  <label className="group flex items-center gap-3 px-2.5 min-h-[44px] sm:min-h-[36px] rounded-lg cursor-pointer select-none transition-colors [@media(hover:hover)]:hover:bg-[color:var(--dom-item-hover)]"
                    data-testid="site-domain-filter-option">
                    <input type="checkbox" className="peer sr-only" checked={on} onChange={() => onToggle(tld)} />
                    <span aria-hidden="true"
                      className="w-[18px] h-[18px] rounded-[5px] inline-flex items-center justify-center flex-shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400/70"
                      style={on ? { background: SITE_ACCENT, border: `1px solid ${SITE_ACCENT}` } : { border: `1.5px solid ${t.dropdown.border}`, background: 'transparent' }}>
                      {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="font-mono text-[15px] sm:text-sm" style={{ color: on ? t.dropdown.itemTextHover : t.dropdown.itemText }}>.{tld}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-2" style={{ borderTop: `1px solid ${t.dropdown.border}` }}>
        <button type="button" onClick={onClear} disabled={count === 0}
          className={`h-11 sm:h-9 px-3 rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING}`}
          style={{ color: SITE_ACCENT }} data-testid="site-domain-filter-clear">
          Tout afficher
        </button>
        <button type="button" onClick={() => close()}
          className={`h-11 sm:h-9 px-4 rounded-lg text-sm sm:text-xs font-semibold ${FOCUS_RING}`}
          style={{ background: t.dropdown.itemBgHover, border: `1px solid ${t.dropdown.border}`, color: t.dropdown.itemTextHover }}>
          {desktop || count === 0 ? 'Fermer' : `Voir les résultats (${count})`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full sm:w-auto">
      <button ref={triggerRef} type="button" onClick={() => (open ? close() : (setOpen(true), onOpen()))}
        aria-haspopup="dialog" aria-expanded={open} data-testid="site-domain-filter-toggle"
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 sm:h-9 px-3.5 rounded-xl text-sm sm:text-xs font-semibold transition-colors ${FOCUS_RING}`}
        style={{
          background: count > 0 ? 'rgba(14,165,233,0.10)' : t.surface.secondary,
          border: `1px solid ${count > 0 ? 'rgba(14,165,233,0.35)' : t.surface.border}`,
          color: count > 0 ? SITE_ACCENT : t.text.primary,
        }}>
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Filtrer par extension
        {count > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center tabular-nums"
            style={{ background: SITE_ACCENT, color: '#fff' }} aria-label={`${plural(count, 'extension')} ${count > 1 ? 'sélectionnées' : 'sélectionnée'}`}>
            {count}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (desktop ? panel : createPortal(
        <>
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 99995 }} aria-hidden="true" />
          {panel}
        </>,
        document.body,
      ))}
    </div>
  );
}

/* Filtres actifs : une pastille par extension, retrait en un geste, « Tout afficher ». */
export function ExtensionFilterChips({ t, selected, onRemove, onClear }: {
  t: ThemeTokens; selected: string[]; onRemove: (tld: string) => void; onClear: () => void;
}) {
  if (selected.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-1" data-testid="site-domain-filter-chips">
      <span className="text-xs" style={{ color: t.text.tertiary }}>Filtre :</span>
      {selected.map(tld => (
        <button key={tld} type="button" onClick={() => onRemove(tld)} aria-label={`Retirer le filtre .${tld}`}
          className={`inline-flex items-center gap-1 h-8 pl-2.5 pr-1.5 rounded-full font-mono text-xs font-medium transition-colors ${FOCUS_RING}`}
          style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.30)', color: t.heading.primary }}>
          .{tld}
          <X className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClear} className={`h-8 px-2 rounded-lg text-xs font-semibold ${FOCUS_RING}`} style={{ color: SITE_ACCENT }}>
        Tout afficher
      </button>
    </div>
  );
}
