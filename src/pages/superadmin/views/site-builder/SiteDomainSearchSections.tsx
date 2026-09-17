import type { CSSProperties } from 'react';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { availableCount, checkedCount, remainingLabel, type SearchRow } from '../../../../lib/domainSearchModel';
import { SITE_ACCENT, toneStyle } from './SiteUiParts';
import { SKELETON_FILL } from './SiteDomainResultParts';
import SiteDomainResultRow, { OTHER_COLUMNS } from './SiteDomainResultRow';

/* Sections d'affichage de la recherche de domaine (aucun etat, aucun appel serveur). */

/* 1 carte sur mobile, 2 sur tablette, 3 ou 4 selon la largeur reellement disponible. */
export const CARD_GRID_STYLE: CSSProperties = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 256px), 1fr))' };

export function countLabel(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

export function SectionTitle({ t, id, title, meta }: { t: ThemeTokens; id: string; title: string; meta: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-1">
      <h4 id={id} className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: t.text.secondary }}>{title}</h4>
      {meta && <p className="text-xs tabular-nums" style={{ color: t.text.tertiary }}>{meta}</p>}
    </div>
  );
}

/* Premiere verification : squelette a la forme des cartes. */
export function SearchLoading({ t }: { t: ThemeTokens }) {
  return (
    <div className="space-y-3" data-testid="site-domain-search-loading">
      <p className="flex items-center gap-2 px-1 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: SITE_ACCENT }} aria-hidden="true" />
        Vérification en cours… cela peut prendre une vingtaine de secondes.
      </p>
      <ul className="grid gap-3" style={CARD_GRID_STYLE} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="rounded-2xl p-4 sm:p-5" style={{ border: `1px solid ${t.surface.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <span className="h-5 w-32 rounded-md animate-pulse" style={{ background: SKELETON_FILL }} />
              <span className="h-6 w-20 rounded-full animate-pulse" style={{ background: SKELETON_FILL }} />
            </div>
            <span className="block mt-5 h-3 w-28 rounded animate-pulse" style={{ background: SKELETON_FILL }} />
            <span className="block mt-2 h-7 w-24 rounded-md animate-pulse" style={{ background: SKELETON_FILL }} />
            <span className="block mt-5 h-10 w-full rounded-xl animate-pulse" style={{ background: SKELETON_FILL }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface OtherProps {
  t: ThemeTokens;
  others: SearchRow[];
  actorIsTalvex: boolean;
  wide: boolean;
  loadingMore: boolean;
  total: number | null;
  checked: number;
  remaining: number | null;
  moreError: string | null;
  canLoadMore: boolean;
  onLoadMore: () => void;
}

/* « Autres extensions » : liste compacte + « Voir plus d'extensions » (10 par clic, logique inchangee). */
export function OtherExtensions({ t, others, actorIsTalvex, wide, loadingMore, total, checked, remaining, moreError, canLoadMore, onLoadMore }: OtherProps) {
  const progress = total ? Math.min(100, (checked / total) * 100) : 0;
  return (
    <section aria-labelledby="site-domain-others-title">
      <SectionTitle t={t} id="site-domain-others-title" title="Autres extensions"
        meta={others.length > 0 ? `${countLabel(checkedCount(others), 'vérifiée')} · ${countLabel(availableCount(others), 'disponible')}` : null} />
      <div className="mt-3 rounded-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.surface.border}`, '--dom-row-hover': t.surface.hover } as CSSProperties}>
        {wide && others.length > 0 && (
          <div className="grid items-center gap-4 px-5 h-10 text-[11px] font-semibold uppercase tracking-wider"
            style={{ gridTemplateColumns: OTHER_COLUMNS, color: t.text.tertiary, background: t.surface.secondary, borderBottom: `1px solid ${t.surface.border}` }}
            aria-hidden="true">
            <span>Domaine</span>
            <span>Statut</span>
            {actorIsTalvex ? <><span>Coût 1re année</span><span>Renouvellement</span></> : <span className="col-span-2">Prix</span>}
            <span>Action</span>
          </div>
        )}
        {others.length > 0 && (
          <ul>
            {others.map((row, index) => (
              <SiteDomainResultRow key={row.domain} t={t} row={row} actorIsTalvex={actorIsTalvex} wide={wide} divider={index > 0} />
            ))}
          </ul>
        )}
        {others.length === 0 && !loadingMore && (
          <p className="px-4 sm:px-5 py-4 text-sm sm:text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
            {total ? `Talvex propose ${total} extensions.` : 'D’autres extensions sont proposées.'} Vérifiez-les 10 par 10, à votre rythme.
          </p>
        )}
        {loadingMore && (
          <ul aria-hidden="true" data-testid="site-domain-search-more-loading">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center justify-between gap-4 px-4 sm:px-5 h-14"
                style={{ borderTop: others.length > 0 || index > 0 ? `1px solid ${t.surface.border}` : 'none' }}>
                <span className="h-4 w-36 rounded-md animate-pulse" style={{ background: SKELETON_FILL }} />
                <span className="h-6 w-20 rounded-full animate-pulse" style={{ background: SKELETON_FILL }} />
              </li>
            ))}
          </ul>
        )}
        {moreError && (
          <p className="flex items-start gap-2 px-4 sm:px-5 py-3 text-sm sm:text-xs"
            style={{ ...toneStyle(t, 'warning'), border: 'none', borderTop: `1px solid ${t.surface.border}` }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />{moreError}
          </p>
        )}
        {canLoadMore && (
          <div className="relative p-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <span className="absolute left-0 top-[-1px] h-px transition-[width] duration-500" aria-hidden="true"
              style={{ width: `${progress}%`, background: SITE_ACCENT }} />
            <button type="button" onClick={onLoadMore} disabled={loadingMore}
              className="w-full min-h-[52px] px-4 rounded-xl inline-flex items-center justify-center gap-3 transition-colors duration-150 disabled:cursor-wait [@media(hover:hover)]:hover:bg-[color:var(--dom-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              style={{ color: t.text.primary }} data-testid="site-domain-search-more">
              <span className="w-8 h-8 rounded-full inline-flex items-center justify-center flex-shrink-0"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                {loadingMore
                  ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  : moreError ? <RefreshCw className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
              </span>
              <span className="flex flex-col items-start text-left leading-tight">
                <span className="text-sm font-semibold">
                  {loadingMore ? 'Vérification des extensions…' : moreError ? 'Réessayer' : "Voir plus d'extensions"}
                </span>
                {remaining !== null && (
                  <span className="text-xs mt-0.5 tabular-nums" style={{ color: t.text.tertiary }}>{remainingLabel(remaining)}</span>
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
