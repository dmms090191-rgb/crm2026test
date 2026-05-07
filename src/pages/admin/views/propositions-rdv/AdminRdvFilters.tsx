import { Filter } from 'lucide-react';
import { FILTERS, filterToStatus, statusConfig } from '../../../vendor/views/rdvPropositionsConstants';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface VendorOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface AdminRdvFiltersProps {
  filter: string;
  setFilter: (f: string) => void;
  vendorFilter: string;
  setVendorFilter: (v: string) => void;
  vendors: VendorOption[];
  tokens: ThemeTokens;
}

export default function AdminRdvFilters({ filter, setFilter, vendorFilter, setVendorFilter, vendors, tokens }: AdminRdvFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-5 py-2.5 md:py-3.5 gap-2 md:gap-3" style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
      <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => {
          const active = filter === f;
          const statusKey = filterToStatus[f];
          const cfg = statusKey ? statusConfig[statusKey] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2 md:px-3 py-1 rounded-lg text-[11px] md:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={active
                ? { background: cfg ? cfg.bg : tokens.surface.selected, color: cfg ? cfg.color : tokens.text.primary, border: `1px solid ${cfg ? cfg.border : tokens.surface.border}` }
                : { background: 'transparent', color: tokens.text.quaternary, border: `1px solid ${tokens.surface.borderLight}` }
              }
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
        <select
          value={vendorFilter}
          onChange={e => setVendorFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg text-[11px] md:text-xs font-medium outline-none cursor-pointer transition-all"
          style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, appearance: 'none' }}
        >
          <option value="all" style={{ background: tokens.selectBg }}>Tous les vendeurs</option>
          <option value="none" style={{ background: tokens.selectBg }}>Sans vendeur</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id} style={{ background: tokens.selectBg }}>{v.first_name} {v.last_name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
