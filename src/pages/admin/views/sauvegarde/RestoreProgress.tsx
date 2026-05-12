import { Loader2, Database } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { RestoreStatus } from './useRestoreCrm';

interface Props {
  status: RestoreStatus;
  currentTable: string | null;
  progress: number;
  tokens: ReturnType<typeof useThemeTokens>;
}

export function RestoreProgress({ status, currentTable, progress, tokens: t }: Props) {
  const label = status === 'simulating' ? 'Simulation en cours' : 'Restauration en cours';

  return (
    <div
      className="rounded-xl px-4 sm:px-5 py-3 sm:py-4 space-y-3 min-w-0"
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: t.accent.solid }} />
        <span className="text-xs sm:text-sm font-medium truncate" style={{ color: t.text.primary }}>{label}</span>
        <span className="ml-auto text-xs font-mono flex-shrink-0" style={{ color: t.text.tertiary }}>{progress}%</span>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: t.surface.tertiary }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: t.accent.solid }}
        />
      </div>

      {currentTable && (
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />
          <span className="text-xs font-mono" style={{ color: t.text.secondary }}>{currentTable}</span>
        </div>
      )}
    </div>
  );
}
