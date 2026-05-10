import { useState } from 'react';
import { Search, Users, Phone, Mail, ChevronDown, SlidersHorizontal } from 'lucide-react';
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
  vendors, statutDefs, tokens,
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

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: tokens.card.bg, border: tokens.card.border }}
    >
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${tokens.table.colSep}` }}>
          <Search className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>Filtres de recherche</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <select
                value={filterVendor}
                onChange={e => setFilterVendor(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              >
                <option value="tous" style={{ background: tokens.selectBg }}>Tous les vendeurs</option>
                <option value="admin" style={{ background: tokens.selectBg }}>Admin (sans vendeur)</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id} style={{ background: tokens.selectBg }}>{v.first_name} {v.last_name}</option>
                ))}
              </select>
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} />
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} />
            </div>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={filterEmail}
                onChange={e => setFilterEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
              <input
                type="text"
                placeholder="Rechercher par numero..."
                value={filterTel}
                onChange={e => setFilterTel(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              />
            </div>
            <div className="relative">
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
              <input
                type="text"
                placeholder="Rechercher par prenom..."
                value={filterPrenom}
                onChange={e => setFilterPrenom(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={filterNom}
                onChange={e => setFilterNom(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              />
            </div>
            <div className="relative">
              <select
                value={statutFilter}
                onChange={e => setStatutFilter(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              >
                <option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>
                {statutDefs.map(s => (
                  <option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>
                ))}
                <option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} />
            </div>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')}
                className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
                onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
              >
                <option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option>
                <option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <div className="px-3 py-3 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
            <input
              type="text"
              placeholder="Rechercher par email..."
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
              style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
              onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
              onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
            />
          </div>

          {/* Filters toggle button */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: activeFilterCount > 0 ? tokens.accent.bg : tokens.input.bg,
              border: `1px solid ${activeFilterCount > 0 ? tokens.accent.border : tokens.input.border}`,
              color: activeFilterCount > 0 ? tokens.accent.text : tokens.text.secondary,
            }}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0
                ? `${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''}`
                : 'Filtres'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>

          {mobileFiltersOpen && (
            <CrmMobileFilters
              filterVendor={filterVendor} setFilterVendor={setFilterVendor}
              filterTel={filterTel} setFilterTel={setFilterTel}
              filterPrenom={filterPrenom} setFilterPrenom={setFilterPrenom}
              filterNom={filterNom} setFilterNom={setFilterNom}
              statutFilter={statutFilter} setStatutFilter={setStatutFilter}
              sortOrder={sortOrder} setSortOrder={setSortOrder}
              vendors={vendors} statutDefs={statutDefs} tokens={tokens}
            />
          )}
        </div>
      </div>
    </div>
  );
}
