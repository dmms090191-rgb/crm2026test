import { Dumbbell, Heart, CalendarCheck, Users, ArrowRight, Clock } from 'lucide-react';

const SERVICES = [
  { icon: <Dumbbell className="w-5 h-5" />, title: 'Musculation', desc: 'Equipements haut de gamme, espace libre et machines guidees pour tous niveaux.' },
  { icon: <Heart className="w-5 h-5" />, title: 'Coaching personnalise', desc: 'Programmes sur mesure avec un coach dedie pour atteindre vos objectifs.' },
  { icon: <Users className="w-5 h-5" />, title: 'Cours collectifs', desc: 'HIIT, yoga, boxe, cycling -- plus de 30 cours par semaine.' },
  { icon: <CalendarCheck className="w-5 h-5" />, title: 'Suivi & Rendez-vous', desc: 'Reservez vos seances, suivez vos progres et gerez votre abonnement en ligne.' },
];

export default function FitnessTemplate() {
  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
            <Dumbbell className="w-3.5 h-3.5" />
            Salle de sport
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Depassez vos<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              limites
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Musculation, coaching, cours collectifs et suivi personnalise.
            Rejoignez une communaute motivee et atteignez vos objectifs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-sm shadow-lg shadow-red-500/25">
              S'inscrire maintenant
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
              <Clock className="w-4 h-4" />
              Horaires d'ouverture
            </button>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Nos services</h2>
        <p className="text-sm text-slate-400 text-center mb-12 max-w-lg mx-auto">
          Tout pour votre forme physique et votre bien-etre, au meme endroit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 hover:border-red-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                {s.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="rounded-2xl p-8 bg-gradient-to-r from-red-500/10 to-orange-500/5 border border-red-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Essai gratuit de 7 jours</h3>
          <p className="text-sm text-slate-400 mb-6">Testez nos installations et nos cours sans engagement.</p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25">
            Commencer l'essai
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Fitness Club. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
