import { Building2, ArrowRight } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import SAProjectHealthCard from './dashboard/SAProjectHealthCard';
import type { SAView } from '../SuperAdminSidebar';

interface SADashboardProps {
  onNavigate?: (view: SAView) => void;
  onNavigateToAudit?: () => void;
  adminCount?: number;
  adminsLoading?: boolean;
}

export default function SADashboard({ onNavigate, onNavigateToAudit, adminCount = 0, adminsLoading }: SADashboardProps) {
  const t = useThemeTokens();

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: t.text.primary }}>
          Dashboard Super Admin
        </h1>
        <p className="text-sm mt-1" style={{ color: t.text.secondary }}>
          Vue globale de la plateforme Talvex.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Entreprises card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    boxShadow: '0 0 20px rgba(37,99,235,0.25)',
                  }}
                >
                  <Building2 className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.text.tertiary }}>
                  Entreprises
                </span>
              </div>
            </div>

            {adminsLoading ? (
              <div className="flex items-end gap-2 mb-2">
                <div className="h-10 w-12 rounded-lg animate-pulse" style={{ background: t.surface.tertiary }} />
              </div>
            ) : (
              <div className="flex items-end gap-2 mb-2">
                <span
                  className="text-4xl font-extrabold tabular-nums leading-none"
                  style={{ color: t.text.primary }}
                >
                  {adminCount}
                </span>
              </div>
            )}

            <p className="text-xs" style={{ color: t.text.tertiary }}>
              {adminCount === 1 ? 'Societe cliente active' : 'Societes clientes actives'} dans Talvex
            </p>
          </div>

          <div style={{ height: '1px', background: t.surface.borderLight }} />

          <button
            onClick={() => onNavigate?.('admins')}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium transition-all"
            style={{ color: t.accent.text }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Voir la liste des admins
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <SAProjectHealthCard onNavigateToAudit={onNavigateToAudit} />
    </div>
  );
}
