import { Building2, Shield, Mail } from 'lucide-react';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  impersonated: ImpersonatedCompanySuperAdmin;
  fullName: string;
}

export default function CSAOverview({ impersonated, fullName }: Props) {
  const t = useThemeTokens();

  const statsCards = [
    { icon: Building2, label: 'Societe', value: impersonated.company, color: t.accent.text, bg: t.accent.bg, border: t.accent.border },
    { icon: Shield, label: 'Role', value: 'SUPER ADMIN', color: t.accent.text, bg: t.accent.bg, border: t.accent.border },
    { icon: Mail, label: 'Email', value: impersonated.email, color: t.success.text, bg: t.success.bg, border: t.success.border },
  ];

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg md:text-2xl font-bold" style={{ color: t.text.primary }}>Dashboard Super Admin</h2>
        <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: t.text.tertiary }}>Vue globale de votre societe.</p>
      </div>

      <div className="rounded-2xl p-5 sm:p-6" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{
            background: `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`,
            boxShadow: `0 4px 20px ${t.accent.border}`,
          }}>
            {(impersonated.first_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold truncate" style={{ color: t.text.primary }}>{fullName}</p>
            <p className="text-xs font-medium" style={{ color: t.accent.text }}>{impersonated.company}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statsCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl p-4" style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: card.color }} />
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: t.text.quaternary }}>{card.label}</span>
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: card.color }}>{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
      }}>
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Informations du compte</h3>
        </div>
        <div className="divide-y" style={{ borderColor: t.surface.border }}>
          {[
            ['Nom complet', fullName],
            ['Societe', impersonated.company],
            ['Email', impersonated.email],
            ['Role', 'SUPER ADMIN'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs font-medium" style={{ color: t.text.tertiary }}>{label}</span>
              <span className="text-xs font-semibold" style={{ color: label === 'Role' ? t.accent.text : t.text.primary }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
