import { AlertTriangle, X } from 'lucide-react';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export function SimulationBanner() {
  const { isSimulating, stopSimulation } = useSimulation();
  const t = useThemeTokens();

  if (!isSimulating) return null;

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 gap-3"
      style={{ background: t.warning.bg, borderBottom: `1px solid ${t.warning.border}` }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: t.warning.text }} />
        <span className="text-xs font-semibold truncate" style={{ color: t.warning.text }}>
          MODE SIMULATION — aucune donnee reelle modifiee
        </span>
      </div>
      <button
        onClick={stopSimulation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
        style={{ background: t.warning.text, color: t.warning.bg }}
      >
        <X className="w-3 h-3" />
        Stopper la simulation
      </button>
    </div>
  );
}
