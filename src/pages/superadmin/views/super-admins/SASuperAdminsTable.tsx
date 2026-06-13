import { MoreHorizontal } from 'lucide-react';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  list: CompanySuperAdmin[];
  tokens: ThemeTokens;
  onActions: (sa: CompanySuperAdmin) => void;
}

export default function SASuperAdminsTable({ list, tokens: t, onActions }: Props) {
  const columns = ['Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: t.surface.hover }}>
            {columns.map(col => (
              <th key={col} className="px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: t.text.tertiary, borderBottom: `1px solid ${t.surface.border}` }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map(sa => (
            <tr key={sa.id} className="transition-colors" style={{ borderBottom: `1px solid ${t.surface.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: t.text.primary }}>{sa.first_name}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.primary }}>{sa.last_name}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.secondary }}>{sa.email}</td>
              <td className="px-4 py-3 text-sm" style={{ color: t.text.secondary }}>{sa.company}</td>
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
