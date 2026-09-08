import { useRef } from 'react';
import { MoreHorizontal, User, Mail, Building2, Phone, Shield, CalendarDays, Lock, ChevronDown, ChevronUp, Settings, UserCheck, UserX } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getStatutColor } from '../superadmin/views/crm-societe/types';
import type { SAStatut } from '../superadmin/views/crm-societe/types';
import type { CSAAdminUser } from './useCsaCompanies';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


export type SortKey = 'first_name' | 'last_name' | 'company' | 'email' | 'statut';

const SORTABLE: Record<string, SortKey> = {
  Prenom: 'first_name',
  Nom: 'last_name',
  Societe: 'company',
  Statut: 'statut',
  Email: 'email',
};

interface TableProps {
  admins: CSAAdminUser[];
  t: ReturnType<typeof useThemeTokens>;
  onActions: (admin: CSAAdminUser) => void;
  statuts?: SAStatut[];
  statutsMap?: Record<string, string>;
  onStatutClick?: (societeCompanyId: string, rect: { top: number; left: number }) => void;
  sortKey?: SortKey | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: SortKey) => void;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (companyId: string) => void;
  isDeletable?: (a: CSAAdminUser) => boolean;
}

const COL_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  Prenom: User, Nom: User, Email: Mail, Societe: Building2, Telephone: Phone,
  Role: Shield, 'Cree le': CalendarDays, Acces: Lock, Actions: Settings,
};

function CSAAdminsDesktopTable({ admins, t, onActions, statuts = [], statutsMap = {}, onStatutClick, sortKey = null, sortDir = 'asc', onSort, selectMode = false, selected, onToggleSelect, isDeletable }: TableProps) {
  const statutBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cols = ['Prenom', 'Nom', 'Email', 'Societe', 'Statut', 'Telephone', 'Cree le', 'Acces', 'Actions'];
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: t.table.headerBg }}>
            {selectMode && <th className="px-4 py-4 w-10" style={{ borderBottom: `2px solid ${t.accent.solid}` }} />}
            {cols.map((col) => {
              const Icon = COL_ICONS[col];
              return (
                <th key={col} className="px-5 py-4 text-left" style={{ borderBottom: `2px solid ${t.accent.solid}` }}>
                  {SORTABLE[col] && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(SORTABLE[col])}
                      className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    >
                      {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: t.accent.text, opacity: 0.6 }} />}
                      <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: sortKey === SORTABLE[col] ? '#f59e0b' : t.table.headerText }}>{col}</span>
                      <ChevronUp
                        className={`w-3 h-3 transition-transform ${sortKey === SORTABLE[col] && sortDir === 'desc' ? 'rotate-180' : ''}`}
                        style={{ color: sortKey === SORTABLE[col] ? '#f59e0b' : t.table.headerText, opacity: sortKey === SORTABLE[col] ? 1 : 0.25 }}
                      />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: t.accent.text, opacity: 0.6 }} />}
                      <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: t.table.headerText }}>{col}</span>
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {admins.map((admin, idx) => (
            <tr key={admin.id} style={{ borderBottom: idx < admins.length - 1 ? `1px solid ${t.table.rowBorder}` : 'none' }}
              className="transition-colors duration-100"
              onMouseEnter={e => { e.currentTarget.style.background = t.table.rowHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {selectMode && (
                <td className="px-4 py-3" style={{ borderRight: `1px solid ${t.table.rowBorder}` }}>
                  {isDeletable?.(admin) ? (
                    <input
                      type="checkbox"
                      checked={selected?.has(admin.company_id) ?? false}
                      onChange={() => onToggleSelect?.(admin.company_id)}
                      className="w-4 h-4 cursor-pointer accent-red-500"
                    />
                  ) : (
                    <span
                      title="Cette company est la racine d'un Groupe : elle ne peut pas etre supprimee ici"
                      className="inline-flex items-center justify-center w-4 h-4 cursor-not-allowed"
                    >
                      <Lock className="w-3 h-3" style={{ color: t.text.quaternary }} />
                    </span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.primary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.first_name || '\u2014'}</td>
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.primary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.last_name || '\u2014'}</td>
              <td className="px-4 py-3 text-xs" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.email}</td>
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.company || '\u2014'}</td>
              <td className="px-4 py-3" style={{ borderRight: `1px solid ${t.table.rowBorder}` }}>
                {admin.company_id ? (() => {
                  const cid = admin.company_id;
                  const nom = statutsMap[cid] ?? '';
                  const cfg = getStatutColor(nom, statuts);
                  return (
                    <button
                      ref={el => { statutBtnRefs.current[cid] = el; }}
                      type="button"
                      onClick={() => {
                        const r = statutBtnRefs.current[cid]?.getBoundingClientRect();
                        if (r) onStatutClick?.(cid, { top: r.bottom + 4, left: r.left });
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
                  <span className="text-xs" style={{ color: t.text.tertiary }}>{'—'}</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.phone || '\u2014'}</td>
              <td className="px-4 py-3 text-xs" style={{ color: t.text.tertiary, borderRight: `1px solid ${t.table.rowBorder}` }}>{formatDate(admin.created_at)}</td>
              <td className="px-4 py-3" style={{ borderRight: `1px solid ${t.table.rowBorder}` }}>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={
                  admin.access_enabled
                    ? { background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }
                    : { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }
                }>
                  {admin.access_enabled ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                  {admin.access_enabled ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onActions(admin)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.accent.bgHover; e.currentTarget.style.boxShadow = `0 2px 8px ${t.accent.bg}`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />Actions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CSAAdminsMobileList({ admins, t, onActions, selectMode = false, selected, onToggleSelect, isDeletable }: TableProps) {
  return (
    <div className="md:hidden divide-y" style={{ borderColor: t.table.rowBorder }}>
      {admins.map(admin => (
        <div key={admin.id} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {selectMode && (
              isDeletable?.(admin) ? (
                <input
                  type="checkbox"
                  checked={selected?.has(admin.company_id) ?? false}
                  onChange={() => onToggleSelect?.(admin.company_id)}
                  className="w-4 h-4 flex-shrink-0 cursor-pointer accent-red-500"
                />
              ) : (
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.quaternary }} />
              )
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{
              background: admin.access_enabled
                ? `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`
                : `linear-gradient(135deg, ${t.text.quaternary}, ${t.text.quaternary}cc)`,
            }}>
              {(admin.first_name || admin.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>
                {[admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email}
              </p>
              <p className="text-xs truncate" style={{ color: t.text.tertiary }}>{admin.email}</p>
            </div>
            <button
              onClick={() => onActions(admin)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all duration-200"
              style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />Actions
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Societe</span>
              <span className="font-medium" style={{ color: t.text.secondary }}>{admin.company || '\u2014'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Acces</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={
                admin.access_enabled
                  ? { background: t.success.bg, color: t.success.text }
                  : { background: t.danger.bg, color: t.danger.text }
              }>
                {admin.access_enabled ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Telephone</span>
              <span className="font-mono" style={{ color: t.text.secondary }}>{admin.phone || '\u2014'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Cree le</span>
              <span style={{ color: t.text.secondary }}>{formatDate(admin.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { CSAAdminsDesktopTable, CSAAdminsMobileList };
