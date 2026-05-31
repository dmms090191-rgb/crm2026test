import { CheckCircle, BarChart3, Users, MessageSquare, Bell, Shield, Zap } from 'lucide-react';
import { useThemeTokens } from '../../../../../hooks/useThemeTokens';

const FEATURES = [
  { icon: BarChart3, label: 'Tableau de bord', color: '#0ea5e9' },
  { icon: Users, label: 'Gestion des leads', color: '#10b981' },
  { icon: MessageSquare, label: 'Messagerie', color: '#f59e0b' },
  { icon: Bell, label: 'Notifications push', color: '#ef4444' },
  { icon: Shield, label: 'Securite avancee', color: '#8b5cf6' },
  { icon: Zap, label: 'Performance', color: '#06b6d4' },
];

export default function AppIconDisplay() {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div
          className="absolute -inset-4 rounded-[2rem] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <div
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[1.75rem] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
            boxShadow: '0 8px 32px rgba(14,165,233,0.3), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2)',
          }}
        >
          <span className="text-white text-5xl sm:text-6xl font-bold select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            T
          </span>
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: `2px solid ${t.surface.primary}`,
            boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
          }}
        >
          <CheckCircle className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <h3 className="text-lg font-bold mb-1" style={{ color: t.heading.primary }}>
        Talvex
      </h3>
      <p className="text-xs mb-1" style={{ color: t.text.tertiary }}>
        CRM professionnel
      </p>
      <p className="text-[10px] font-mono px-2 py-0.5 rounded-md mb-5" style={{ background: t.surface.secondary, color: t.text.quaternary }}>
        v1.0.0
      </p>

      <div className="w-full max-w-xs space-y-2">
        {FEATURES.map((feat) => (
          <div
            key={feat.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}25` }}
            >
              <feat.icon className="w-3.5 h-3.5" style={{ color: feat.color }} />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>
              {feat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
