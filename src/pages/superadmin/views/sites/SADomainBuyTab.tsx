import { Search, Loader2, Calendar, Filter, Globe } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { type DomainResult, YEAR_OPTIONS } from './domainTypes';
import { DomainTopCard, DomainResultRow, DomainResultMobileCard } from './SADomainResultCard';

type FilterMode = 'all' | 'available';

interface Props {
  t: ReturnType<typeof useThemeTokens>;
  query: string;
  setQuery: (v: string) => void;
  searching: boolean;
  hasSearched: boolean;
  selectedYears: number;
  onYearsChange: (y: number) => void;
  durationLabel: string;
  onSearch: () => void;
  filtered: DomainResult[];
  topResults: DomainResult[];
  filterMode: FilterMode;
  setFilterMode: (fn: (f: FilterMode) => FilterMode) => void;
  purchasedDomains: Set<string>;
  onBuy: (d: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export default function SADomainBuyTab({ t, query, setQuery, searching, hasSearched, selectedYears, onYearsChange, durationLabel, onSearch, filtered, topResults, filterMode, setFilterMode, purchasedDomains, onBuy, searchInputRef }: Props) {
  return (
    <>
      <div className="px-4 sm:px-6 pt-5 pb-4 space-y-4" style={{ background: t.surface.primary, borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: t.card.bg, border: `1px solid ${t.surface.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: t.text.tertiary }} />
            <input
              ref={searchInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !searching) onSearch(); }}
              placeholder="Rechercher un nom de domaine..."
              className="flex-1 text-sm outline-none bg-transparent min-w-0"
              style={{ color: t.text.primary }}
              disabled={searching}
            />
          </div>
          <button
            onClick={onSearch}
            disabled={searching || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.98] flex-shrink-0"
            style={{ background: '#0ea5e9', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Rechercher</span>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.tertiary }} />
          <span className="text-[10px] font-semibold mr-1" style={{ color: t.text.tertiary }}>Duree</span>
          {YEAR_OPTIONS.map(y => (
            <button
              key={y}
              onClick={() => onYearsChange(y)}
              disabled={searching}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{
                background: selectedYears === y ? '#0ea5e9' : t.card.bg,
                color: selectedYears === y ? '#fff' : t.text.secondary,
                border: `1px solid ${selectedYears === y ? '#0ea5e9' : t.surface.border}`,
                boxShadow: selectedYears === y ? '0 2px 8px rgba(14,165,233,0.25)' : 'none',
              }}
            >
              {y} an{y > 1 ? 's' : ''}
            </button>
          ))}
        </div>
        {hasSearched && (
          <p className="text-[11px] font-medium" style={{ color: t.text.tertiary }}>Prix affiches pour {durationLabel}</p>
        )}
      </div>
      <div className="px-4 sm:px-6 py-5 space-y-6">
        {topResults.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: t.text.tertiary }}>Meilleurs resultats</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topResults.map(r => (
                <DomainTopCard key={r.domain} result={r} onBuy={onBuy} purchased={purchasedDomains.has(r.domain)} />
              ))}
            </div>
          </section>
        )}
        {hasSearched && filtered.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Autres domaines disponibles</p>
              <button
                onClick={() => setFilterMode(f => f === 'all' ? 'available' : 'all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: filterMode === 'available' ? 'rgba(16,185,129,0.1)' : t.surface.primary,
                  color: filterMode === 'available' ? '#10b981' : t.text.tertiary,
                  border: `1px solid ${filterMode === 'available' ? 'rgba(16,185,129,0.2)' : t.surface.border}`,
                }}
              >
                <Filter className="w-3 h-3" />
                {filterMode === 'available' ? 'Disponibles' : 'Tous'}
              </button>
            </div>
            <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {filtered.map(r => (
                <DomainResultRow key={r.domain} result={r} onBuy={onBuy} purchased={purchasedDomains.has(r.domain)} />
              ))}
            </div>
            <div className="sm:hidden space-y-2">
              {filtered.map(r => (
                <DomainResultMobileCard key={r.domain} result={r} onBuy={onBuy} purchased={purchasedDomains.has(r.domain)} />
              ))}
            </div>
          </section>
        )}
        {hasSearched && filtered.length === 0 && !searching && (
          <EmptyState icon={<Search className="w-5 h-5" style={{ color: t.text.tertiary }} />} title="Aucun resultat" subtitle="Essayez un autre nom de domaine." t={t} />
        )}
        {!hasSearched && (
          <EmptyState icon={<Globe className="w-6 h-6" style={{ color: '#0ea5e9' }} />} title="Recherchez un domaine" subtitle="Saisissez un nom de domaine pour verifier sa disponibilite et voir les prix." t={t} accent />
        )}
      </div>
    </>
  );
}

function EmptyState({ icon, title, subtitle, t, accent }: { icon: React.ReactNode; title: string; subtitle: string; t: ReturnType<typeof useThemeTokens>; accent?: boolean }) {
  return (
    <div className="text-center py-14">
      <div className={`${accent ? 'w-14 h-14' : 'w-12 h-12'} rounded-2xl mx-auto mb-3 flex items-center justify-center`} style={{ background: accent ? 'rgba(14,165,233,0.06)' : t.surface.primary, border: `1px solid ${accent ? 'rgba(14,165,233,0.1)' : t.surface.border}` }}>
        {icon}
      </div>
      <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>{title}</p>
      <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: t.text.tertiary }}>{subtitle}</p>
    </div>
  );
}
