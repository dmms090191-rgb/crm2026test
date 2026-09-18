import { Lock } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { availableCount, checkedCount, searchSummary, splitResults, type SearchRow } from '../../../../lib/domainSearchModel';
import { filterRows, orderByCatalog } from '../../../../lib/domainFilterModel';
import type { DomainExtensionFilter } from './useDomainExtensionFilter';
import SiteDomainExtensionFilter, { ExtensionFilterChips } from './SiteDomainExtensionFilter';
import SiteDomainResultCard from './SiteDomainResultCard';
import { CARD_GRID_STYLE, ResultRowsList, SectionTitle, countLabel } from './SiteDomainSearchSections';

/*
 * Resultats de la recherche de domaine (affichage uniquement).
 * Ordinateur : une seule liste en lignes (recommandees puis autres extensions).
 * Mobile / conteneur etroit : cartes pour les recommandees, fiches pour les autres.
 * Filtre actif : seules les extensions choisies ; celles pas encore verifiees apparaissent « en cours ».
 */
interface MoreState {
  canLoadMore: boolean;
  remaining: number | null;
  total: number | null;
  loadingMore: boolean;
  moreError: string | null;
  onLoadMore: () => void;
}

interface Props {
  t: ThemeTokens;
  actorIsTalvex: boolean;
  wide: boolean;
  name: string;
  rows: SearchRow[];
  requestedTld: string | null;
  filter: DomainExtensionFilter;
  more: MoreState;
}

export default function SiteDomainResults({ t, actorIsTalvex, wide, name, rows, requestedTld, filter, more }: Props) {
  const filtering = filter.selected.length > 0;
  const visible = filterRows(rows, filter.selected);
  const split = splitResults(visible, requestedTld);
  const featured = split.featured;
  // Une extension verifiee depuis le filtre reprend sa place dans l'ordre du catalogue.
  const others = orderByCatalog(split.others, filter.catalog.tlds);
  const loaded = new Set(rows.map(row => row.tld));
  const waiting = filtering ? filter.pending.filter(tld => filter.selected.includes(tld) && !loaded.has(tld)) : [];
  const failed = filtering ? filter.failed.filter(tld => filter.selected.includes(tld) && !loaded.has(tld)) : [];
  const failure = failed.length > 0
    ? { message: `${filter.failMessage ?? "Certaines extensions n'ont pas pu être vérifiées."} (${failed.map(tld => `.${tld}`).join(', ')})`, onRetry: filter.retryFailed }
    : null;
  const showMore = !filtering && more.canLoadMore;
  const intro = showMore && others.length === 0 && !more.loadingMore
    ? `${more.total ? `Talvex propose ${more.total} extensions.` : 'D’autres extensions sont proposées.'} Vérifiez-les 10 par 10, ou choisissez-les avec « Filtrer par extension ».`
    : null;
  const loadMore = showMore
    ? { remaining: more.remaining, progress: more.total ? Math.min(100, (checkedCount(rows) / more.total) * 100) : 0, retry: !!more.moreError, onLoadMore: more.onLoadMore }
    : null;
  const pendingDomains = waiting.map(tld => `${name}.${tld}`);
  const extra = { pendingDomains, loadingMore: showMore && more.loadingMore, failure, moreError: filtering ? null : more.moreError, intro, loadMore };
  const hasExtra = pendingDomains.length > 0 || !!failure || !!intro || !!loadMore || extra.loadingMore || !!extra.moreError;
  const featuredMeta = checkedCount(featured) > 0 ? `${countLabel(availableCount(featured), 'disponible')} sur ${checkedCount(featured)}` : null;
  const othersMeta = others.length > 0 ? `${countLabel(checkedCount(others), 'vérifiée')} · ${countLabel(availableCount(others), 'disponible')}` : null;
  const summary = filtering
    ? `${countLabel(filter.selected.length, 'extension')} ${filter.selected.length > 1 ? 'sélectionnées' : 'sélectionnée'} · ${countLabel(availableCount(visible), 'disponible')}`
    : searchSummary(rows);
  const nothing = filtering && visible.length === 0 && !hasExtra;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-base font-semibold tracking-tight [overflow-wrap:anywhere]" style={{ color: t.heading.primary }}>
              Résultats pour « {name} »
            </h3>
            <p className="text-sm sm:text-xs mt-0.5" style={{ color: t.text.tertiary }}>{summary}</p>
          </div>
          <SiteDomainExtensionFilter t={t} catalog={filter.catalog} selected={filter.selected}
            onOpen={() => void filter.loadCatalog()} onRetryCatalog={() => void filter.loadCatalog(true)}
            onToggle={filter.toggle} onClear={filter.clear} />
        </div>
        {actorIsTalvex && (
          <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed" style={{ color: t.text.tertiary }}>
            <Lock className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
            Coûts Hostinger visibles par Talvex uniquement · tarif standard de l’extension, à reconfirmer à l’achat.
          </p>
        )}
        <ExtensionFilterChips t={t} selected={filter.selected} onRemove={filter.toggle} onClear={filter.clear} />
      </div>

      {nothing && (
        <p className="rounded-2xl px-4 py-5 text-sm sm:text-xs" style={{ color: t.text.tertiary, border: `1px dashed ${t.surface.border}` }}>
          Aucun résultat pour les extensions sélectionnées.
        </p>
      )}

      {wide ? (
        (visible.length > 0 || hasExtra) && (
          <ResultRowsList t={t} actorIsTalvex={actorIsTalvex} wide requestedTld={requestedTld} {...extra}
            groups={[
              { key: 'featured', title: 'Extensions recommandées', meta: featuredMeta, rows: featured },
              { key: 'others', title: 'Autres extensions', meta: othersMeta, rows: others, keepTitle: hasExtra },
            ]} />
        )
      ) : (
        <>
          {featured.length > 0 && (
            <section aria-labelledby="site-domain-featured-title">
              <SectionTitle t={t} id="site-domain-featured-title" title="Extensions recommandées" meta={featuredMeta} />
              <ul className="mt-3 grid gap-3" style={CARD_GRID_STYLE}>
                {featured.map(row => (
                  <SiteDomainResultCard key={row.domain} t={t} row={row} actorIsTalvex={actorIsTalvex} requested={row.tld === requestedTld} />
                ))}
              </ul>
            </section>
          )}
          {(others.length > 0 || hasExtra) && (
            <section aria-labelledby="site-domain-others-title">
              <SectionTitle t={t} id="site-domain-others-title" title="Autres extensions" meta={othersMeta} />
              <div className="mt-3">
                <ResultRowsList t={t} actorIsTalvex={actorIsTalvex} wide={false} requestedTld={requestedTld} {...extra}
                  groups={[{ key: 'others', title: null, meta: null, rows: others }]} />
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
