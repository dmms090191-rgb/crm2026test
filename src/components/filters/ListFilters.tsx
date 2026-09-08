import { useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { getStatutColor } from '../../pages/superadmin/views/crm-societe/types';
import type { SAStatut } from '../../pages/superadmin/views/crm-societe/types';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

export interface FieldFilters {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
}

export const EMPTY_FIELDS: FieldFilters = { firstName: '', lastName: '', company: '', email: '', phone: '' };

function fieldLabels(companyLabel: string): { key: keyof FieldFilters; label: string }[] {
  return [
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'company', label: companyLabel },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
  ];
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statut: string;
  onStatutChange: (v: string) => void;
  saStatuts: SAStatut[];
  fields: FieldFilters;
  onFieldChange: (k: keyof FieldFilters, v: string) => void;
  activeCount: number;
  hasAnyFilter: boolean;
  onReset: () => void;
  tokens: ThemeTokens;
  /** Texte du champ de recherche, propre a chaque panel. */
  searchPlaceholder?: string;
  /** Libelle de la colonne « entite » : « Groupe » cote Talvex, « Societe » cote Groupe. */
  companyLabel?: string;
}

export default function ListFilters({
  search, onSearchChange, statut, onStatutChange, saStatuts,
  fields, onFieldChange, activeCount, hasAnyFilter, onReset, tokens: t,
  searchPlaceholder = 'Rechercher...', companyLabel = 'Societe',
}: Props) {
  const [open, setOpen] = useState(false);
  const [statutOpen, setStatutOpen] = useState(false);
  const FIELDS = fieldLabels(companyLabel);

  const statutLabel = statut === 'all' ? 'Tous les statuts' : statut === 'none' ? 'Aucun statut' : statut;
  const statutCfg = statut !== 'all' && statut !== 'none' ? getStatutColor(statut, saStatuts) : null;

  const inputStyle = { background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text };

  return (
    <div className="mb-3 sm:mb-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] px-3 py-2 rounded-xl" style={inputStyle}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: t.text.quaternary }} />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent outline-none text-xs"
            style={{ color: t.input.text }}
          />
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setStatutOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: statutCfg ? statutCfg.bg : t.surface.primary,
              border: `1px solid ${statutCfg ? statutCfg.border : t.surface.border}`,
              color: statutCfg ? statutCfg.color : t.text.secondary,
            }}
          >
            {statutCfg && <span className="w-2 h-2 rounded-full" style={{ background: statutCfg.dot }} />}
            <span className="max-w-[120px] truncate">{statutLabel}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {statutOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setStatutOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-xl z-[100] min-w-[190px] max-h-64 overflow-y-auto"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
              >
                {[{ v: 'all', l: 'Tous les statuts' }, { v: 'none', l: 'Aucun statut' }].map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => { onStatutChange(o.v); setStatutOpen(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                    style={{ color: t.text.secondary }}
                  >
                    {o.l}
                    {statut === o.v && <Check className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />}
                  </button>
                ))}
                <div className="my-1" style={{ height: 1, background: t.surface.border }} />
                {saStatuts.map(s => {
                  const cfg = getStatutColor(s.nom, saStatuts);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { onStatutChange(s.nom); setStatutOpen(false); }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                      style={{ color: cfg.color }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        <span className="truncate">{s.nom}</span>
                      </span>
                      {statut === s.nom && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
          style={{
            background: open ? 'rgba(245,158,11,0.12)' : t.surface.primary,
            border: `1px solid ${open ? 'rgba(245,158,11,0.3)' : t.surface.border}`,
            color: open ? '#f59e0b' : t.text.secondary,
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtres
          {activeCount > 0 && (
            <span
              className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {activeCount}
            </span>
          )}
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={onReset}
            title="Reinitialiser"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
            style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-3 rounded-xl" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="min-w-0">
              <label className="block text-[10px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: t.text.quaternary }}>{label}</label>
              <input
                value={fields[key]}
                onChange={e => onFieldChange(key, e.target.value)}
                placeholder={label}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
