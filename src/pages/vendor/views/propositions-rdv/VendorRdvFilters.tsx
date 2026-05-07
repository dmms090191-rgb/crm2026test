import { FILTERS, filterToStatus, statusConfig } from '../rdvPropositionsConstants';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface VendorRdvFiltersProps {
  filter: string;
  setFilter: (f: string) => void;
  tokens: ThemeTokens;
}

export default function VendorRdvFilters({ filter, setFilter, tokens }: VendorRdvFiltersProps) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3.5 overflow-x-auto no-scrollbar" style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
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
  );
}
