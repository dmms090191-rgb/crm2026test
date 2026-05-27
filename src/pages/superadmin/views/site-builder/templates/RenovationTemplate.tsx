import { Hammer, PaintBucket, Ruler, ShieldCheck, Phone, ArrowRight } from 'lucide-react';

const SERVICES = [
  { icon: <Hammer className="w-5 h-5" />, title: 'Renovation complete', desc: 'Transformation integrale de vos espaces : cuisine, salle de bain, salon et plus.' },
  { icon: <PaintBucket className="w-5 h-5" />, title: 'Peinture & Finitions', desc: 'Travaux de peinture interieurs et exterieurs avec des materiaux de qualite.' },
  { icon: <Ruler className="w-5 h-5" />, title: 'Devis detaille', desc: 'Estimation transparente et detaillee pour maitriser votre budget travaux.' },
  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Garantie decennale', desc: 'Tous nos travaux sont couverts par une garantie decennale pour votre tranquillite.' },
];

export default function RenovationTemplate() {
  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-stone-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
            <Hammer className="w-3.5 h-3.5" />
            Renovation & Batiment
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Renovez votre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-stone-400">
              interieur
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Renovation, amenagement et transformation de vos espaces.
            Des artisans qualifies pour donner vie a vos projets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-sm shadow-lg shadow-amber-500/25">
              Demander un devis
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
              <Phone className="w-4 h-4" />
              01 23 45 67 89
            </button>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Nos services</h2>
        <p className="text-sm text-slate-400 text-center mb-12 max-w-lg mx-auto">
          Des solutions completes pour tous vos projets de renovation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
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
        <div className="rounded-2xl p-8 bg-gradient-to-r from-amber-500/10 to-stone-500/5 border border-amber-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Votre projet commence ici</h3>
          <p className="text-sm text-slate-400 mb-6">Decrivez-nous votre projet et recevez un devis personnalise sous 48h.</p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-500/25">
            Demarrer mon projet
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Renovation Pro. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
