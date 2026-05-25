import { Search, Users, Phone, Mail, ChevronDown, RotateCcw, User, ArrowUpDown, Signal } from 'lucide-react';
import type { Vendor, StatutDef } from './types';
import type { getThemeTokens } from '../../../../lib/themeTokens';

interface CrmFiltersDesktopProps {
  filterVendor: string; setFilterVendor: (v: string) => void;
  filterEmail: string; setFilterEmail: (v: string) => void;
  filterTel: string; setFilterTel: (v: string) => void;
  filterPrenom: string; setFilterPrenom: (v: string) => void;
  filterNom: string; setFilterNom: (v: string) => void;
  statutFilter: string; setStatutFilter: (v: string) => void;
  sortOrder: 'recent' | 'ancien'; setSortOrder: (v: 'recent' | 'ancien') => void;
  vendors: Vendor[];
  statutDefs: StatutDef[];
  activeFilterCount: number;
  onReset: () => void;
  t: ReturnType<typeof getThemeTokens>;
}

export default function CrmFiltersDesktop({
  filterVendor, setFilterVendor, filterEmail, setFilterEmail,
  filterTel, setFilterTel, filterPrenom, setFilterPrenom,
  filterNom, setFilterNom, statutFilter, setStatutFilter,
  sortOrder, setSortOrder, vendors, statutDefs,
  activeFilterCount, onReset, t,
}: CrmFiltersDesktopProps) {
  const fieldStyle: React.CSSProperties = {
    background: t.surface.secondary,
    border: `1px solid ${t.surface.border}`,
    color: t.input.text,
    caretColor: t.input.text,
  };
  const inputCls = 'w-full h-10 pl-9 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200';
  const selectCls = 'w-full h-10 pl-9 pr-8 rounded-xl text-[13px] focus:outline-none appearance-none cursor-pointer transition-all duration-200';
  const iconCls = 'w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none';
  const chevronCls = 'w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none';

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
    <div
      className="hidden md:block rounded-2xl overflow-hidden"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <Search className="w-3.5 h-3.5" style={{ color: t.accent.text }} />
          </div>
          <div>
            <span className="text-xs font-bold" style={{ color: t.text.primary }}>Filtres de recherche</span>
            <p className="text-[10px]" style={{ color: t.text.quaternary }}>Affinez la liste des leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.accent.text }} />
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
              onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; e.currentTarget.style.color = t.text.primary; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.surface.secondary; e.currentTarget.style.color = t.text.tertiary; }}
            >
              <RotateCcw className="w-3 h-3" />Reinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="relative group">
            <Users className={iconCls} style={{ color: t.table.cellIcon }} />
            <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className={selectCls} style={activeFieldBorder(filterVendor !== 'tous')} onFocus={handleFocus} onBlur={handleBlur}>
              <option value="tous" style={{ background: t.selectBg }}>Tous les vendeurs</option>
              <option value="admin" style={{ background: t.selectBg }}>Admin (sans vendeur)</option>
              {vendors.map(v => (<option key={v.id} value={v.id} style={{ background: t.selectBg }}>{v.first_name} {v.last_name}</option>))}
            </select>
            <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
          </div>
          <div className="relative">
            <Mail className={iconCls} style={{ color: t.table.cellIcon }} />
            <input type="text" placeholder="Email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className={inputCls} style={activeFieldBorder(!!filterEmail)} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
          <div className="relative">
            <Phone className={iconCls} style={{ color: t.table.cellIcon }} />
            <input type="text" placeholder="Telephone..." value={filterTel} onChange={e => setFilterTel(e.target.value)} className={inputCls} style={activeFieldBorder(!!filterTel)} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
          <div className="relative">
            <User className={iconCls} style={{ color: t.table.cellIcon }} />
            <input type="text" placeholder="Prenom..." value={filterPrenom} onChange={e => setFilterPrenom(e.target.value)} className={inputCls} style={activeFieldBorder(!!filterPrenom)} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <User className={iconCls} style={{ color: t.table.cellIcon }} />
            <input type="text" placeholder="Nom..." value={filterNom} onChange={e => setFilterNom(e.target.value)} className={inputCls} style={activeFieldBorder(!!filterNom)} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
          <div className="relative">
            <Signal className={iconCls} style={{ color: t.table.cellIcon }} />
            <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={selectCls} style={activeFieldBorder(statutFilter !== 'Tous')} onFocus={handleFocus} onBlur={handleBlur}>
              <option value="Tous" style={{ background: t.selectBg }}>Tous les statuts</option>
              {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: t.selectBg }}>{s.nom}</option>))}
              <option value="sans_statut" style={{ background: t.selectBg }}>Sans statut</option>
            </select>
            <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
          </div>
          <div className="relative">
            <ArrowUpDown className={iconCls} style={{ color: t.table.cellIcon }} />
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')} className={selectCls} style={activeFieldBorder(sortOrder !== 'recent')} onFocus={handleFocus} onBlur={handleBlur}>
              <option value="recent" style={{ background: t.selectBg }}>Plus recent</option>
              <option value="ancien" style={{ background: t.selectBg }}>Plus ancien</option>
            </select>
            <ChevronDown className={chevronCls} style={{ color: t.table.cellIcon }} />
          </div>
        </div>
      </div>
    </div>
  );
}
