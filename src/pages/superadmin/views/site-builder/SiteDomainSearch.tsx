import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AlertTriangle, ChevronRight, Globe, Info, Loader2, Search } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { searchDomains } from '../../../../lib/domainSearch';
import {
  appendRows, checkedCount, precheckSearchQuery, remainingCount, retryText, searchNotice, searchSummary,
  type SearchPage, type SearchRow,
} from '../../../../lib/domainSearchModel';
import type { StatusTone } from '../../../../lib/siteWorkspaceModel';
import { SITE_ACCENT, SITE_GRADIENT, cardStyle, toneStyle } from './SiteUiParts';
import { useContainerWidth } from './SiteDomainResultParts';
import { SearchLoading } from './SiteDomainSearchSections';
import SiteDomainResults from './SiteDomainResults';
import { useDomainExtensionFilter } from './useDomainExtensionFilter';

/*
 * Recherche de nom de domaine multi-extensions (lecture seule) pour l'entreprise ciblee par le SiteContext.
 * « dior » ou « dior.fr » -> le serveur Talvex verifie le NOM sur les extensions reellement vendues :
 * l'extension saisie en premier (ou « non proposee »), puis .com .fr .net .org .eu .io, puis les autres
 * a la demande (« Voir plus d'extensions », une page a la fois). Saisir une extension ne restreint jamais la recherche.
 * Achat non ouvert : bouton Acheter desactive.
 * Presentation : 1. recherche, 2. extensions recommandees en cartes, 3. autres extensions en liste compacte.
 */
interface Props {
  t: ThemeTokens;
  companyId: string;
  actorIsTalvex: boolean;
}

type Loading = 'search' | 'more' | null;

const STEPS = ['Saisissez un nom', 'Cliquez sur Vérifier', 'Choisissez votre extension'];
const EXAMPLES = ['popolera', 'popolera.com', 'popolera.fr'];
/* Au-dessus : resultats en lignes alignees ; en dessous : cartes et fiches verticales (jamais de tableau horizontal). */
const WIDE_LIST_MIN_WIDTH = 800;
const VERIFY_BUTTON_STYLE: CSSProperties = {
  background: SITE_GRADIENT,
  color: '#fff',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25), 0 4px 14px rgba(14,165,233,0.18)',
};

export default function SiteDomainSearch({ t, companyId, actorIsTalvex }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(rootRef);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [lastPage, setLastPage] = useState<SearchPage | null>(null);
  const [notice, setNotice] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Filtre par extension : catalogue serveur + verifications ciblees (les lignes recues rejoignent les resultats).
  const filter = useDomainExtensionFilter({
    companyId, searched, rows, ready: lastPage?.status === 'ok' && loading !== 'search',
    onRows: received => setRows(previous => appendRows(previous, received)),
  });

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
    filter.cancelChecks();
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
  const wide = width >= WIDE_LIST_MIN_WIDTH;

  return (
    <div ref={rootRef} className="space-y-5" data-testid="site-domain-search">
      {/* 1. RECHERCHE */}
      <section className="rounded-2xl p-4 sm:p-6" style={cardStyle(t)} aria-labelledby="site-domain-search-title">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.18)', color: SITE_ACCENT }}>
            <Globe className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="site-domain-search-title" className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: t.heading.primary }}>
              Obtenir un nom de domaine
            </h3>
            <p className="text-sm mt-1 leading-relaxed max-w-2xl" style={{ color: t.text.secondary }}>
              Vérifiez si le nom de votre choix est libre. Talvex s'occupe de tout : vous n'avez aucun compte à créer chez un hébergeur.
            </p>
          </div>
        </div>

        <ol className="mt-4 sm:mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs" style={{ color: t.text.tertiary }} aria-label="Étapes">
          {STEPS.map((step, index) => (
            <li key={step} className="inline-flex items-center gap-2">
              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold tabular-nums"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                {index + 1}
              </span>
              {step}
              {index < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <form onSubmit={onSubmit} className="relative mt-3 sm:mt-4 flex flex-col gap-2.5" noValidate>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors"
              style={{ color: focused ? t.text.secondary : t.text.tertiary }} aria-hidden="true" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Nom recherché"
              aria-describedby="site-domain-search-examples"
              placeholder={width > 0 && width < 480 ? 'ex. monentreprise' : 'ex. monentreprise ou monentreprise.fr'}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              enterKeyHint="search"
              maxLength={253}
              className="w-full h-12 sm:h-14 pl-11 pr-4 sm:pr-40 rounded-xl sm:rounded-2xl text-base sm:text-[15px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[color:var(--dom-placeholder)]"
              style={{
                background: t.input.bg,
                border: `1px solid ${focused ? t.input.borderFocus : t.input.border}`,
                boxShadow: focused ? `0 0 0 3px ${t.accent.bg}` : 'inset 0 1px 2px rgba(0,0,0,0.10)',
                color: t.input.text,
                '--dom-placeholder': t.input.placeholder,
              } as CSSProperties}
            />
          </div>
          <button type="submit" disabled={loading === 'search'}
            className="w-full h-12 sm:absolute sm:right-2 sm:top-2 sm:h-10 sm:w-auto sm:min-w-[132px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[15px] sm:text-sm font-semibold transition-[filter,transform] duration-150 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            style={VERIFY_BUTTON_STYLE}>
            {loading === 'search' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
            {loading === 'search' ? 'Vérification…' : 'Vérifier'}
          </button>
        </form>

        <p id="site-domain-search-examples" className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: t.text.tertiary }}>
          <span className="mr-0.5">Avec ou sans extension :</span>
          {EXAMPLES.map(example => (
            <span key={example} className="px-1.5 py-0.5 rounded-md font-mono text-[11px]"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              {example}
            </span>
          ))}
        </p>

        {hint && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm sm:text-xs" style={{ color: t.warning.text }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />{hint}
          </p>
        )}
      </section>

      {/* Annonce courte pour les lecteurs d'ecran (zone toujours presente). */}
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? 'Vérification en cours…' : rows.length > 0 ? searchSummary(rows) : notice?.text ?? ''}
      </p>

      {loading === 'search' && <SearchLoading t={t} wide={wide} />}

      {notice && loading !== 'search' && (
        <p className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm sm:text-xs" style={toneStyle(t, notice.tone)} data-testid="site-domain-search-notice">
          <Info className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />{notice.text}
        </p>
      )}

      {(rows.length > 0 || canLoadMore) && loading !== 'search' && (
        <div className="space-y-5" data-testid="site-domain-search-results">
          <SiteDomainResults t={t} actorIsTalvex={actorIsTalvex} wide={wide} name={lastPage?.name ?? searched ?? ''} rows={rows}
            requestedTld={lastPage?.requested_tld ?? null} filter={filter}
            more={{ canLoadMore, remaining, total: lastPage?.total_tlds ?? null, loadingMore: loading === 'more', moreError, onLoadMore: () => void loadMore() }} />
        </div>
      )}
    </div>
  );
}
