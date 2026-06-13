import { useState } from 'react';
import { Search, Eye, EyeOff, Wrench, Crown, RotateCcw, ChevronDown, X, CheckSquare } from 'lucide-react';
import type { ThemeStatus } from '../../../../hooks/useThemeConfig';
import { STATUS_META } from './saThemesConstants';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: 'all' | ThemeStatus;
  onStatusFilterChange: (v: 'all' | ThemeStatus) => void;
  selectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onReset: () => void;
}

export default function SAThemeFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectionMode,
  selectedCount,
  onToggleSelectionMode,
  onSelectAll,
  onClearSelection,
  onReset,
}: Props) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-1 min-w-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
        <input type="text" placeholder="Rechercher un theme..." value={search} onChange={e => onSearchChange(e.target.value)} className="bg-transparent text-xs text-white/90 placeholder-white/25 outline-none flex-1 font-medium w-full" />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-white/25 hover:text-white/50 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={onToggleSelectionMode} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap" style={{
          background: selectionMode ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
          border: selectionMode ? '1px solid rgba(59,130,246,0.30)' : '1px solid rgba(255,255,255,0.08)',
          color: selectionMode ? '#60a5fa' : 'rgba(255,255,255,0.50)',
        }}>
          <CheckSquare className="w-3.5 h-3.5" />
          {selectionMode ? 'Annuler' : 'Selectionner'}
        </button>
        {!selectionMode && (
          <>
            <div className="flex items-center gap-2 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline" style={{ color: 'rgba(255,255,255,0.30)' }}>Statut</span>
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-2 text-[11px] font-medium px-3 py-2.5 rounded-xl outline-none cursor-pointer transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: statusDropdownOpen ? '1px solid rgba(59,130,246,0.30)' : '1px solid rgba(255,255,255,0.08)',
                  color: statusFilter !== 'all' ? STATUS_META[statusFilter].color : 'rgba(255,255,255,0.70)',
                }}
              >
                {statusFilter !== 'all' && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_META[statusFilter].color }} />
                )}
                <span>{statusFilter === 'all' ? 'Tous les statuts' : STATUS_META[statusFilter].label}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0 transition-transform" style={{ opacity: 0.5, transform: statusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {statusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setStatusDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl py-1.5 shadow-2xl" style={{ background: '#1a1e2e', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <StatusDropdownItem label="Tous les statuts" active={statusFilter === 'all'} onClick={() => { onStatusFilterChange('all'); setStatusDropdownOpen(false); }} />
                    <div className="mx-2 my-1 h-px bg-white/[0.06]" />
                    <StatusDropdownItem label="Visible" icon={<Eye className="w-3.5 h-3.5" />} color="#34d399" active={statusFilter === 'visible'} onClick={() => { onStatusFilterChange('visible'); setStatusDropdownOpen(false); }} />
                    <StatusDropdownItem label="Masque" icon={<EyeOff className="w-3.5 h-3.5" />} color="#f87171" active={statusFilter === 'hidden'} onClick={() => { onStatusFilterChange('hidden'); setStatusDropdownOpen(false); }} />
                    <StatusDropdownItem label="A retravailler" icon={<Wrench className="w-3.5 h-3.5" />} color="#fbbf24" active={statusFilter === 'rework'} onClick={() => { onStatusFilterChange('rework'); setStatusDropdownOpen(false); }} />
                    <StatusDropdownItem label="Premium" icon={<Crown className="w-3.5 h-3.5" />} color="#a78bfa" active={statusFilter === 'premium'} onClick={() => { onStatusFilterChange('premium'); setStatusDropdownOpen(false); }} />
                  </div>
                </>
              )}
            </div>
            <button onClick={onReset} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)' }}>
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reinitialiser</span>
            </button>
          </>
        )}
        {selectionMode && (
          <div className="flex items-center gap-2">
            <button onClick={onSelectAll} className="px-3 py-2 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)' }}>
              Tout selectionner
            </button>
            {selectedCount > 0 && (
              <button onClick={onClearSelection} className="px-3 py-2 rounded-xl text-[11px] font-bold transition-colors hover:bg-white/[0.06] text-white/40">
                Deselectionner
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDropdownItem({ label, icon, color, active, onClick }: { label: string; icon?: React.ReactNode; color?: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-medium transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? (color || '#60a5fa') : 'rgba(255,255,255,0.65)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(255,255,255,0.06)' : 'transparent'; }}
    >
      {icon && <span style={{ color: color || 'rgba(255,255,255,0.40)' }}>{icon}</span>}
      {!icon && <span className="w-3.5" />}
      <span className="flex-1 text-left">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color || '#60a5fa' }} />}
    </button>
  );
}
