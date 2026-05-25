import { Sun, Leaf, Battery, TrendingDown, Phone, ArrowRight } from 'lucide-react';

const SERVICES = [
  { icon: <Sun className="w-5 h-5" />, title: 'Panneaux solaires', desc: 'Installation de panneaux photovoltaiques pour reduire votre facture energetique.' },
  { icon: <Battery className="w-5 h-5" />, title: 'Stockage batterie', desc: 'Solutions de stockage pour maximiser votre autoconsommation.' },
  { icon: <TrendingDown className="w-5 h-5" />, title: 'Economies garanties', desc: 'Jusqu\'a 70% de reduction sur vos factures d\'electricite.' },
  { icon: <Leaf className="w-5 h-5" />, title: 'Bilan carbone', desc: 'Reduisez votre empreinte carbone et contribuez a la transition energetique.' },
];

export default function RenewableEnergyTemplate() {
  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-yellow-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
            <Sun className="w-3.5 h-3.5" />
            Energie renouvelable
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Passez au solaire<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-yellow-400">
              economisez durablement
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Installation de panneaux solaires, pompes a chaleur et solutions d'economies d'energie pour votre maison ou votre entreprise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25">
              Demander un devis gratuit
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
              <Phone className="w-4 h-4" />
              Nous appeler
            </button>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Nos solutions</h2>
        <p className="text-sm text-slate-400 text-center mb-12 max-w-lg mx-auto">
          Des solutions adaptees a vos besoins pour une transition energetique reussie.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
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
        <div className="rounded-2xl p-8 bg-gradient-to-r from-emerald-500/10 to-yellow-500/5 border border-emerald-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Pret a faire des economies ?</h3>
          <p className="text-sm text-slate-400 mb-6">Obtenez une estimation gratuite et personnalisee en quelques minutes.</p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25">
            Obtenir mon devis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Energie Renouvelable. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
