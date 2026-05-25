import { useRef } from 'react';
import { ExternalLink, MapPin, Check, ChevronDown, Pencil, Trash2, Phone, Eye, CheckCircle2, Undo2, Redo2, LayoutTemplate, Building2, Globe, MapPinned, Signal, Zap, User } from 'lucide-react';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import { getStatutColor, checkboxStyle } from './types';
import type { ColumnDef } from '../../../../components/table/useColumnOrder';

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
  columnOrder: string[];
  customColumnDefs?: ColumnDef[];
  getCustomValues?: (prospectId: string) => Record<string, string>;
  labelOverrides?: Record<string, string>;
}

const HEADER_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  prenom: User, nom: User, societe: Building2, secteur: Zap, site: Globe,
  maps: MapPinned, telephone: Phone, statut: Signal, actions: Zap,
};

const HEADER_LABELS: Record<string, string> = {
  prenom: 'Prenom', nom: 'Nom', societe: 'Societe', secteur: 'Secteur',
  site: 'Site', maps: 'Maps', telephone: 'Telephone', statut: 'Statut', actions: 'Actions',
};

export default function SAProspectsTable({
  prospects, loading, allEmpty, selectedProspects, onToggleSel, onToggleAll,
  onEdit, onDelete, onDetail, onSite, onStatutClick, onClearFilter, saStatuts, t,
  selectMode, workModeEnabled, workActiveId, onWorkSelect,
  onWorkUndo, onWorkRedo, canWorkUndo, canWorkRedo, workHistoryPosition, workHistoryLength,
  rowRefCallback, columnOrder, customColumnDefs, getCustomValues, labelOverrides,
}: Props) {
  const statutBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleStatutBtnClick = (id: string) => {
    const rect = statutBtnRefs.current[id]?.getBoundingClientRect();
    if (rect) onStatutClick(id, { top: rect.bottom + 4, left: rect.left });
  };

  const showLeftCol = selectMode || workModeEnabled;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (prospects.length === 0) return (
    <div className="text-center py-16 px-4">
      {allEmpty ? (
        <p className="text-xs" style={{ color: t.text.tertiary }}>Aucune societe prospect. Cliquez sur "Ajouter" pour commencer.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: t.text.secondary }}>Aucun resultat pour ce statut.</p>
          <button onClick={onClearFilter} className="text-xs underline transition-colors" style={{ color: t.text.link }}>Voir toutes les societes</button>
        </div>
      )}
    </div>
  );

  function renderCell(key: string, p: Prospect, cfg: ReturnType<typeof getStatutColor>) {
    switch (key) {
      case 'prenom': return <span className="text-[13px] font-medium" style={{ color: t.text.primary }}>{p.manager_first_name || '\u2014'}</span>;
      case 'nom': return <span className="text-[13px] font-medium" style={{ color: t.text.primary }}>{p.manager_last_name || '\u2014'}</span>;
      case 'societe': return <span className="text-[13px] font-semibold" style={{ color: t.text.primary }}>{p.nom}</span>;
      case 'secteur': return <span className="text-xs" style={{ color: t.text.secondary }}>{p.secteur_activite || '\u2014'}</span>;
      case 'site': return p.site_internet ? (
        <a href={p.site_internet} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200"
          style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}
          onMouseEnter={e => { e.currentTarget.style.background = t.accent.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; }}
        >
          <ExternalLink className="w-3 h-3" />Ouvrir
        </a>
      ) : <span className="text-xs" style={{ color: t.text.quaternary }}>{'\u2014'}</span>;
      case 'maps': return p.lien_google_maps ? (
        <a href={p.lien_google_maps} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <MapPin className="w-3 h-3" />Maps
        </a>
      ) : <span className="text-xs" style={{ color: t.text.quaternary }}>{'\u2014'}</span>;
      case 'telephone': return p.telephone ? (
        <a href={`tel:${p.telephone}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: t.surface.secondary, color: t.text.secondary }}>
          <Phone className="w-3 h-3 flex-shrink-0" style={{ color: t.table.cellIcon }} />{p.telephone}
        </a>
      ) : <span className="text-xs" style={{ color: t.text.quaternary }}>{'\u2014'}</span>;
      case 'statut': return (
        <button
          ref={el => { statutBtnRefs.current[p.id] = el; }}
          type="button"
          onClick={() => handleStatutBtnClick(p.id)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-bold transition-all duration-200 hover:shadow-md"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
          {p.statut}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      );
      case 'actions': return (
        <div className="flex items-center gap-1.5">
          {[
            { icon: Eye, title: 'Detail', onClick: () => onDetail(p), color: t.accent.text, bg: t.accent.bg },
            { icon: LayoutTemplate, title: 'Site', onClick: () => onSite(p), color: t.accent.text, bg: t.accent.bg },
            { icon: Pencil, title: 'Modifier', onClick: () => onEdit(p), color: t.text.tertiary, bg: t.surface.tertiary },
            { icon: Trash2, title: 'Supprimer', onClick: () => onDelete([p.id]), color: t.danger.text, bg: t.danger.bg },
          ].map(btn => (
            <button
              key={btn.title}
              onClick={btn.onClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ color: btn.color }}
              title={btn.title}
              onMouseEnter={e => { e.currentTarget.style.background = btn.bg; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      );
      default: {
        const customDef = customColumnDefs?.find(c => c.key === key);
        const vals = getCustomValues?.(p.id);
        const val = vals?.[key] ?? '';
        if (customDef?.fieldType === 'url' && val) {
          const href = val.match(/^https?:\/\//) ? val : `https://${val}`;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200"
              style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.accent.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; }}
            >
              <ExternalLink className="w-3 h-3" />Lien
            </a>
          );
        }
        return <span className="text-xs" style={{ color: val ? t.text.secondary : t.text.tertiary }}>{val || '\u2014'}</span>;
      }
    }
  }

  return (
    <table className="w-full text-left" style={{ minWidth: 1100, borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead>
        <tr style={{ background: t.table.headerBg }}>
          {showLeftCol && <th className="px-3 py-4 w-12" />}
          {columnOrder.map(key => {
            const Icon = HEADER_ICONS[key];
            const label = labelOverrides?.[key] || (HEADER_LABELS[key] ?? key);
            return (
              <th key={key} className="px-5 py-4 text-left" style={{ borderBottom: `2px solid ${t.accent.solid}` }}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: t.accent.text, opacity: 0.6 }} />}
                  <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: t.table.headerText }}>{label}</span>
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {prospects.map((p, idx) => {
          const cfg = getStatutColor(p.statut, saStatuts);
          const isWorkActive = workModeEnabled && workActiveId === p.id;
          const isSel = selectedProspects.has(p.id);
          const isEven = idx % 2 === 0;

          return (
            <tr
              key={p.id}
              ref={el => rowRefCallback(p.id, el)}
              className="transition-all duration-200"
              style={{
                background: isWorkActive ? t.table.rowSelected : isSel ? t.table.rowSelected : isEven ? 'transparent' : t.surface.secondary,
                borderLeft: isWorkActive ? `4px solid ${t.accent.solid}` : '4px solid transparent',
                boxShadow: isWorkActive ? `inset 0 0 20px ${t.accent.bg}` : 'none',
              }}
              onMouseEnter={e => {
                if (!isWorkActive && !isSel) {
                  e.currentTarget.style.background = t.table.rowHover;
                  e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${t.surface.border}`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isWorkActive ? t.table.rowSelected : isSel ? t.table.rowSelected : isEven ? 'transparent' : t.surface.secondary;
                e.currentTarget.style.boxShadow = isWorkActive ? `inset 0 0 20px ${t.accent.bg}` : 'none';
              }}
            >
              {showLeftCol && (
                <td className="px-3 py-5 w-12">
                  {workModeEnabled ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onWorkSelect(p.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                        style={isWorkActive
                          ? { background: t.accent.bg, border: `1.5px solid ${t.accent.border}`, boxShadow: `0 0 8px ${t.accent.bg}` }
                          : { background: t.surface.primary, border: `1.5px solid ${t.surface.border}` }
                        }
                      >
                        {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: t.accent.text }} />}
                      </button>
                      {isWorkActive && workHistoryLength > 0 && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button onClick={onWorkUndo} disabled={!canWorkUndo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: t.accent.text }}><Undo2 className="w-3 h-3" /></button>
                          <span className="text-[9px] font-bold tabular-nums" style={{ color: t.accent.text }}>{workHistoryPosition}/{workHistoryLength}</span>
                          <button onClick={onWorkRedo} disabled={!canWorkRedo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: t.accent.text }}><Redo2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={checkboxStyle(isSel, t.surface.border)} onClick={() => onToggleSel(p.id)}>
                      {isSel && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  )}
                </td>
              )}
              {columnOrder.map(key => (
                <td key={key} className="px-5 py-5">
                  {renderCell(key, p, cfg)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
