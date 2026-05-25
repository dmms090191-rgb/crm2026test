import { useState } from 'react';
import { Search, ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import CrmFiltersDesktop from './CrmFiltersDesktop';
import CrmMobileFilters from './CrmMobileFilters';
import type { Vendor, StatutDef } from './types';
import type { getThemeTokens } from '../../../../lib/themeTokens';

interface CrmFiltersProps {
  filterVendor: string;
  setFilterVendor: (v: string) => void;
  filterEmail: string;
  setFilterEmail: (v: string) => void;
  filterTel: string;
  setFilterTel: (v: string) => void;
  filterPrenom: string;
  setFilterPrenom: (v: string) => void;
  filterNom: string;
  setFilterNom: (v: string) => void;
  statutFilter: string;
  setStatutFilter: (v: string) => void;
  sortOrder: 'recent' | 'ancien';
  setSortOrder: (v: 'recent' | 'ancien') => void;
  vendors: Vendor[];
  statutDefs: StatutDef[];
  tokens: ReturnType<typeof getThemeTokens>;
}

export default function CrmFilters({
  filterVendor, setFilterVendor,
  filterEmail, setFilterEmail,
  filterTel, setFilterTel,
  filterPrenom, setFilterPrenom,
  filterNom, setFilterNom,
  statutFilter, setStatutFilter,
  sortOrder, setSortOrder,
  vendors, statutDefs, tokens: t,
}: CrmFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = [
    filterVendor !== 'tous' ? 1 : 0,
    filterEmail ? 1 : 0,
    filterTel ? 1 : 0,
    filterPrenom ? 1 : 0,
    filterNom ? 1 : 0,
    statutFilter !== 'Tous' ? 1 : 0,
    sortOrder !== 'recent' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleReset = () => {
    setFilterVendor('tous');
    setFilterEmail('');
    setFilterTel('');
    setFilterPrenom('');
    setFilterNom('');
    setStatutFilter('Tous');
    setSortOrder('recent');
  };

  const fieldStyle: React.CSSProperties = {
    background: t.surface.secondary,
    border: `1px solid ${t.surface.border}`,
    color: t.input.text,
    caretColor: t.input.text,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = t.accent.solid;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accent.bg}`;
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = t.surface.border;
    e.currentTarget.style.boxShadow = 'none';
  };
  const activeFieldBorder = (isActive: boolean): React.CSSProperties =>
    isActive ? { ...fieldStyle, borderColor: t.accent.border, background: t.accent.bg } : fieldStyle;

  return (
    <>
      <CrmFiltersDesktop
        filterVendor={filterVendor} setFilterVendor={setFilterVendor}
        filterEmail={filterEmail} setFilterEmail={setFilterEmail}
        filterTel={filterTel} setFilterTel={setFilterTel}
        filterPrenom={filterPrenom} setFilterPrenom={setFilterPrenom}
        filterNom={filterNom} setFilterNom={setFilterNom}
        statutFilter={statutFilter} setStatutFilter={setStatutFilter}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        vendors={vendors} statutDefs={statutDefs}
        activeFilterCount={activeFilterCount} onReset={handleReset} t={t}
      />

      {/* Mobile layout */}
      <div
        className="md:hidden rounded-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="px-3.5 py-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.table.cellIcon }} />
            <input
              type="text"
              placeholder="Rechercher par email..."
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200"
              style={activeFieldBorder(!!filterEmail)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex-1 flex items-center justify-between h-11 px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
              style={{
                background: activeFilterCount > 0 ? t.accent.bg : t.surface.secondary,
                border: `1px solid ${activeFilterCount > 0 ? t.accent.border : t.surface.border}`,
                color: activeFilterCount > 0 ? t.accent.text : t.text.secondary,
              }}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0
                  ? `${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''}`
                  : 'Filtres'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="h-11 w-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {mobileFiltersOpen && (
            <CrmMobileFilters
              filterVendor={filterVendor} setFilterVendor={setFilterVendor}
              filterTel={filterTel} setFilterTel={setFilterTel}
              filterPrenom={filterPrenom} setFilterPrenom={setFilterPrenom}
              filterNom={filterNom} setFilterNom={setFilterNom}
              statutFilter={statutFilter} setStatutFilter={setStatutFilter}
              sortOrder={sortOrder} setSortOrder={setSortOrder}
              vendors={vendors} statutDefs={statutDefs} tokens={t}
            />
          )}
        </div>
      </div>
    </>
  );
}
