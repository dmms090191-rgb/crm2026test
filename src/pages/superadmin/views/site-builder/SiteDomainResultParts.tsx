import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { AlertTriangle, Ban, Check, ShoppingBag, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { RowStatus } from '../../../../lib/domainSearchModel';
import { SITE_ACCENT } from './SiteUiParts';

/* Briques visuelles des resultats de recherche de domaine (affichage uniquement). */

const BADGE_BASE = 'inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0';

export function DomainStatusBadge({ t, status, label }: { t: ThemeTokens; status: RowStatus; label: string }) {
  if (status === 'available') {
    return (
      <span className={BADGE_BASE} style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
        <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />{label}
      </span>
    );
  }
  if (status === 'unknown') {
    return (
      <span className={BADGE_BASE} style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}>
        <AlertTriangle className="w-3 h-3" aria-hidden="true" />{label}
      </span>
    );
  }
  const notOffered = status === 'not_offered';
  return (
    <span className={BADGE_BASE}
      style={{ background: notOffered ? 'transparent' : t.surface.secondary, border: `1px ${notOffered ? 'dashed' : 'solid'} ${t.surface.border}`, color: t.text.tertiary }}>
      {notOffered ? <Ban className="w-3 h-3" aria-hidden="true" /> : <X className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </span>
  );
}

/* Remplissage des squelettes de chargement, lisible sur les themes sombres comme clairs. */
export const SKELETON_FILL = 'rgba(148,163,184,0.14)';

/* Petite etiquette « Bientot disponible », reprise du style de l'accent Site. */
export function SoonChip({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.22)', color: SITE_ACCENT }}>
      Bientôt disponible
    </span>
  );
}

/* Achat non ouvert : bouton DESACTIVE, aucune action branchee. */
export function BuySoonButton({ t, fullWidth = false, compact = false }: { t: ThemeTokens; fullWidth?: boolean; compact?: boolean }) {
  return (
    <button type="button" disabled aria-disabled="true" title="Achat bientôt disponible" data-testid="site-domain-buy-disabled"
      className={`${fullWidth ? 'w-full' : ''} inline-flex items-center justify-between gap-3 ${compact ? 'min-h-[36px]' : 'min-h-[40px]'} pl-3 pr-2 rounded-xl text-sm sm:text-xs font-semibold cursor-not-allowed select-none`}
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
      <span className="inline-flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" /> Acheter
      </span>
      <SoonChip />
    </button>
  );
}

/* Separe « popolera » et « .com » pour une lecture plus rapide de l'extension. */
export function DomainName({ domain, tld, color, tldColor, className }: {
  domain: string; tld: string; color: string; tldColor: string; className: string;
}) {
  const name = domain.slice(0, domain.length - tld.length - 1);
  return (
    <p className={`min-w-0 [overflow-wrap:anywhere] ${className}`} style={{ color }}>
      {name}<span style={{ color: tldColor }}>.{tld}</span>
    </p>
  );
}

/* Bordure au survol (desktop) via variables CSS : le style en ligne ne bloque pas le :hover. */
export function hoverBorderStyle(base: string, hover: string): CSSProperties {
  return { '--dom-border': base, '--dom-border-hover': hover } as CSSProperties;
}
export const HOVER_BORDER_CLASS = 'border [border-color:var(--dom-border)] [@media(hover:hover)]:hover:[border-color:var(--dom-border-hover)]';

/* Largeur reelle du conteneur (onglet plein ecran, fenetre modale, barre laterale ouverte ou non). */
export function useContainerWidth(ref: RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
