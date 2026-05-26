import { MessageSquare, Calendar, FileText, CheckCircle2, FolderOpen, Clock } from 'lucide-react';

const FEATURES = [
  { icon: <MessageSquare className="w-4 h-4" />, label: 'Messages', value: '3 non lus', color: '#10b981' },
  { icon: <Calendar className="w-4 h-4" />, label: 'Rendez-vous', value: '12 juin - 14h', color: '#0ea5e9' },
  { icon: <FileText className="w-4 h-4" />, label: 'Proposition', value: 'Devis accepte', color: '#f59e0b' },
  { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Statut projet', value: 'En cours', color: '#06b6d4' },
  { icon: <FolderOpen className="w-4 h-4" />, label: 'Documents', value: '5 fichiers', color: '#8b5cf6' },
  { icon: <Clock className="w-4 h-4" />, label: 'Prochain RDV', value: 'Jeudi 14h', color: '#ec4899' },
];

export default function RenewableClientSpace() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text */}
          <div className="space-y-5 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee' }}>
              Espace client
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              Un suivi clair pour chaque client
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Chaque client peut acceder a son espace pour suivre ses messages, ses rendez-vous, ses propositions et l'avancement de son projet.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Ce site n'est pas seulement une vitrine. Il est connecte a un systeme de gestion client qui permet un suivi complet depuis le premier contact.
            </p>
          </div>

          {/* Mockup */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-30"
              style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.15), transparent 70%)' }} />
            <div className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
              }}>
              {/* Window chrome */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                </div>
                <span className="text-[10px] text-white/25 ml-2 font-mono">Mon espace client</span>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="text-sm font-bold text-emerald-400">MC</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/80">Marc Cohen</p>
                    <p className="text-[10px] text-white/30">Projet solaire - En cours</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FEATURES.map((f, i) => (
                    <div key={i} className="group rounded-xl p-3 transition-all duration-200 hover:scale-[1.03]"
                      style={{
                        background: `${f.color}06`,
                        border: `1px solid ${f.color}15`,
                      }}>
                      <div className="mb-2" style={{ color: f.color }}>{f.icon}</div>
                      <p className="text-[9px] text-white/35 mb-0.5">{f.label}</p>
                      <p className="text-[11px] font-semibold" style={{ color: f.color }}>{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-white/50">Avancement du projet</span>
                    <span className="text-[10px] font-bold text-emerald-400">65%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '65%', background: 'linear-gradient(to right, #10b981, #06b6d4)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
