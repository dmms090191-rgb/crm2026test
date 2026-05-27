import { ArrowRight, Sun, ClipboardCheck, Shield, Users, Zap, TrendingUp, Calendar, FileText, BarChart3 } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onScroll: (id: string) => void;
}

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[10px] text-white/30 ml-2 font-mono">espace-client.nova-energie.fr</span>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <MockCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Economie estimee" value="- 38%" color="emerald" />
            <MockCard icon={<Sun className="w-3.5 h-3.5" />} label="Production solaire" value="4.2 kWh" color="yellow" />
            <MockCard icon={<FileText className="w-3.5 h-3.5" />} label="Devis envoye" value="En attente" color="cyan" />
            <MockCard icon={<Calendar className="w-3.5 h-3.5" />} label="RDV technique" value="12 juin" color="sky" />
          </div>

          <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-white/50">Production mensuelle</span>
              <BarChart3 className="w-3 h-3 text-emerald-400/50" />
            </div>
            <div className="flex items-end gap-1 h-10">
              {[35, 55, 42, 68, 80, 72, 90, 85, 60, 75, 88, 65].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm transition-all hover:opacity-100 opacity-80"
                  style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(16,185,129,0.4), rgba(16,185,129,0.15))` }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <StatusPill label="Installation planifiee" color="emerald" />
            <StatusPill label="Audit valide" color="cyan" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, { border: string; bg: string; icon: string; value: string }> = {
    emerald: { border: 'rgba(16,185,129,0.15)', bg: 'rgba(16,185,129,0.05)', icon: 'text-emerald-400', value: 'text-emerald-400' },
    yellow: { border: 'rgba(234,179,8,0.15)', bg: 'rgba(234,179,8,0.05)', icon: 'text-yellow-400', value: 'text-yellow-400' },
    cyan: { border: 'rgba(6,182,212,0.15)', bg: 'rgba(6,182,212,0.05)', icon: 'text-cyan-400', value: 'text-cyan-400' },
    sky: { border: 'rgba(14,165,233,0.15)', bg: 'rgba(14,165,233,0.05)', icon: 'text-sky-400', value: 'text-sky-400' },
  };
  const c = colorMap[color] ?? colorMap.emerald;
  return (
    <div className="rounded-xl p-3 border transition-all hover:scale-[1.02]"
      style={{ borderColor: c.border, background: c.bg }}>
      <div className={`mb-1.5 ${c.icon}`}>{icon}</div>
      <p className="text-[9px] text-white/40 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${c.value}`}>{value}</p>
    </div>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${styles[color]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {label}
    </span>
  );
}

export default function RenewableHero({ onLogin, onRegister, onScroll }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <Zap className="w-3.5 h-3.5" />
              Energie renouvelable - Solutions professionnelles
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-extrabold leading-[1.1] tracking-tight text-white">
              Passez a une energie{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #22d3ee)' }}>
                plus propre, plus intelligente
              </span>{' '}
              et plus economique
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Installez des solutions d'energie renouvelable adaptees a votre maison, reduisez vos factures et suivez votre projet de A a Z avec un accompagnement professionnel.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <button
                onClick={() => onScroll('simulator')}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}
              >
                Demander un devis gratuit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => onScroll('solutions')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/[0.06]"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                Voir les solutions
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start pt-2">
              <button onClick={onLogin}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-white/[0.06]"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                Connexion
              </button>
              <button onClick={onRegister}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-emerald-500/15"
                style={{ border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                Inscription
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start pt-1">
              {[
                { icon: <ClipboardCheck className="w-3.5 h-3.5" />, text: 'Audit personnalise' },
                { icon: <Zap className="w-3.5 h-3.5" />, text: 'Devis rapide' },
                { icon: <Shield className="w-3.5 h-3.5" />, text: 'Installateurs qualifies' },
                { icon: <Users className="w-3.5 h-3.5" />, text: 'Suivi client en ligne' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="text-emerald-500/60">{b.icon}</span>
                  {b.text}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
