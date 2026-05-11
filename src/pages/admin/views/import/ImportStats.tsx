import { Users, Copy, AlertCircle, CheckCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface ImportStatsProps {
  total: number;
  valid: number;
  dupFile: number;
  dupCrm: number;
  errors: number;
}

export default function ImportStats({ total, valid, dupFile, dupCrm, errors }: ImportStatsProps) {
  const tokens = useThemeTokens();

  const stats = [
    { label: 'Total détecté', value: total, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', icon: <Users className="w-4 h-4" /> },
    { label: 'Nouveaux leads', value: valid, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Doublons fichier', value: dupFile, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Doublons CRM', value: dupCrm, color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Erreurs', value: errors, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="rounded-2xl p-3 sm:p-4"
          style={{ background: tokens.card.bg, border: tokens.card.border }}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] font-semibold tracking-wide uppercase leading-tight" style={{ color: tokens.text.tertiary }}>{s.label}</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ml-2" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {s.icon}
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold tabular-nums" style={{ color: s.value > 0 && s.label !== 'Nouveaux leads' && s.label !== 'Total détecté' ? s.color : s.label === 'Nouveaux leads' && s.value > 0 ? s.color : tokens.text.primary }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
