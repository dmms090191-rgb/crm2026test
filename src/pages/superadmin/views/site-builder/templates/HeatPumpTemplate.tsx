import { Thermometer, Wrench, CalendarCheck, ShieldCheck, Phone, ArrowRight } from 'lucide-react';

const SERVICES = [
  { icon: <Thermometer className="w-5 h-5" />, title: 'Pompes a chaleur', desc: 'Installation air-eau, air-air et geothermie pour un confort optimal toute l\'annee.' },
  { icon: <Wrench className="w-5 h-5" />, title: 'Entretien & SAV', desc: 'Maintenance preventive et curative par des techniciens certifies.' },
  { icon: <CalendarCheck className="w-5 h-5" />, title: 'Visite technique', desc: 'Etude de faisabilite gratuite a domicile pour definir la meilleure solution.' },
  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Garantie 10 ans', desc: 'Equipements garantis et installation certifiee RGE pour vos aides.' },
];

export default function HeatPumpTemplate() {
  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-sky-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-6">
            <Thermometer className="w-3.5 h-3.5" />
            Chauffage & Climatisation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Installez votre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-sky-400">
              pompe a chaleur
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Chauffage et climatisation performants, economies d'energie et confort garanti.
            Installation par des professionnels certifies RGE.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25">
              Demander une visite technique
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
        <h2 className="text-2xl font-bold text-center mb-2">Nos prestations</h2>
        <p className="text-sm text-slate-400 text-center mb-12 max-w-lg mx-auto">
          De l'etude a l'installation, nous vous accompagnons a chaque etape.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 hover:border-orange-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-3">
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
        <div className="rounded-2xl p-8 bg-gradient-to-r from-orange-500/10 to-sky-500/5 border border-orange-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Planifiez votre visite gratuite</h3>
          <p className="text-sm text-slate-400 mb-6">Un technicien se deplace chez vous pour evaluer la meilleure solution.</p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25">
            Prendre rendez-vous
            <CalendarCheck className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Pompe a Chaleur Pro. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
