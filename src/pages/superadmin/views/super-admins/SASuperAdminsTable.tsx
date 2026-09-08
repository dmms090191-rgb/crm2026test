import { useRef } from 'react';
import { MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { getStatutColor } from '../crm-societe/types';
import type { SAStatut } from '../crm-societe/types';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export type SortKey = 'first_name' | 'last_name' | 'company' | 'email' | 'statut';

const SORTABLE: Record<string, SortKey> = {
  Prenom: 'first_name',
  Nom: 'last_name',
  Groupe: 'company',
  Statut: 'statut',
  Email: 'email',
};

interface Props {
  list: CompanySuperAdmin[];
  tokens: ThemeTokens;
  onActions: (sa: CompanySuperAdmin) => void;
  saStatuts: SAStatut[];
  statuts: Record<string, string>;
  onStatutClick: (companyId: string, rect: { top: number; left: number }) => void;
  sortKey?: SortKey | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: SortKey) => void;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function SASuperAdminsTable({ list, tokens: t, onActions, saStatuts, statuts, onStatutClick, sortKey = null, sortDir = 'asc', onSort, selectMode = false, selected, onToggleSelect }: Props) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const columns = ['Prenom', 'Nom', 'Email', 'Groupe', 'Statut', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: t.surface.hover }}>
            {selectMode && <th className="px-4 py-3 w-10" style={{ borderBottom: `1px solid ${t.surface.border}` }} />}
            {columns.map(col => (
              <th key={col} className="px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: t.text.tertiary, borderBottom: `1px solid ${t.surface.border}` }}>
                {SORTABLE[col] && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(SORTABLE[col])}
                    className="inline-flex items-center gap-1 uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
                    style={{ color: sortKey === SORTABLE[col] ? '#f59e0b' : 'inherit' }}
                  >
                    {col}
                    <ChevronUp
                      className={`w-3 h-3 transition-transform ${sortKey === SORTABLE[col] && sortDir === 'desc' ? 'rotate-180' : ''}`}
                      style={{ opacity: sortKey === SORTABLE[col] ? 1 : 0.25 }}
                    />
                  </button>
                ) : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map(sa => (
            <tr key={sa.id} className="transition-colors" style={{ borderBottom: `1px solid ${t.surface.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {selectMode && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected?.has(sa.id) ?? false}
                    onChange={() => onToggleSelect?.(sa.id)}
                    className="w-4 h-4 cursor-pointer accent-red-500"
                  />
                </td>
              )}
              <td className="px-4 py-3 text-sm font-medium" style={{ color: t.text.primary }}>{sa.first_name}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.primary }}>{sa.last_name}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.secondary }}>{sa.email}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.secondary }}>{sa.company}</td>
              <td className="px-4 py-3">
                {sa.company_id ? (() => {
                  const cid = sa.company_id;
                  const nom = statuts[cid] ?? '';
                  const cfg = getStatutColor(nom, saStatuts);
                  return (
                    <button
                      ref={el => { btnRefs.current[cid] = el; }}
                      type="button"
                      onClick={() => {
                        const r = btnRefs.current[cid]?.getBoundingClientRect();
                        if (r) onStatutClick(cid, { top: r.bottom + 4, left: r.left });
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-bold transition-all duration-200 hover:shadow-md whitespace-nowrap"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                      {nom || 'Aucun'}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                  );
                })() : (
                  <span className="text-xs" style={{ color: t.text.quaternary }}>—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.secondary }}>{sa.phone || '-'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  Super Admin
                </span>
              </td>
              <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: t.text.tertiary }}>
                {new Date(sa.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold`}
                  style={{ background: sa.access_enabled ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: sa.access_enabled ? '#22c55e' : '#ef4444' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sa.access_enabled ? '#22c55e' : '#ef4444' }} />
                  {sa.access_enabled ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onActions(sa)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'; }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  Actions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
