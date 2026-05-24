import { useRef } from 'react';
import { ExternalLink, MapPin, Check, ChevronDown, Pencil, Trash2, Phone, Eye, CheckCircle2, Undo2, Redo2, LayoutTemplate } from 'lucide-react';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import { getStatutColor, checkboxStyle } from './types';

interface Props {
  prospects: Prospect[];
  loading: boolean;
  allEmpty: boolean;
  selectedProspects: Set<string>;
  onToggleSel: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (p: Prospect) => void;
  onDelete: (ids: string[]) => void;
  onDetail: (p: Prospect) => void;
  onSite: (p: Prospect) => void;
  onStatutClick: (id: string, rect: { top: number; left: number }) => void;
  onClearFilter: () => void;
  saStatuts: SAStatut[];
  t: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  selectMode: boolean;
  workModeEnabled: boolean;
  workActiveId: string | null;
  onWorkSelect: (id: string) => void;
  onWorkUndo: () => void;
  onWorkRedo: () => void;
  canWorkUndo: boolean;
  canWorkRedo: boolean;
  workHistoryPosition: number;
  workHistoryLength: number;
  rowRefCallback: (id: string, el: HTMLTableRowElement | null) => void;
}

export default function SAProspectsTable({
  prospects, loading, allEmpty, selectedProspects, onToggleSel, onToggleAll,
  onEdit, onDelete, onDetail, onSite, onStatutClick, onClearFilter, saStatuts, t,
  selectMode, workModeEnabled, workActiveId, onWorkSelect,
  onWorkUndo, onWorkRedo, canWorkUndo, canWorkRedo, workHistoryPosition, workHistoryLength,
  rowRefCallback,
}: Props) {
  const statutBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleStatutBtnClick = (id: string) => {
    const rect = statutBtnRefs.current[id]?.getBoundingClientRect();
    if (rect) onStatutClick(id, { top: rect.bottom + 4, left: rect.left });
  };

  const showLeftCol = selectMode || workModeEnabled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        {allEmpty ? (
          <p className="text-xs" style={{ color: t.text.tertiary }}>Aucune societe prospect. Cliquez sur "Ajouter" pour commencer.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: t.text.secondary }}>Aucun resultat pour ce statut.</p>
            <button onClick={onClearFilter} className="text-xs underline transition-colors" style={{ color: '#0ea5e9' }}>
              Voir toutes les societes
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <table className="w-full text-left" style={{ minWidth: 900 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          {showLeftCol && <th className="px-2 py-2.5 w-11" />}
          {['Nom', 'Secteur', 'Site', 'Maps', 'Telephone', 'Statut', 'Actions'].map(h => (
            <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {prospects.map(p => {
          const cfg = getStatutColor(p.statut, saStatuts);
          const isWorkActive = workModeEnabled && workActiveId === p.id;

          return (
            <tr
              key={p.id}
              ref={el => rowRefCallback(p.id, el)}
              className="transition-colors"
              style={{
                borderBottom: `1px solid ${t.surface.borderLight}`,
                background: isWorkActive ? 'rgba(249,115,22,0.04)' : selectedProspects.has(p.id) ? 'rgba(14,165,233,0.04)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isWorkActive && !selectedProspects.has(p.id)) e.currentTarget.style.background = t.surface.hover; }}
              onMouseLeave={e => { e.currentTarget.style.background = isWorkActive ? 'rgba(249,115,22,0.04)' : selectedProspects.has(p.id) ? 'rgba(14,165,233,0.04)' : 'transparent'; }}
            >
              {showLeftCol && (
                <td className="px-2 py-2.5 w-11">
                  {workModeEnabled ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onWorkSelect(p.id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                        style={isWorkActive
                          ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                          : { background: t.surface.primary, border: `1px solid ${t.surface.border}` }
                        }
                      >
                        {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
                      </button>
                      {isWorkActive && workHistoryLength > 0 && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={onWorkUndo}
                            disabled={!canWorkUndo}
                            className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                            style={{ color: '#f97316' }}
                          >
                            <Undo2 className="w-3 h-3" />
                          </button>
                          <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>
                            {workHistoryPosition}/{workHistoryLength}
                          </span>
                          <button
                            onClick={onWorkRedo}
                            disabled={!canWorkRedo}
                            className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                            style={{ color: '#f97316' }}
                          >
                            <Redo2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={checkboxStyle(selectedProspects.has(p.id), t.surface.border)} onClick={() => onToggleSel(p.id)}>
                      {selectedProspects.has(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  )}
                </td>
              )}
              <td className="px-3 py-2.5">
                <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{p.nom}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-xs" style={{ color: t.text.secondary }}>{p.secteur_activite || '-'}</span>
              </td>
              <td className="px-3 py-2.5">
                {p.site_internet ? (
                  <a href={p.site_internet} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#0ea5e9' }}>
                    <ExternalLink className="w-3 h-3" />
                    Ouvrir
                  </a>
                ) : <span className="text-xs" style={{ color: t.text.tertiary }}>-</span>}
              </td>
              <td className="px-3 py-2.5">
                {p.lien_google_maps ? (
                  <a href={p.lien_google_maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#f59e0b' }}>
                    <MapPin className="w-3 h-3" />
                    Maps
                  </a>
                ) : <span className="text-xs" style={{ color: t.text.tertiary }}>-</span>}
              </td>
              <td className="px-3 py-2.5">
                {p.telephone ? (
                  <a href={`tel:${p.telephone}`} className="inline-flex items-center gap-1 text-xs" style={{ color: t.text.secondary }}>
                    <Phone className="w-3 h-3" />
                    {p.telephone}
                  </a>
                ) : <span className="text-xs" style={{ color: t.text.tertiary }}>-</span>}
              </td>
              <td className="px-3 py-2.5">
                <button
                  ref={el => { statutBtnRefs.current[p.id] = el; }}
                  type="button"
                  onClick={() => handleStatutBtnClick(p.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
                  {p.statut}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <button onClick={() => onDetail(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#0ea5e9' }} title="Detail">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onSite(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#0ea5e9' }} title="Site">
                    <LayoutTemplate className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: t.text.tertiary }} title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete([p.id])} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#ef4444' }} title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
