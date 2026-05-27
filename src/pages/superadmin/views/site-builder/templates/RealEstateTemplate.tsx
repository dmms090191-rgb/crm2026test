import { Home, MapPin, Search, Phone, ArrowRight, Key } from 'lucide-react';

const SERVICES = [
  { icon: <Search className="w-5 h-5" />, title: 'Recherche de biens', desc: 'Trouvez le bien ideal parmi notre catalogue d\'appartements, maisons et terrains.' },
  { icon: <Key className="w-5 h-5" />, title: 'Estimation gratuite', desc: 'Obtenez une estimation precise de votre bien en moins de 48 heures.' },
  { icon: <MapPin className="w-5 h-5" />, title: 'Visites organisees', desc: 'Planifiez vos visites en ligne et decouvrez nos biens accompagne d\'un agent.' },
  { icon: <Home className="w-5 h-5" />, title: 'Accompagnement complet', desc: 'De la premiere visite a la signature, nous vous guidons a chaque etape.' },
];

export default function RealEstateTemplate() {
  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
            <Home className="w-3.5 h-3.5" />
            Agence immobiliere
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Trouvez votre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              bien ideal
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Achat, vente, location -- votre agence immobiliere de confiance pour tous vos projets.
            Expertise locale et accompagnement personnalise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/25">
              Voir nos biens
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
              <Phone className="w-4 h-4" />
              Nous contacter
            </button>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Nos services</h2>
        <p className="text-sm text-slate-400 text-center mb-12 max-w-lg mx-auto">
          Un accompagnement sur mesure pour chaque etape de votre projet immobilier.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 hover:border-sky-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
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
        <div className="rounded-2xl p-8 bg-gradient-to-r from-sky-500/10 to-emerald-500/5 border border-sky-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Estimation gratuite de votre bien</h3>
          <p className="text-sm text-slate-400 mb-6">Recevez une estimation detaillee par nos experts en moins de 48h.</p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25">
            Demander une estimation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Immobilier Pro. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
