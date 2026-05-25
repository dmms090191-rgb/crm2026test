import { Check, ArrowRight } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

const PLANS = [
  {
    name: 'Starter',
    desc: 'Pour démarrer simplement.',
    price: 'Bientôt disponible',
    features: ['CRM simple', 'Gestion des leads', 'Messagerie', 'Agenda', 'Template site'],
    highlight: false,
    color: '#0ea5e9',
  },
  {
    name: 'Pro',
    desc: 'Pour entreprises en croissance.',
    price: 'Sur demande',
    features: ['CRM complet', 'Vendeurs & équipes', 'Espace client', 'Rendez-vous avancés', 'Site + domaine'],
    highlight: true,
    color: '#06b6d4',
  },
  {
    name: 'Premium',
    desc: 'Pour centraliser toute l\'activité.',
    price: 'Sur demande',
    features: ['IA Talvex', 'Automatisations futures', 'Multi-sites', 'Support prioritaire', 'Évolution continue'],
    highlight: false,
    color: '#8b5cf6',
  },
];

export default function TalvexPricingSection({ onLogin }: Props) {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-bold text-white text-center mb-3">Tarifs</h2>
        <p className="text-sm sm:text-base text-slate-400 text-center max-w-lg mx-auto mb-10 sm:mb-14">
          Des formules adaptées à chaque étape de votre croissance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className="relative rounded-2xl p-6 sm:p-7 flex flex-col transition-all hover:scale-[1.02]"
              style={{
                background: plan.highlight
                  ? 'linear-gradient(160deg, rgba(6,182,212,0.12), rgba(14,165,233,0.06))'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${plan.highlight ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: plan.highlight ? '0 0 40px rgba(6,182,212,0.1)' : 'none',
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-sky-500 text-white">
                  Recommandé
                </div>
              )}

              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{plan.desc}</p>

              <div className="mb-6">
                <span
                  className="text-xl sm:text-2xl font-bold"
                  style={{ color: plan.color }}
                >
                  {plan.price}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${plan.color}20` }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-300">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: plan.highlight
                    ? `linear-gradient(135deg, ${plan.color}, #0284c7)`
                    : 'rgba(255,255,255,0.05)',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.7)',
                  boxShadow: plan.highlight ? `0 4px 20px ${plan.color}30` : 'none',
                }}
              >
                Commencer
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
