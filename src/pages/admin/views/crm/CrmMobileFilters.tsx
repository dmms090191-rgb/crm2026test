import { Phone, Users, User, ChevronDown, Signal, ArrowUpDown } from 'lucide-react';
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
  vendors, statutDefs, tokens: t,
}: CrmMobileFiltersProps) {
  const fieldStyle: React.CSSProperties = {
    background: t.surface.secondary,
    border: `1px solid ${t.surface.border}`,
    color: t.input.text,
    caretColor: t.input.text,
  };
  const activeBorder = (active: boolean): React.CSSProperties =>
    active ? { ...fieldStyle, borderColor: t.accent.border, background: t.accent.bg } : fieldStyle;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = t.accent.solid;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accent.bg}`;
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = t.surface.border;
    e.currentTarget.style.boxShadow = 'none';
  };

  const inputCls = 'w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200';
  const selectCls = 'w-full h-11 pl-10 pr-8 rounded-xl text-[13px] focus:outline-none appearance-none cursor-pointer transition-all duration-200';
  const iconCls = 'w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none';
  const chevronCls = 'w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none';

  return (
    <div className="space-y-2.5 pt-1 pb-0.5">
      {/* Vendeur */}
      <div className="relative">
        <Users className={iconCls} style={{ color: t.table.cellIcon }} />
        <select
          value={filterVendor}
          onChange={e => setFilterVendor(e.target.value)}
          className={selectCls}
          style={activeBorder(filterVendor !== 'tous')}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <option value="tous" style={{ background: t.selectBg }}>Tous les vendeurs</option>
          <option value="admin" style={{ background: t.selectBg }}>Admin (sans vendeur)</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id} style={{ background: t.selectBg }}>{v.first_name} {v.last_name}</option>
          ))}
        </select>
        <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
      </div>

      {/* Telephone */}
      <div className="relative">
        <Phone className={iconCls} style={{ color: t.table.cellIcon }} />
        <input
          type="text"
          placeholder="Telephone..."
          value={filterTel}
          onChange={e => setFilterTel(e.target.value)}
          className={inputCls}
          style={activeBorder(!!filterTel)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      {/* Prenom + Nom */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <User className={iconCls} style={{ color: t.table.cellIcon }} />
          <input
            type="text"
            placeholder="Prenom..."
            value={filterPrenom}
            onChange={e => setFilterPrenom(e.target.value)}
            className={inputCls}
            style={activeBorder(!!filterPrenom)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
        <div className="relative">
          <User className={iconCls} style={{ color: t.table.cellIcon }} />
          <input
            type="text"
            placeholder="Nom..."
            value={filterNom}
            onChange={e => setFilterNom(e.target.value)}
            className={inputCls}
            style={activeBorder(!!filterNom)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      </div>

      {/* Statut + Tri */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Signal className={iconCls} style={{ color: t.table.cellIcon }} />
          <select
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value)}
            className={selectCls}
            style={activeBorder(statutFilter !== 'Tous')}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="Tous" style={{ background: t.selectBg }}>Tous les statuts</option>
            {statutDefs.map(s => (
              <option key={s.id} value={s.nom} style={{ background: t.selectBg }}>{s.nom}</option>
            ))}
            <option value="sans_statut" style={{ background: t.selectBg }}>Sans statut</option>
          </select>
          <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
        </div>
        <div className="relative">
          <ArrowUpDown className={iconCls} style={{ color: t.table.cellIcon }} />
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')}
            className={selectCls}
            style={activeBorder(sortOrder !== 'recent')}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="recent" style={{ background: t.selectBg }}>Plus recent</option>
            <option value="ancien" style={{ background: t.selectBg }}>Plus ancien</option>
          </select>
          <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
        </div>
      </div>
    </div>
  );
}
