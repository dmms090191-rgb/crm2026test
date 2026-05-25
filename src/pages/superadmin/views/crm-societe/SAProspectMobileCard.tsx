import { ExternalLink, MapPin, Phone, Eye, Pencil, Trash2, ChevronDown, Check, CheckCircle2, Undo2, Redo2, RotateCcw, LayoutTemplate } from 'lucide-react';
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
  onSite: () => void;
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
  prospect: p, selected, onToggleSel, onDetail, onEdit, onDelete, onSite, onStatutClick, saStatuts, t,
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
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onStatutClick(p.id, { top: rect.bottom + 4, left: rect.left });
  };

  return (
    <div
      ref={cardRef}
      className="mx-2.5 my-2 rounded-xl overflow-hidden transition-all"
      style={{
        background: isWorkActive
          ? 'rgba(249,115,22,0.05)'
          : selected
            ? 'rgba(14,165,233,0.05)'
            : t.surface.primary,
        border: `1px solid ${isWorkActive ? 'rgba(249,115,22,0.2)' : selected ? 'rgba(14,165,233,0.2)' : t.surface.borderLight}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Top: Avatar + Name + Statut ── */}
      <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-2">
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {workModeEnabled ? (
            <button
              onClick={e => { e.stopPropagation(); onWorkSelect(p.id); }}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
              style={isWorkActive
                ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                : { background: t.surface.primary, border: `1px solid ${t.surface.border}` }
              }
            >
              {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
            </button>
          ) : selectMode ? (
            <div onClick={e => { e.stopPropagation(); onToggleSel(); }}>
              <div style={checkboxStyle(selected, t.surface.border)}>
                {selected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
            </div>
          ) : null}

          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff' }}
          >
            {initials || '?'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate leading-tight" style={{ color: t.text.primary }}>
            {p.nom}
          </p>
          {(p.manager_first_name || p.manager_last_name) && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: t.text.secondary }}>
              {[p.manager_first_name, p.manager_last_name].filter(Boolean).join(' ')}
            </p>
          )}
          {p.secteur_activite && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: t.text.tertiary }}>
              {p.secteur_activite}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleStatutClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
          />
          {p.statut}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* ── Middle: Work history + Info links ── */}
      <div className="px-3.5 pb-2.5 space-y-2">
        {isWorkActive && workHistoryLength > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)' }}
          >
            <button
              onClick={e => { e.stopPropagation(); onWorkUndo(); }}
              disabled={!canWorkUndo}
              className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 transition-colors active:scale-90"
              style={{ color: '#f97316', background: 'rgba(249,115,22,0.08)' }}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold tabular-nums px-1" style={{ color: '#f97316' }}>
              {workHistoryPosition}/{workHistoryLength}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onWorkRedo(); }}
              disabled={!canWorkRedo}
              className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 transition-colors active:scale-90"
              style={{ color: '#f97316', background: 'rgba(249,115,22,0.08)' }}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onWorkReset(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center ml-auto transition-colors active:scale-90"
              style={{ color: '#f97316', background: 'rgba(249,115,22,0.08)' }}
              title="Reinitialiser"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {(p.telephone || p.site_internet || p.lien_google_maps) && (
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: t.text.secondary }}>
            {p.telephone && (
              <a href={`tel:${p.telephone}`} className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Phone className="w-3 h-3 flex-shrink-0" style={{ color: t.text.tertiary }} />
                {p.telephone}
              </a>
            )}
            {p.site_internet && (
              <a
                href={p.site_internet} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: '#0ea5e9' }}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Site
              </a>
            )}
            {p.lien_google_maps && (
              <a
                href={p.lien_google_maps} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: '#f59e0b' }}
                onClick={e => e.stopPropagation()}
              >
                <MapPin className="w-3 h-3" />
                Maps
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom: Action buttons ── */}
      <div
        className="flex items-center gap-1.5 px-3.5 py-2.5"
        style={{ borderTop: `1px solid ${t.surface.borderLight}` }}
      >
        <button
          onClick={e => { e.stopPropagation(); onDetail(); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97]"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}
        >
          <Eye className="w-3.5 h-3.5" />
          Detail
        </button>
        <button
          onClick={e => { e.stopPropagation(); onSite(); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97]"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Site
        </button>
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97]"
          style={{ background: t.surface.hover, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Modifier
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97]"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
