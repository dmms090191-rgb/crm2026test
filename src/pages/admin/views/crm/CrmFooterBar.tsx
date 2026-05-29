import { Users } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  filteredCount: number;
  selectedCount: number;
  hasActiveFilters: boolean;
  tokens: ThemeTokens;
}

export default function CrmFooterBar({ filteredCount, selectedCount, hasActiveFilters, tokens }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5" style={{ borderTop: `1px solid ${tokens.surface.border}`, background: tokens.table.headerBg }}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
          <Users className="w-3 h-3" />{filteredCount}
        </span>
        <span className="text-xs" style={{ color: tokens.table.footerText }}>lead{filteredCount !== 1 ? 's' : ''} affiche{filteredCount !== 1 ? 's' : ''}</span>
      </div>
      {selectedCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>{selectedCount} selectionne{selectedCount > 1 ? 's' : ''}</span>
      )}
      {filteredCount === 0 && hasActiveFilters && (
        <p className="text-xs" style={{ color: tokens.table.footerText }}>Aucun resultat pour ces filtres</p>
      )}
    </div>
  );
}
