import { Trash2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface AdminRdvBulkBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  tokens: ThemeTokens;
}

export default function AdminRdvBulkBar({ count, onClear, onDelete, tokens }: AdminRdvBulkBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl animate-in fade-in"
      style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}
    >
      <span className="text-xs font-semibold" style={{ color: '#f87171' }}>
        {count} proposition{count > 1 ? 's' : ''} selectionnee{count > 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
          style={{ color: tokens.text.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
        >
          Annuler
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
