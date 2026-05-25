import { Search, Phone, Mail, ChevronDown, SlidersHorizontal, User, ArrowUpDown, Signal, RotateCcw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface StatutDef { id: string; nom: string; }

interface VendorLeadsFiltersProps {
  filterEmail: string; setFilterEmail: (v: string) => void;
  filterTel: string; setFilterTel: (v: string) => void;
  filterPrenom: string; setFilterPrenom: (v: string) => void;
  filterNom: string; setFilterNom: (v: string) => void;
  statutFilter: string; setStatutFilter: (v: string) => void;
  sortOrder: string; setSortOrder: (v: 'recent' | 'ancien') => void;
  statutDefs: StatutDef[];
  mobileFiltersOpen: boolean; setMobileFiltersOpen: (v: boolean) => void;
  tokens: ThemeTokens;
}

export default function VendorLeadsFilters({
  filterEmail, setFilterEmail, filterTel, setFilterTel,
  filterPrenom, setFilterPrenom, filterNom, setFilterNom,
  statutFilter, setStatutFilter, sortOrder, setSortOrder,
  statutDefs, mobileFiltersOpen, setMobileFiltersOpen, tokens,
}: VendorLeadsFiltersProps) {
  const vfc = [filterEmail ? 1 : 0, filterTel ? 1 : 0, filterPrenom ? 1 : 0, filterNom ? 1 : 0, statutFilter !== 'Tous' ? 1 : 0, sortOrder !== 'recent' ? 1 : 0].reduce((a, b) => a + b, 0);
  const fStyle: React.CSSProperties = { background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.input.text, caretColor: tokens.input.text };
  const activeBorder = (on: boolean): React.CSSProperties => on ? { ...fStyle, borderColor: tokens.accent.border, background: tokens.accent.bg } : fStyle;
  const fFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = tokens.accent.solid; e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.accent.bg}`; };
  const fBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = tokens.surface.border; e.currentTarget.style.boxShadow = 'none'; };
  const iCls = 'w-full h-10 pl-9 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200';
  const sCls = 'w-full h-10 pl-9 pr-8 rounded-xl text-[13px] focus:outline-none appearance-none cursor-pointer transition-all duration-200';
  const icCls = 'w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none';
  const chCls = 'w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none';
  const handleReset = () => { setFilterEmail(''); setFilterTel(''); setFilterPrenom(''); setFilterNom(''); setStatutFilter('Tous'); setSortOrder('recent'); };

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}>
              <Search className="w-3.5 h-3.5" style={{ color: tokens.accent.text }} />
            </div>
            <div>
              <span className="text-xs font-bold" style={{ color: tokens.text.primary }}>Filtres de recherche</span>
              <p className="text-[10px]" style={{ color: tokens.text.quaternary }}>Affinez la liste des leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vfc > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.accent.text }} />{vfc} filtre{vfc > 1 ? 's' : ''} actif{vfc > 1 ? 's' : ''}
              </span>
            )}
            {vfc > 0 && (
              <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }} onMouseEnter={e => { e.currentTarget.style.background = tokens.surface.hover; e.currentTarget.style.color = tokens.text.primary; }} onMouseLeave={e => { e.currentTarget.style.background = tokens.surface.secondary; e.currentTarget.style.color = tokens.text.tertiary; }}>
                <RotateCcw className="w-3 h-3" />Reinitialiser
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="relative"><Mail className={icCls} style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className={iCls} style={activeBorder(!!filterEmail)} onFocus={fFocus} onBlur={fBlur} /></div>
            <div className="relative"><Phone className={icCls} style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Telephone..." value={filterTel} onChange={e => setFilterTel(e.target.value)} className={iCls} style={activeBorder(!!filterTel)} onFocus={fFocus} onBlur={fBlur} /></div>
            <div className="relative"><User className={icCls} style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Prenom..." value={filterPrenom} onChange={e => setFilterPrenom(e.target.value)} className={iCls} style={activeBorder(!!filterPrenom)} onFocus={fFocus} onBlur={fBlur} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative"><User className={icCls} style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Nom..." value={filterNom} onChange={e => setFilterNom(e.target.value)} className={iCls} style={activeBorder(!!filterNom)} onFocus={fFocus} onBlur={fBlur} /></div>
            <div className="relative"><Signal className={icCls} style={{ color: tokens.table.cellIcon }} /><select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={sCls} style={activeBorder(statutFilter !== 'Tous')} onFocus={fFocus} onBlur={fBlur}><option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>{statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}<option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option></select><ChevronDown className={chCls} style={{ color: tokens.table.cellIcon }} /></div>
            <div className="relative"><ArrowUpDown className={icCls} style={{ color: tokens.table.cellIcon }} /><select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')} className={sCls} style={activeBorder(sortOrder !== 'recent')} onFocus={fFocus} onBlur={fBlur}><option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option><option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option></select><ChevronDown className={chCls} style={{ color: tokens.table.cellIcon }} /></div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-3.5 py-3 space-y-2.5">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Rechercher par email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200" style={activeBorder(!!filterEmail)} onFocus={fFocus} onBlur={fBlur} /></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="flex-1 flex items-center justify-between h-11 px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-200" style={{ background: vfc > 0 ? tokens.accent.bg : tokens.surface.secondary, border: `1px solid ${vfc > 0 ? tokens.accent.border : tokens.surface.border}`, color: vfc > 0 ? tokens.accent.text : tokens.text.secondary }}>
              <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" />{vfc > 0 ? `${vfc} filtre${vfc > 1 ? 's' : ''}` : 'Filtres'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
            </button>
            {vfc > 0 && <button onClick={handleReset} className="h-11 w-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}><RotateCcw className="w-4 h-4" /></button>}
          </div>
          {mobileFiltersOpen && (
            <div className="space-y-2.5 pt-1 pb-0.5">
              <div className="relative"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Telephone..." value={filterTel} onChange={e => setFilterTel(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200" style={activeBorder(!!filterTel)} onFocus={fFocus} onBlur={fBlur} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative"><User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Prenom..." value={filterPrenom} onChange={e => setFilterPrenom(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200" style={activeBorder(!!filterPrenom)} onFocus={fFocus} onBlur={fBlur} /></div>
                <div className="relative"><User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><input type="text" placeholder="Nom..." value={filterNom} onChange={e => setFilterNom(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl text-[13px] focus:outline-none transition-all duration-200" style={activeBorder(!!filterNom)} onFocus={fFocus} onBlur={fBlur} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative"><Signal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="w-full h-11 pl-10 pr-8 rounded-xl text-[13px] focus:outline-none appearance-none cursor-pointer transition-all duration-200" style={activeBorder(statutFilter !== 'Tous')} onFocus={fFocus} onBlur={fBlur}><option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>{statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}<option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option></select><ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /></div>
                <div className="relative"><ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /><select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')} className="w-full h-11 pl-10 pr-8 rounded-xl text-[13px] focus:outline-none appearance-none cursor-pointer transition-all duration-200" style={activeBorder(sortOrder !== 'recent')} onFocus={fFocus} onBlur={fBlur}><option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option><option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option></select><ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.table.cellIcon }} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
