import { TrendingDown, Home, Thermometer, Lightbulb, Users, BarChart3 } from 'lucide-react';

const ADVANTAGES = [
  { icon: <TrendingDown className="w-5 h-5" />, title: 'Reduire ses factures', desc: 'Diminuez vos depenses energetiques mois apres mois.', color: '#10b981' },
  { icon: <Home className="w-5 h-5" />, title: 'Valoriser son logement', desc: "Un logement ameliore prend de la valeur sur le marche.", color: '#06b6d4' },
  { icon: <Thermometer className="w-5 h-5" />, title: 'Ameliorer son confort', desc: 'Une meilleure isolation et un chauffage adapte changent le quotidien.', color: '#f59e0b' },
  { icon: <Lightbulb className="w-5 h-5" />, title: 'Consommer plus intelligemment', desc: 'Comprenez et optimisez votre consommation avec des outils clairs.', color: '#0ea5e9' },
  { icon: <Users className="w-5 h-5" />, title: 'Etre accompagne', desc: 'Un interlocuteur disponible a chaque etape de votre projet.', color: '#8b5cf6' },
  { icon: <BarChart3 className="w-5 h-5" />, title: 'Suivre son projet facilement', desc: 'Un espace en ligne pour messages, rendez-vous et documents.', color: '#ec4899' },
];

export default function RenewableAdvantages() {
  return (
    <section id="avantages" className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
            Avantages
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">
            Pourquoi passer aux energies renouvelables ?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            L'energie renouvelable n'est pas seulement une installation technique. C'est un projet de long terme qui doit etre clair, suivi et bien accompagne.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADVANTAGES.map((a, i) => (
            <div key={i} className="group rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${a.color}12`, border: `1px solid ${a.color}20`, color: a.color }}>
                {a.icon}
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{a.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
