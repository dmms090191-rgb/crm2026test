import { Users, Copy, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportStatsProps {
  total: number;
  valid: number;
  dupFile: number;
  dupCrm: number;
  errors: number;
}

export default function ImportStats({ total, valid, dupFile, dupCrm, errors }: ImportStatsProps) {
  const stats = [
    { label: 'Total détecté', value: total, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', icon: <Users className="w-4 h-4" /> },
    { label: 'Nouveaux leads', value: valid, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Doublons fichier', value: dupFile, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Doublons CRM', value: dupCrm, color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Erreurs', value: errors, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[10px] font-semibold tracking-wide uppercase">{s.label}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {s.icon}
            </div>
          </div>
          <p className="text-white text-xl font-bold tabular-nums" style={{ color: s.value > 0 && s.label !== 'Nouveaux leads' && s.label !== 'Total détecté' ? s.color : s.label === 'Nouveaux leads' && s.value > 0 ? s.color : 'white' }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
