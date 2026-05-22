import { ExternalLink, MapPin, Phone, Eye, Pencil, Trash2, ChevronDown, Check, CheckCircle2, Undo2, Redo2, RotateCcw } from 'lucide-react';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import { getStatutColor, checkboxStyle } from './types';

interface Props {
  prospect: Prospect;
  selected: boolean;
  onToggleSel: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatutClick: (id: string, rect: { top: number; left: number }) => void;
  saStatuts: SAStatut[];
  t: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  selectMode: boolean;
  workModeEnabled: boolean;
  isWorkActive: boolean;
  onWorkSelect: (id: string) => void;
  onWorkUndo: () => void;
  onWorkRedo: () => void;
  onWorkReset: () => void;
  canWorkUndo: boolean;
  canWorkRedo: boolean;
  workHistoryPosition: number;
  workHistoryLength: number;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export default function SAProspectMobileCard({
  prospect: p, selected, onToggleSel, onDetail, onEdit, onDelete, onStatutClick, saStatuts, t,
  selectMode, workModeEnabled, isWorkActive, onWorkSelect,
  onWorkUndo, onWorkRedo, onWorkReset, canWorkUndo, canWorkRedo,
  workHistoryPosition, workHistoryLength, cardRef,
}: Props) {
  const cfg = getStatutColor(p.statut, saStatuts);
  const initials = p.nom
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();

  const handleStatutClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onStatutClick(p.id, { top: rect.bottom + 4, left: rect.left });
  };

  return (
    <div
      ref={cardRef}
      className="p-3.5 space-y-2.5"
      style={{
        borderBottom: `1px solid ${t.surface.borderLight}`,
        background: isWorkActive ? 'rgba(249,115,22,0.04)' : selected ? 'rgba(14,165,233,0.04)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-2.5">
        {workModeEnabled ? (
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
        ) : selectMode ? (
          <div className="pt-0.5" onClick={onToggleSel}>
            <div style={checkboxStyle(selected, t.surface.border)}>
              {selected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>
        ) : null}

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff' }}
        >
          {initials || '?'}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onDetail}>
          <p className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>
            {p.nom}
          </p>
          {p.secteur_activite && (
            <p className="text-[11px] truncate" style={{ color: t.text.tertiary }}>
              {p.secteur_activite}
            </p>
          )}
          {isWorkActive && workHistoryLength > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <button onClick={onWorkUndo} disabled={!canWorkUndo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}>
                <Undo2 className="w-3 h-3" />
              </button>
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>
                {workHistoryPosition}/{workHistoryLength}
              </span>
              <button onClick={onWorkRedo} disabled={!canWorkRedo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}>
                <Redo2 className="w-3 h-3" />
              </button>
              <button onClick={onWorkReset} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: '#f97316' }} title="Reinitialiser">
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 pl-[30px]">
        <button
          type="button"
          onClick={handleStatutClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
          />
          {p.statut}
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[30px] text-[11px]" style={{ color: t.text.secondary }}>
        {p.telephone && (
          <a href={`tel:${p.telephone}`} className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3 flex-shrink-0" style={{ color: t.text.tertiary }} />
            {p.telephone}
          </a>
        )}
        {p.site_internet && (
          <a
            href={p.site_internet}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: '#0ea5e9' }}
          >
            <ExternalLink className="w-3 h-3" />
            Site
          </a>
        )}
        {p.lien_google_maps && (
          <a
            href={p.lien_google_maps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: '#f59e0b' }}
          >
            <MapPin className="w-3 h-3" />
            Maps
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 pl-[30px]">
        <button
          onClick={onDetail}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}
        >
          <Eye className="w-3 h-3" />
          Detail
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: `${t.surface.hover}`, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          <Pencil className="w-3 h-3" />
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          <Trash2 className="w-3 h-3" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
