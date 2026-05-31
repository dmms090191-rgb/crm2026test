import { useState, useEffect, useRef } from 'react';
import { CreditCard as IdIcon, Search, Scale, Banknote } from 'lucide-react';

const STEPS = [
  { icon: IdIcon, num: '01', title: 'Presentez-vous', desc: 'Venez avec une piece d\'identite et vos objets en metaux precieux.', color: '#d4a017' },
  { icon: Search, num: '02', title: 'Evaluation gratuite', desc: 'Notre expert analyse et expertise vos biens gratuitement sur place.', color: '#f5d060' },
  { icon: Scale, num: '03', title: 'Estimation au juste prix', desc: 'Pesee de precision et estimation au cours du jour, transparente.', color: '#d4a017' },
  { icon: Banknote, num: '04', title: 'Paiement immediat', desc: 'Reglement par cheque ou virement bancaire. Immediat et securise.', color: '#f5d060' },
];

interface Props {
  title?: string;
  subtitle?: string;
}

export default function GoldBuyingProcess({ title, subtitle }: Props = {}) {
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.getAttribute('data-step'));
          if (!isNaN(idx)) setVisibleSteps(prev => new Set(prev).add(idx));
        }
      });
    }, { threshold: 0.3 });

    const items = sectionRef.current?.querySelectorAll('[data-step]');
    items?.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0a0a0a, #0d0b06, #0a0a0a)' }} />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a017]/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a017]/15 to-transparent" />

      <div ref={sectionRef} className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#d4a017' }}>
            La procedure est simple
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-3 mb-4 text-white/90">
            {title ? title : (
              <>Comment ca{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>fonctionne</span></>
            )}
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            {subtitle || '4 etapes simples pour valoriser vos metaux precieux au meilleur prix.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => {
            const isVisible = visibleSteps.has(i);
            return (
              <div
                key={i}
                data-step={i}
                className="relative text-center transition-all duration-700"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${i * 150}ms`,
                }}
              >
                <div className="relative mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${step.color}08, ${step.color}04)`,
                    border: `1px solid ${step.color}20`,
                    boxShadow: isVisible ? `0 0 30px ${step.color}10` : 'none',
                  }}>
                  <step.icon className="w-8 h-8" style={{ color: step.color }} />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
                    style={{ background: step.color, color: '#0a0a0a' }}>
                    {step.num}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px"
                    style={{
                      background: `linear-gradient(to right, ${step.color}30, transparent)`,
                      opacity: isVisible ? 1 : 0,
                      transition: 'opacity 1s',
                      transitionDelay: `${i * 150 + 300}ms`,
                    }} />
                )}

                <h3 className="text-sm font-bold mb-2 text-white/85">{step.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
