import { MoreHorizontal } from 'lucide-react';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  sa: CompanySuperAdmin;
  tokens: ThemeTokens;
  onActions: (sa: CompanySuperAdmin) => void;
}

export default function SASuperAdminMobileCard({ sa, tokens: t, onActions }: Props) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: t.surface.bg, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            {(sa.first_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>
              {sa.first_name} {sa.last_name}
            </p>
            <p className="text-xs truncate" style={{ color: t.text.tertiary }}>{sa.email}</p>
          </div>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold`}
          style={{ background: sa.access_enabled ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: sa.access_enabled ? '#22c55e' : '#ef4444' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sa.access_enabled ? '#22c55e' : '#ef4444' }} />
          {sa.access_enabled ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="font-medium" style={{ color: t.text.tertiary }}>Societe</span>
          <p className="truncate" style={{ color: t.text.secondary }}>{sa.company}</p>
        </div>
        <div>
          <span className="font-medium" style={{ color: t.text.tertiary }}>Telephone</span>
          <p className="truncate" style={{ color: t.text.secondary }}>{sa.phone || '-'}</p>
        </div>
        <div>
          <span className="font-medium" style={{ color: t.text.tertiary }}>Role</span>
          <p style={{ color: '#f59e0b' }}>Super Admin</p>
        </div>
        <div>
          <span className="font-medium" style={{ color: t.text.tertiary }}>Cree le</span>
          <p style={{ color: t.text.secondary }}>
            {new Date(sa.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      <button
        onClick={() => onActions(sa)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
        style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
        Actions
      </button>
    </div>
  );
}
