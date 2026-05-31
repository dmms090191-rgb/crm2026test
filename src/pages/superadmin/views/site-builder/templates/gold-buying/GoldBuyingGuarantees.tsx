import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Eye, Award, BadgeCheck, Scale } from 'lucide-react';

const GUARANTEES = [
  { icon: ShieldCheck, title: '100% Garanti', desc: 'Satisfaction ou remboursement. Vous etes libre de refuser notre offre.' },
  { icon: Scale, title: 'Prix transparents', desc: 'Pesee de precision certifiee, tarifs bases sur le cours du jour officiel.' },
  { icon: Lock, title: 'Transaction securisee', desc: 'Paiement par cheque ou virement bancaire, traceabilite complete.' },
  { icon: Eye, title: 'Expertise devant vous', desc: 'Toutes les operations sont realisees sous vos yeux, sans intermediaire.' },
  { icon: Award, title: '15 ans d\'experience', desc: 'Societe Or Expert, specialiste reconnu dans le rachat de metaux precieux.' },
  { icon: BadgeCheck, title: 'Agrement douanes', desc: 'Garantie des douanes n21/066. SIRET : 893 848 846 00018.' },
];

interface Props {
  title?: string;
  subtitle?: string;
}

export default function GoldBuyingGuarantees({ title, subtitle }: Props = {}) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.getAttribute('data-guarantee'));
          if (!isNaN(idx)) setVisibleItems(prev => new Set(prev).add(idx));
        }
      });
    }, { threshold: 0.2 });

    const items = ref.current?.querySelectorAll('[data-guarantee]');
    items?.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0a0a0a, #0c0a06, #0a0a0a)' }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a017]/15 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#d4a017' }}>
            Confiance & Securite
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-3 mb-4 text-white/90">
            {title ? title : (
              <>Nos{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>garanties</span></>
            )}
          </h2>
          {subtitle && (
            <p className="text-sm text-white/40 max-w-lg mx-auto">{subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GUARANTEES.map((g, i) => {
            const isVisible = visibleItems.has(i);
            return (
              <div
                key={i}
                data-guarantee={i}
                className="relative rounded-2xl p-6 transition-all duration-700 group"
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110"
                  style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.12)' }}>
                  <g.icon className="w-5 h-5" style={{ color: '#d4a017' }} />
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-white/85">{g.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{g.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
