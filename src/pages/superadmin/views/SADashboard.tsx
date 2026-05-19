import { Activity, Building2, Users, Globe } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import AuditSummaryCard from '../../admin/views/AuditSummaryCard';
import type { SAView } from '../SuperAdminSidebar';

interface SADashboardProps {
  onNavigate?: (view: SAView) => void;
  onNavigateToAudit?: () => void;
}

export default function SADashboard({ onNavigate, onNavigateToAudit }: SADashboardProps) {
  const t = useThemeTokens();

  const stats = [
    { label: 'Entreprises', value: '—', icon: <Building2 className="w-5 h-5" /> },
    { label: 'Utilisateurs', value: '—', icon: <Users className="w-5 h-5" /> },
    { label: 'Domaines', value: '—', icon: <Globe className="w-5 h-5" /> },
    { label: 'Activite', value: '—', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: t.text.primary }}>
          Dashboard Super Admin
        </h1>
        <p className="text-sm mt-1" style={{ color: t.text.secondary }}>
          Vue globale de la plateforme SaaS.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 border"
            style={{ background: t.surface.card, borderColor: t.surface.border }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: t.text.secondary }}>
              {s.icon}
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: t.text.primary }}>{s.value}</p>
          </div>
        ))}
      </div>

      <AuditSummaryCard
        onNavigateToAudit={onNavigateToAudit}
      />
    </div>
  );
}
