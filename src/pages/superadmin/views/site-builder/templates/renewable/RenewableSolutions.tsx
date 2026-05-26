import { Sun, Search, Home, Battery, FileCheck } from 'lucide-react';

const SOLUTIONS = [
  {
    icon: <Sun className="w-5 h-5" />,
    title: 'Panneaux solaires',
    desc: "Produisez une partie de votre energie et reduisez votre dependance aux hausses de prix.",
    badge: 'Populaire',
    color: '#f59e0b',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Audit energetique',
    desc: "Analysez votre consommation et identifiez les actions les plus rentables.",
    badge: 'Recommande',
    color: '#06b6d4',
  },
  {
    icon: <Home className="w-5 h-5" />,
    title: 'Renovation energetique',
    desc: "Ameliorez le confort de votre logement tout en optimisant vos depenses.",
    badge: 'Confort',
    color: '#10b981',
  },
  {
    icon: <Battery className="w-5 h-5" />,
    title: 'Stockage et optimisation',
    desc: "Preparez votre maison a une gestion plus intelligente de l'energie.",
    badge: 'Innovation',
    color: '#8b5cf6',
  },
  {
    icon: <FileCheck className="w-5 h-5" />,
    title: 'Accompagnement administratif',
    desc: "Suivez les etapes, les documents et les rendez-vous depuis un espace clair.",
    badge: 'Inclus',
    color: '#0ea5e9',
  },
];

export default function RenewableSolutions() {
  return (
    <section id="solutions" className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', transform: 'translateY(-50%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
            Solutions
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">
            Des solutions adaptees a votre maison
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Chaque logement est different. Nous analysons vos besoins pour vous proposer les solutions les plus adaptees.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOLUTIONS.map((s, i) => (
            <div key={i}
              className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at top left, ${s.color}08, transparent 60%)` }} />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${s.color}12`, border: `1px solid ${s.color}20`, color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: `${s.color}10`, border: `1px solid ${s.color}20`, color: s.color }}>
                    {s.badge}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
