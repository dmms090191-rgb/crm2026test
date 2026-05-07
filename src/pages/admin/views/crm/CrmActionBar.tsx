import { Users, Trash2, ArrowRightLeft } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface CrmActionBarProps {
  totalLeads: number;
  selectedCount: number;
  deleting: boolean;
  tokens: ThemeTokens;
  onTransfer: () => void;
  onDelete: () => void;
}

export default function CrmActionBar({ totalLeads, selectedCount, deleting, tokens, onTransfer, onDelete }: CrmActionBarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>CRM</h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Gestion de la relation client</p>
      </div>
      {selectedCount > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
          <button
            onClick={onTransfer}
            className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
            style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Transferer {selectedCount}</span>
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
            style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}`, opacity: deleting ? 0.6 : 1 }}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Supprimer {selectedCount}</span>
          </button>
          <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold self-start md:self-auto" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
          <Users className="w-3.5 h-3.5" />
          {totalLeads} lead{totalLeads !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
