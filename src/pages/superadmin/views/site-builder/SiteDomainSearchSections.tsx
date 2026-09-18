import type { CSSProperties } from 'react';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { remainingLabel, type SearchRow } from '../../../../lib/domainSearchModel';
import { SITE_ACCENT, toneStyle } from './SiteUiParts';
import { SKELETON_FILL } from './SiteDomainResultParts';
import SiteDomainResultRow, { OTHER_COLUMNS } from './SiteDomainResultRow';

/* Sections d'affichage de la recherche de domaine (aucun etat, aucun appel serveur). */

/* 1 carte sur mobile, 2 sur tablette (affichage en cartes du conteneur etroit). */
export const CARD_GRID_STYLE: CSSProperties = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 256px), 1fr))' };
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

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

const bar = (className: string) => <span className={`rounded-md animate-pulse ${className}`} style={{ background: SKELETON_FILL }} />;

/* Premiere verification : squelette en lignes (ordinateur) ou en cartes (mobile). */
export function SearchLoading({ t, wide }: { t: ThemeTokens; wide: boolean }) {
  return (
    <div className="space-y-3" data-testid="site-domain-search-loading">
      <p className="flex items-center gap-2 px-1 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: SITE_ACCENT }} aria-hidden="true" />
        Vérification en cours… cela peut prendre une vingtaine de secondes.
      </p>
      {wide ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}` }} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid items-center gap-4 px-5 h-14" style={{ gridTemplateColumns: OTHER_COLUMNS, borderTop: index ? `1px solid ${t.surface.border}` : 'none' }}>
              {bar('h-4 w-36')}{bar('h-6 w-24 rounded-full')}{bar('h-4 w-16')}{bar('h-3.5 w-20')}{bar('h-9 w-44 rounded-xl')}
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-3" style={CARD_GRID_STYLE} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="rounded-2xl p-4 sm:p-5" style={{ border: `1px solid ${t.surface.border}` }}>
              <div className="flex items-center justify-between gap-3">{bar('h-5 w-32')}{bar('h-6 w-20 rounded-full')}</div>
              <span className="block mt-5">{bar('block h-3 w-28')}</span>
              <span className="block mt-2">{bar('block h-7 w-24')}</span>
              <span className="block mt-5">{bar('block h-10 w-full rounded-xl')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface RowGroup {
  key: string;
  /* Titre de groupe affiche DANS la liste (ordinateur) ; null quand le titre est au-dessus (mobile). */
  title: string | null;
  meta: string | null;
  rows: SearchRow[];
  /* Afficher le titre meme sans ligne (verification ou « Voir plus » a suivre). */
  keepTitle?: boolean;
}

interface ListProps {
  t: ThemeTokens;
  actorIsTalvex: boolean;
  wide: boolean;
  groups: RowGroup[];
  requestedTld: string | null;
  /* Extensions choisies dans le filtre en cours de verification (« popolera.shop »). */
  pendingDomains: string[];
  loadingMore: boolean;
  failure: { message: string; onRetry: () => void } | null;
  moreError: string | null;
  intro: string | null;
  loadMore: { remaining: number | null; progress: number; retry: boolean; onLoadMore: () => void } | null;
}

/* Liste des resultats : en-tete de colonnes et groupes (ordinateur) ou fiches (mobile), puis « Voir plus ». */
export function ResultRowsList({ t, actorIsTalvex, wide, groups, requestedTld, pendingDomains, loadingMore, failure, moreError, intro, loadMore }: ListProps) {
  const line = `1px solid ${t.surface.border}`;
  let first = true;
  const borderTop = () => {
    const value = first ? 'none' : line;
    first = false;
    return value;
  };
  const visibleGroups = groups.filter(group => group.rows.length > 0 || group.keepTitle);

  return (
    <div className="rounded-2xl overflow-hidden" data-testid="site-domain-results-list"
      style={{ background: t.card.bg, border: line, '--dom-row-hover': t.surface.hover } as CSSProperties}>
      {wide && (
        <div className="grid items-center gap-4 px-5 h-10 text-[11px] font-semibold uppercase tracking-wider" aria-hidden="true"
          style={{ gridTemplateColumns: OTHER_COLUMNS, color: t.text.tertiary, background: t.surface.secondary, borderTop: borderTop() }}>
          <span>Domaine</span>
          <span>Statut</span>
          {actorIsTalvex ? <><span>Coût 1re année</span><span>Renouvellement</span></> : <span className="col-span-2">Prix</span>}
          <span>Action</span>
        </div>
      )}
      {visibleGroups.map(group => (
        <div key={group.key}>
          {group.title && (
            <div className="flex items-baseline justify-between gap-4 px-5 pt-3 pb-2" style={{ borderTop: borderTop() }}>
              <h4 id={`site-domain-group-${group.key}`} className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: t.text.secondary }}>{group.title}</h4>
              {group.meta && <span className="text-xs tabular-nums" style={{ color: t.text.tertiary }}>{group.meta}</span>}
            </div>
          )}
          {group.rows.length > 0 && (
            <ul aria-labelledby={group.title ? `site-domain-group-${group.key}` : undefined}>
              {group.rows.map(row => (
                <SiteDomainResultRow key={row.domain} t={t} row={row} actorIsTalvex={actorIsTalvex} wide={wide}
                  divider={borderTop() !== 'none'} requested={row.tld === requestedTld && row.status !== 'not_offered'} />
              ))}
            </ul>
          )}
        </div>
      ))}
      {pendingDomains.map(domain => (
        <div key={domain} className="flex items-center justify-between gap-4 px-4 sm:px-5 min-h-[56px]" style={{ borderTop: borderTop() }}
          data-testid="site-domain-pending">
          <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: t.text.secondary }}>{domain}</span>
          <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap" style={{ color: t.text.tertiary }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: SITE_ACCENT }} aria-hidden="true" /> Vérification…
          </span>
        </div>
      ))}
      {loadingMore && (
        <ul aria-hidden="true" data-testid="site-domain-search-more-loading">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="flex items-center justify-between gap-4 px-4 sm:px-5 h-14" style={{ borderTop: borderTop() }}>
              {bar('h-4 w-36')}{bar('h-6 w-20 rounded-full')}
            </li>
          ))}
        </ul>
      )}
      {failure && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm sm:text-xs"
          style={{ ...toneStyle(t, 'warning'), border: 'none', borderTop: borderTop() }} data-testid="site-domain-filter-failure">
          <p className="flex items-start gap-2 min-w-0"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />{failure.message}</p>
          <button type="button" onClick={failure.onRetry} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg font-semibold ${FOCUS_RING}`}
            style={{ border: `1px solid ${t.warning.border}` }}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Réessayer
          </button>
        </div>
      )}
      {moreError && (
        <p className="flex items-start gap-2 px-4 sm:px-5 py-3 text-sm sm:text-xs" style={{ ...toneStyle(t, 'warning'), border: 'none', borderTop: borderTop() }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />{moreError}
        </p>
      )}
      {intro && (
        <p className="px-4 sm:px-5 py-4 text-sm sm:text-xs leading-relaxed" style={{ color: t.text.tertiary, borderTop: borderTop() }}>{intro}</p>
      )}
      {loadMore && (
        <div className="relative p-2" style={{ borderTop: borderTop() }}>
          <span className="absolute left-0 top-[-1px] h-px transition-[width] duration-500" aria-hidden="true"
            style={{ width: `${loadMore.progress}%`, background: SITE_ACCENT }} />
          <button type="button" onClick={loadMore.onLoadMore} disabled={loadingMore}
            className={`w-full min-h-[52px] px-4 rounded-xl inline-flex items-center justify-center gap-3 transition-colors duration-150 disabled:cursor-wait [@media(hover:hover)]:hover:bg-[color:var(--dom-row-hover)] ${FOCUS_RING}`}
            style={{ color: t.text.primary }} data-testid="site-domain-search-more">
            <span className="w-8 h-8 rounded-full inline-flex items-center justify-center flex-shrink-0"
              style={{ background: t.surface.secondary, border: line, color: t.text.secondary }}>
              {loadingMore
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : loadMore.retry ? <RefreshCw className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </span>
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-sm font-semibold">
                {loadingMore ? 'Vérification des extensions…' : loadMore.retry ? 'Réessayer' : "Voir plus d'extensions"}
              </span>
              {loadMore.remaining !== null && (
                <span className="text-xs mt-0.5 tabular-nums" style={{ color: t.text.tertiary }}>{remainingLabel(loadMore.remaining)}</span>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
