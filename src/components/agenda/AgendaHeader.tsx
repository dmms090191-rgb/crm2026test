import { Plus } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface AgendaHeaderProps {
  title: string;
  totalCount: number;
  canAdd: boolean;
  accentColor: string;
  accentRgb: string;
  onAdd: () => void;
  tokens: ThemeTokens;
}

export default function AgendaHeader({ title, totalCount, canAdd, accentColor, accentRgb, onAdd, tokens }: AgendaHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>{totalCount} rendez-vous au total</p>
      </div>
      <div className="flex items-center gap-2">
        {canAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: `rgba(${accentRgb},0.08)`, border: `1px solid rgba(${accentRgb},0.18)`, color: accentColor }}>
            <Plus className="w-3.5 h-3.5" />Nouveau RDV
          </button>
        )}
      </div>
    </div>
  );
}
