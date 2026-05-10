import { Phone, Users, ChevronDown } from 'lucide-react';
import type { Vendor, StatutDef } from './types';
import type { getThemeTokens } from '../../../../lib/themeTokens';

interface CrmMobileFiltersProps {
  filterVendor: string;
  setFilterVendor: (v: string) => void;
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

export default function CrmMobileFilters({
  filterVendor, setFilterVendor,
  filterTel, setFilterTel,
  filterPrenom, setFilterPrenom,
  filterNom, setFilterNom,
  statutFilter, setStatutFilter,
  sortOrder, setSortOrder,
  vendors, statutDefs, tokens,
}: CrmMobileFiltersProps) {
  return (
    <div className="space-y-2 pt-1">
      <div className="relative">
        <select
          value={filterVendor}
          onChange={e => setFilterVendor(e.target.value)}
          className="w-full pl-8 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
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
        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
        <input
          type="text"
          placeholder="Rechercher par numero..."
          value={filterTel}
          onChange={e => setFilterTel(e.target.value)}
          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
          style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
          onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
          onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
          <input
            type="text"
            placeholder="Prenom..."
            value={filterPrenom}
            onChange={e => setFilterPrenom(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
            onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
            onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
          />
        </div>
        <div className="relative">
          <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.table.cellIcon }} />
          <input
            type="text"
            placeholder="Nom..."
            value={filterNom}
            onChange={e => setFilterNom(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }}
            onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
            onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value)}
            className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
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
            className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all"
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
  );
}
