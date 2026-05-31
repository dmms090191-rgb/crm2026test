import { useState, useEffect, useRef } from 'react';
import { Gift, TrendingUp, Sparkles } from 'lucide-react';

const OFFERS = [
  { threshold: '50g d\'or', bonus: '100', color: '#d4a017' },
  { threshold: '100g d\'or', bonus: '250', color: '#f5d060' },
  { threshold: '250g d\'or + 1kg d\'argent', bonus: '500', color: '#d4a017' },
];

function AnimatedCounter({ target, visible }: { target: number; visible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 30);
    return () => clearInterval(timer);
  }, [visible, target]);

  return <span>{count}</span>;
}

interface Props {
  title?: string;
  subtitle?: string;
}

export default function GoldBuyingOffers({ title, subtitle }: Props = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0a0a0a, #100d06, #0a0a0a)' }} />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.15)' }}>
            <Gift className="w-4 h-4" style={{ color: '#d4a017' }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: '#d4a017' }}>Offres speciales</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white/90">
            {title ? title : (
              <>Bonus{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>exceptionnels</span></>
            )}
          </h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto">
            {subtitle || 'Le cours de l\'or est a la hausse. Profitez-en maintenant avec nos offres speciales.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-10 mx-auto"
          style={{ background: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)', display: 'flex', width: 'fit-content', margin: '0 auto 40px' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#16a34a' }} />
          <span className="text-xs font-bold" style={{ color: '#16a34a' }}>Le cours de l'or est a la hausse</span>
          <Sparkles className="w-3 h-3" style={{ color: '#16a34a' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {OFFERS.map((offer, i) => (
            <div
              key={i}
              className="relative rounded-2xl p-6 text-center transition-all duration-700"
              style={{
                background: `linear-gradient(135deg, ${offer.color}06, rgba(0,0,0,0))`,
                border: `1px solid ${offer.color}20`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transitionDelay: `${i * 200}ms`,
              }}
            >
              {i === 2 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black"
                  style={{ background: '#d4a017', color: '#0a0a0a' }}>
                  MEILLEURE OFFRE
                </div>
              )}
              <p className="text-xs font-semibold text-white/50 mb-4 mt-2">Pour l'achat de</p>
              <p className="text-sm font-bold text-white/80 mb-6">{offer.threshold}</p>
              <div className="text-5xl font-black mb-2" style={{ color: offer.color }}>
                <AnimatedCounter target={parseInt(offer.bonus)} visible={isVisible} />
                <span className="text-2xl ml-1">EUR</span>
              </div>
              <p className="text-sm font-bold" style={{ color: offer.color }}>OFFERTS</p>
              <p className="text-[10px] text-white/30 mt-3">Offre non cumulable</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
