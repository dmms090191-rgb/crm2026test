import { Plus, FolderPlus, Download, Upload, Search, Eye } from 'lucide-react';
import type { FonctionEtat } from './fonctionsTalvexTypes';
import { ETAT_CONFIG } from './fonctionsTalvexTypes';
import { VISION_TALVEX } from './fonctionsTalvexSeed';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterEtat: FonctionEtat | null;
  onFilterChange: (v: FonctionEtat | null) => void;
  onAddFonction: () => void;
  onAddCategory: () => void;
  onExport: () => void;
  onImport: () => void;
  totalFonctions: number;
  totalCategories: number;
}

export default function SAFonctionsTalvexHeader({ search, onSearchChange, filterEtat, onFilterChange, onAddFonction, onAddCategory, onExport, onImport, totalFonctions, totalCategories }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 space-y-2 sm:space-y-3">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: t.text.primary }}>Fonctions Talvex</h1>
          <p className="text-xs mt-0.5" style={{ color: t.text.tertiary }}>
            Documentation organisee des fonctionnalites actuelles de la plateforme
            <span className="ml-2 opacity-60">{totalCategories} categories - {totalFonctions} fonctions</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onAddFonction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: '#f59e0b' }}>
            <Plus className="w-3.5 h-3.5" /> Fonction
          </button>
          <button onClick={onAddCategory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: t.surface.hover, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
            <FolderPlus className="w-3.5 h-3.5" /> Categorie
          </button>
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: t.surface.hover, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors" style={{ background: t.surface.hover, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
            <Upload className="w-3.5 h-3.5" /> Importer
            <input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) { onImport(); e.target.value = ''; } }} />
          </label>
        </div>
      </div>

      {/* Vision banner */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>Vision Talvex</span>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: t.text.secondary }}>{VISION_TALVEX}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.text.tertiary }} />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher une fonction..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: t.input.bg, color: t.input.text, border: `1px solid ${t.input.border}` }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => onFilterChange(null)}
            className="text-[10px] font-semibold rounded-full px-3 py-1 transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: filterEtat === null ? 'rgba(245,158,11,0.12)' : t.input.bg,
              color: filterEtat === null ? '#f59e0b' : t.text.tertiary,
              border: `1px solid ${filterEtat === null ? '#f59e0b' : t.surface.border}`,
            }}
          >
            Tous
          </button>
          {(Object.keys(ETAT_CONFIG) as FonctionEtat[]).map(e => (
            <button
              key={e}
              onClick={() => onFilterChange(filterEtat === e ? null : e)}
              className="text-[10px] font-semibold rounded-full px-3 py-1 transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: filterEtat === e ? ETAT_CONFIG[e].bg : t.input.bg,
                color: filterEtat === e ? ETAT_CONFIG[e].color : t.text.tertiary,
                border: `1px solid ${filterEtat === e ? ETAT_CONFIG[e].color : t.surface.border}`,
              }}
            >
              {ETAT_CONFIG[e].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
