import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { searchDomains } from '../../../../lib/domainSearch';
import {
  appendRows, checkedCount, precheckSearchQuery, remainingCount, retryText, searchNotice, searchSummary,
  type SearchPage, type SearchRow,
} from '../../../../lib/domainSearchModel';
import type { StatusTone } from '../../../../lib/siteWorkspaceModel';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, secondaryButtonStyle, toneStyle } from './SiteUiParts';
import SiteDomainResultRow from './SiteDomainResultRow';

/*
 * Recherche de nom de domaine multi-extensions (lecture seule) pour l'entreprise ciblee par le SiteContext.
 * « dior » ou « dior.fr » -> le serveur Talvex verifie le NOM sur les extensions reellement vendues :
 * l'extension saisie en premier (ou « non proposee »), puis .com .fr .net .org .eu .io, puis les autres
 * a la demande (« Voir plus d'extensions », une page a la fois). Saisir une extension ne restreint jamais la recherche.
 * Achat non ouvert : bouton Acheter desactive.
 */
interface Props {
  t: ThemeTokens;
  companyId: string;
  actorIsTalvex: boolean;
}

type Loading = 'search' | 'more' | null;

export default function SiteDomainSearch({ t, companyId, actorIsTalvex }: Props) {
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [lastPage, setLastPage] = useState<SearchPage | null>(null);
  const [notice, setNotice] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetResults = () => {
    setRows([]);
    setLastPage(null);
    setNotice(null);
    setMoreError(null);
  };

  useEffect(() => {
    abortRef.current?.abort();
    resetResults();
    setSearched(null);
    setHint(null);
    setLoading(null);
  }, [companyId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const startRequest = (kind: Exclude<Loading, null>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(kind);
    return controller;
  };

  const runSearch = async (raw: string) => {
    const pre = precheckSearchQuery(raw);
    if (!pre.ok) {
      setHint(pre.message);
      resetResults();
      return;
    }
    setHint(null);
    resetResults();
    setSearched(pre.value);
    const controller = startRequest('search');
    try {
      const page = await searchDomains(companyId, pre.value, 0, controller.signal);
      if (controller.signal.aborted) return;
      setLastPage(page);
      setRows(page.results);
      setNotice(searchNotice(page));
    } catch {
      // Recherche remplacee par une plus recente.
    } finally {
      if (abortRef.current === controller) setLoading(null);
    }
  };

  const loadMore = async () => {
    if (!searched || !lastPage || lastPage.next_offset === null || loading) return;
    setMoreError(null);
    const controller = startRequest('more');
    try {
      const page = await searchDomains(companyId, searched, lastPage.next_offset, controller.signal);
      if (controller.signal.aborted) return;
      if (page.status === 'ok') {
        setRows(previous => appendRows(previous, page.results));
        setLastPage(page);
      } else {
        // La page n'a pas pu etre verifiee : meme position conservee, bouton « Reessayer ».
        setMoreError(`Impossible de vérifier ces extensions pour le moment. ${retryText(page.reason, page.retry_after_seconds)}`);
      }
    } catch {
      // Remplacee par une nouvelle recherche.
    } finally {
      if (abortRef.current === controller) setLoading(null);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (loading !== 'search') void runSearch(query);
  };

  const remaining = remainingCount(lastPage, checkedCount(rows));
  const canLoadMore = lastPage?.status === 'ok' && lastPage.next_offset !== null && (remaining ?? 0) > 0;
  const firstOtherIndex = rows.findIndex(row => !row.popular && row.status !== 'not_offered' && row.tld !== lastPage?.requested_tld);

  return (
    <div className="mt-4 space-y-3" data-testid="site-domain-search">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2" noValidate>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Nom recherché"
          placeholder="ex. monentreprise ou monentreprise.fr"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          maxLength={253}
          className="w-full min-h-[44px] sm:min-h-[38px] px-3 rounded-xl text-base sm:text-xs outline-none"
          style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
        />
        <button type="submit" disabled={loading === 'search'} className={`${BUTTON_BASE} sm:w-auto`} style={PRIMARY_BUTTON_STYLE}>
          {loading === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading === 'search' ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>

      {hint && <p role="alert" className="text-sm sm:text-xs" style={{ color: t.warning.text }}>{hint}</p>}

      {/* Annonce courte pour les lecteurs d'ecran (zone toujours presente). */}
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? 'Vérification en cours…' : rows.length > 0 ? searchSummary(rows) : notice?.text ?? ''}
      </p>

      {loading === 'search' && (
        <div className="space-y-2" data-testid="site-domain-search-loading">
          <p className="text-sm sm:text-xs" style={{ color: t.text.tertiary }}>
            Vérification en cours… cela peut prendre une vingtaine de secondes.
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}` }} aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse" style={{ background: index % 2 ? t.surface.secondary : 'transparent' }} />
            ))}
          </div>
        </div>
      )}

      {notice && loading !== 'search' && (
        <p className="rounded-lg px-3 py-2 text-sm sm:text-xs" style={toneStyle(t, notice.tone)} data-testid="site-domain-search-notice">
          {notice.text}
        </p>
      )}

      {rows.length > 0 && loading !== 'search' && (
        <div className="rounded-xl overflow-hidden" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
          data-testid="site-domain-search-results">
          <div className="px-3 sm:px-4 py-2.5" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
            <p className="text-sm sm:text-xs font-semibold" style={{ color: t.heading.primary }}>
              Résultats pour « {lastPage?.name ?? searched} »
            </p>
            {actorIsTalvex && (
              <p className="text-[11px] mt-0.5" style={{ color: t.text.tertiary }}>
                Coûts Hostinger visibles par Talvex uniquement · tarif standard de l’extension, à reconfirmer à l’achat.
              </p>
            )}
          </div>
          <ul>
            {rows.map((row, index) => (
              <Fragment key={row.domain}>
                {index === firstOtherIndex && index > 0 && (
                  <li className="px-3 sm:px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>
                    Autres extensions
                  </li>
                )}
                <SiteDomainResultRow t={t} row={row} actorIsTalvex={actorIsTalvex} divider={index !== 0 && index !== firstOtherIndex} />
              </Fragment>
            ))}
          </ul>
        </div>
      )}

      {moreError && (
        <p className="rounded-lg px-3 py-2 text-sm sm:text-xs" style={toneStyle(t, 'warning')}>{moreError}</p>
      )}

      {canLoadMore && loading !== 'search' && (
        <button type="button" onClick={() => void loadMore()} disabled={loading === 'more'}
          className={`${BUTTON_BASE} w-full sm:w-auto`} style={secondaryButtonStyle(t)} data-testid="site-domain-search-more">
          {loading === 'more' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
          {loading === 'more' ? 'Vérification…' : moreError ? 'Réessayer' : `Voir plus d'extensions (${remaining})`}
        </button>
      )}
    </div>
  );
}
