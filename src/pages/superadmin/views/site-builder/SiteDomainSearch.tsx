import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Search, ShoppingBag, XCircle, AlertCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { checkDomainAvailability } from '../../../../lib/domainSearch';
import { describeAvailability, precheckDomainQuery, type DomainAvailabilityResult } from '../../../../lib/domainSearchModel';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, SITE_ACCENT, toneStyle } from './SiteUiParts';

/*
 * Recherche de nom de domaine (lecture seule) pour l'entreprise ciblee par le SiteContext.
 * Disponibilite et prix viennent du serveur Talvex ; le bouton Acheter reste desactive
 * tant que l'achat (phase 3) n'est pas valide.
 */
interface Props {
  t: ThemeTokens;
  companyId: string;
  actorIsTalvex: boolean;
}

export default function SiteDomainSearch({ t, companyId, actorIsTalvex }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<DomainAvailabilityResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    abortRef.current?.abort();
    setResult(null);
    setHint(null);
    setLoading(false);
  }, [companyId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runCheck = async (raw: string) => {
    const pre = precheckDomainQuery(raw);
    if (!pre.ok) {
      setHint(pre.message);
      setResult(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setHint(null);
    setLoading(true);
    try {
      const next = await checkDomainAvailability(companyId, pre.value, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch {
      // Recherche remplacee par une plus recente : rien a afficher.
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!loading) void runCheck(query);
  };

  const pickAlternative = (domain: string) => {
    setQuery(domain);
    // Le bouton choisi disparait pendant la verification : le focus revient sur le champ.
    inputRef.current?.focus();
    void runCheck(domain);
  };

  const view = result ? describeAvailability(result, actorIsTalvex) : null;
  const icon = view?.tone === 'success' ? <CheckCircle2 className="w-4 h-4" />
    : view?.tone === 'danger' ? <XCircle className="w-4 h-4" />
      : <AlertCircle className="w-4 h-4" />;

  return (
    <div className="mt-4 space-y-3" data-testid="site-domain-search">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2" noValidate>
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Nom de domaine recherché"
          placeholder="ex. monentreprise.com"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          maxLength={253}
          className="w-full min-h-[44px] sm:min-h-[38px] px-3 rounded-xl text-base sm:text-xs outline-none"
          style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
        />
        <button type="submit" disabled={loading} className={`${BUTTON_BASE} sm:w-auto`} style={PRIMARY_BUTTON_STYLE}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>

      {hint && (
        <p role="alert" className="text-sm sm:text-xs" style={{ color: t.warning.text }}>{hint}</p>
      )}

      {/* Zone d'annonce toujours presente : les lecteurs d'ecran annoncent le resultat quand il change. */}
      <div role="status" aria-live="polite">
        {loading && (
          <p className="text-sm sm:text-xs" style={{ color: t.text.tertiary }} data-testid="site-domain-search-loading">
            Vérification en cours… cela peut prendre jusqu’à une vingtaine de secondes.
          </p>
        )}
        {view && result && !loading && (
          <div className="rounded-xl p-3 sm:p-4 space-y-2.5" data-testid="site-domain-search-result"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            {result.domain && (
              <p className="text-base sm:text-sm font-bold break-all" style={{ color: t.heading.primary }}>{result.domain}</p>
            )}
            <p className="inline-flex items-start gap-1.5 rounded-lg px-2.5 py-1 text-sm sm:text-xs font-semibold" style={toneStyle(t, view.tone)}
              data-testid="site-domain-search-status">
              <span className="mt-px flex-shrink-0">{icon}</span>
              <span>{view.label}</span>
            </p>
            {view.detail && (
              <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>{view.detail}</p>
            )}
            {view.priceLines.map(line => (
              <p key={line} className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.primary }}>{line}</p>
            ))}

            {view.alternatives.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm sm:text-xs" style={{ color: t.text.tertiary }}>Noms proches disponibles :</p>
                <div className="flex flex-wrap gap-2">
                  {view.alternatives.map(name => (
                    <button key={name} type="button" onClick={() => pickAlternative(name)}
                      className="min-h-[44px] sm:min-h-[32px] px-3 rounded-full text-sm sm:text-xs font-semibold break-all"
                      style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)', color: SITE_ACCENT }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view.showBuyPlaceholder && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                <button type="button" disabled aria-disabled="true" className={`${BUTTON_BASE} sm:w-auto`} style={PRIMARY_BUTTON_STYLE}
                  data-testid="site-domain-buy-disabled">
                  <ShoppingBag className="w-4 h-4" /> Acheter
                </button>
                <span className="text-sm sm:text-xs" style={{ color: t.text.tertiary }}>Bientôt disponible</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
