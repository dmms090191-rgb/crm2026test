import { TrendingDown, Clock, Monitor, Wrench } from 'lucide-react';

const STATS = [
  { icon: <TrendingDown className="w-5 h-5" />, value: "Jusqu'a 40%", label: "d'economies", color: '#10b981' },
  { icon: <Clock className="w-5 h-5" />, value: '24/48h', label: 'Audit rapide', color: '#06b6d4' },
  { icon: <Monitor className="w-5 h-5" />, value: 'En ligne', label: 'Suivi projet', color: '#0ea5e9' },
  { icon: <Wrench className="w-5 h-5" />, value: 'Sur mesure', label: 'Solutions adaptees', color: '#f59e0b' },
];

export default function RenewableStats() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="group relative rounded-2xl p-5 sm:p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at center, ${s.color}08, transparent 70%)` }} />
              <div className="relative">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${s.color}12`, border: `1px solid ${s.color}25`, color: s.color }}>
                  {s.icon}
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white mb-0.5">{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] sm:text-xs text-slate-600 mt-5">
          Estimations variables selon le logement, la consommation et l'installation.
        </p>
      </div>
    </section>
  );
}
