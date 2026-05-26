import { MessageSquare, Search, FileText, Rocket } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Vous faites une demande',
    desc: 'Vous decrivez votre besoin en quelques minutes.',
    color: '#10b981',
  },
  {
    num: '02',
    icon: <Search className="w-5 h-5" />,
    title: 'Un conseiller analyse votre projet',
    desc: 'Votre logement, votre consommation et vos objectifs sont etudies.',
    color: '#06b6d4',
  },
  {
    num: '03',
    icon: <FileText className="w-5 h-5" />,
    title: 'Vous recevez une proposition claire',
    desc: "Vous obtenez une solution adaptee, avec les etapes et le suivi.",
    color: '#0ea5e9',
  },
  {
    num: '04',
    icon: <Rocket className="w-5 h-5" />,
    title: 'Votre projet avance',
    desc: 'Rendez-vous, documents, installation et suivi sont centralises.',
    color: '#f59e0b',
  },
];

export default function RenewableProcess() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
            Processus
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">
            Comment ca marche
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            Un processus simple et transparent, du premier contact jusqu'a la realisation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {STEPS.map((step, i) => (
            <div key={i} className="group relative">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] right-[-16px] h-[1px]"
                  style={{ background: `linear-gradient(to right, ${step.color}30, transparent)` }} />
              )}

              <div className="relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                }}>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse at top, ${step.color}06, transparent 70%)` }} />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${step.color}12`, border: `1px solid ${step.color}20`, color: step.color }}>
                      {step.icon}
                    </div>
                    <span className="text-2xl font-extrabold" style={{ color: `${step.color}30` }}>{step.num}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
