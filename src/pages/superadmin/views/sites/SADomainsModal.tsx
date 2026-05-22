import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Loader2, ShoppingCart, Link2, Shield } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { type CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import { supabase } from '../../../../lib/supabase';
import { type DomainResult, type DomainOrder, callRegistrar, generateDomainSuggestions, checkDomainAvailability } from './domainTypes';
import SADomainBuyTab from './SADomainBuyTab';
import SADomainBuyConfirmModal from './SADomainBuyConfirmModal';
import SADomainsLinkedList from './SADomainsLinkedList';

interface Props {
  page: CompanyHomePageWithCompany;
  onClose: () => void;
  onChanged: () => void;
}

type Tab = 'buy' | 'linked';
type FilterMode = 'all' | 'available';

export default function SADomainsModal({ page, onClose, onChanged }: Props) {
  const t = useThemeTokens();
  const [tab, setTab] = useState<Tab>('buy');
  const [query, setQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState<number>(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [buyDomain, setBuyDomain] = useState<string | null>(null);
  const [purchasedDomains, setPurchasedDomains] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data } = await supabase
      .from('domain_orders')
      .select('id, domain_name, vercel_order_status, purchase_price, currency, years, created_at, completed_at')
      .eq('home_page_id', page.id)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
    setOrdersLoading(false);
  }, [page.id]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handlePurchased = () => {
    if (buyDomain) setPurchasedDomains(prev => new Set(prev).add(buyDomain));
    setBuyDomain(null);
    loadOrders();
    onChanged();
  };

  const switchToBuy = () => {
    setTab('buy');
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

  const handleSearch = async () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    const domains = generateDomainSuggestions(q);
    setSearching(true);
    setHasSearched(true);
    setResults(domains.map(d => ({ domain: d, available: null, price: null, loading: true })));
    const batchSize = 3;
    for (let i = 0; i < domains.length; i += batchSize) {
      if (ac.signal.aborted) break;
      const batch = domains.slice(i, i + batchSize);
      const settled = await Promise.all(batch.map(d => checkDomainAvailability(d, selectedYears, ac.signal)));
      if (ac.signal.aborted) break;
      setResults(prev => {
        const next = [...prev];
        for (const r of settled) {
          const idx = next.findIndex(x => x.domain === r.domain);
          if (idx >= 0) next[idx] = r;
        }
        return next;
      });
    }
    setSearching(false);
  };

  const handleYearsChange = (years: number) => {
    setSelectedYears(years);
    if (hasSearched && results.length > 0) refreshPrices(years);
  };

  const refreshPrices = async (years: number) => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    const availableDomains = results.filter(r => r.available === true);
    if (availableDomains.length === 0) return;
    setResults(prev => prev.map(r => r.available === true ? { ...r, loading: true, price: null, yearsWarning: undefined } : r));
    for (const r of availableDomains) {
      if (ac.signal.aborted) break;
      try {
        const priceRes = await callRegistrar('get-price', { domain: r.domain, years });
        if (ac.signal.aborted) break;
        setResults(prev => prev.map(x => x.domain !== r.domain ? x : priceRes.yearsNotSupported
          ? { ...x, loading: false, price: null, yearsWarning: priceRes.error || 'Duree non disponible' }
          : priceRes.error ? { ...x, loading: false, error: priceRes.error }
          : { ...x, loading: false, price: priceRes, yearsWarning: undefined }
        ));
      } catch {
        if (ac.signal.aborted) break;
        setResults(prev => prev.map(x => x.domain !== r.domain ? x : { ...x, loading: false, error: 'Erreur reseau' }));
      }
    }
  };

  const filtered = filterMode === 'available' ? results.filter(r => r.available === true) : results;
  const topResults = filtered.filter(r => r.available === true && r.price).slice(0, 4);
  const buyTarget = buyDomain ? results.find(r => r.domain === buyDomain && r.price) : null;
  const confirmedYears = topResults.length > 0 ? topResults[0].price!.years : selectedYears;
  const durationLabel = confirmedYears === 1 ? '1 an' : `${confirmedYears} ans`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl h-[96vh] sm:h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0" style={{ background: t.card.bg, borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <Globe className="w-4 h-4" style={{ color: '#0ea5e9' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaines</h2>
                  <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <Shield className="w-2.5 h-2.5" /> Super Admin
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: t.text.tertiary }}>{page.companies?.name ?? 'Societe'}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70" style={{ color: t.text.tertiary }}>
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex px-4 sm:px-6 gap-1">
            <TabBtn active={tab === 'buy'} icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Acheter un domaine" onClick={() => setTab('buy')} t={t} />
            <TabBtn active={tab === 'linked'} icon={<Link2 className="w-3.5 h-3.5" />} label="Domaines lies" onClick={() => setTab('linked')} t={t} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'buy' ? (
            <SADomainBuyTab
              t={t} query={query} setQuery={setQuery} searching={searching} hasSearched={hasSearched}
              selectedYears={selectedYears} onYearsChange={handleYearsChange} durationLabel={durationLabel}
              onSearch={handleSearch} filtered={filtered} topResults={topResults} filterMode={filterMode}
              setFilterMode={setFilterMode} purchasedDomains={purchasedDomains} onBuy={setBuyDomain}
              searchInputRef={searchInputRef}
            />
          ) : (
            <div className="flex flex-col min-h-full px-4 sm:px-6 py-5">
              {ordersLoading ? (
                <div className="flex-1 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0ea5e9' }} />
                  <span className="text-xs" style={{ color: t.text.tertiary }}>Chargement...</span>
                </div>
              ) : (
                <SADomainsLinkedList t={t} page={page} orders={orders} onAction={() => { loadOrders(); onChanged(); }} onSwitchToBuy={switchToBuy} />
              )}
            </div>
          )}
        </div>
      </div>

      {buyTarget && (
        <SADomainBuyConfirmModal
          result={buyTarget}
          homePageId={page.id}
          onClose={() => setBuyDomain(null)}
          onPurchased={handlePurchased}
        />
      )}
    </div>,
    document.body,
  );
}

function TabBtn({ active, icon, label, onClick, t }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative"
      style={{ color: active ? '#0ea5e9' : t.text.tertiary }}
    >
      {icon}
      <span>{label}</span>
      {active && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: '#0ea5e9' }} />}
    </button>
  );
}
