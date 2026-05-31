import { useState } from 'react';
import { Gem, Watch, Coins, CircleDollarSign, Crown, Landmark, Banknote, Diamond } from 'lucide-react';

const SERVICES = [
  { icon: Crown, title: 'Bijoux en or', desc: 'Anciens, modernes ou casses, nous rachetons tous vos bijoux en or.', accent: '#f5d060' },
  { icon: Gem, title: 'Bijoux en argent', desc: 'Bijoux, couverts, pieces d\'argenterie de toute epoque.', accent: '#c0c0c0' },
  { icon: Diamond, title: 'Pierres precieuses', desc: 'Diamants, rubis, saphirs et emeraudes expertises sur place.', accent: '#60d4f5' },
  { icon: Watch, title: 'Montres', desc: 'Montres anciennes et modernes, de marque ou en metaux precieux.', accent: '#f5d060' },
  { icon: Coins, title: 'Pieces de monnaie', desc: 'Pieces en or et en argent, de collection ou de bourse.', accent: '#d4a017' },
  { icon: Banknote, title: 'Billets de collection', desc: 'Billets de banques, de collection ou monnaie etrangere.', accent: '#16a34a' },
  { icon: Landmark, title: 'Lingots & Plaque or', desc: 'Lingots, plaque or, or dentaire et metal argente.', accent: '#f5d060' },
  { icon: CircleDollarSign, title: 'Etain & Platine', desc: 'Etain, platine et tous metaux precieux au cours du jour.', accent: '#a78bfa' },
];

interface Props {
  title?: string;
  subtitle?: string;
}

export default function GoldBuyingServices({ title, subtitle }: Props = {}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section id="gold-services" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0a06] to-[#0a0a0a]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#d4a017' }}>
            Ce que nous rachetons
          </span>
          <h2 data-studio-field="services-title" className="text-3xl sm:text-4xl font-black mt-3 mb-4 text-white/90">
            {title ? title : (
              <>Nous rachetons vos{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>metaux precieux</span></>
            )}
          </h2>
          <p data-studio-field="services-subtitle" className="text-sm text-white/40 max-w-lg mx-auto">
            {subtitle || 'Expertise gratuite et sans engagement. Paiement immediat par cheque ou virement bancaire.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={i}
                className="group relative rounded-2xl p-5 transition-all duration-500 cursor-default"
                style={{
                  background: isHovered
                    ? `linear-gradient(135deg, rgba(${s.accent === '#f5d060' ? '245,208,96' : s.accent === '#c0c0c0' ? '192,192,192' : s.accent === '#60d4f5' ? '96,212,245' : s.accent === '#d4a017' ? '212,160,23' : s.accent === '#16a34a' ? '22,163,106' : '167,139,250'},0.06), rgba(0,0,0,0))`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHovered ? s.accent + '30' : 'rgba(255,255,255,0.05)'}`,
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                  boxShadow: isHovered ? `0 20px 40px rgba(0,0,0,0.3), 0 0 20px ${s.accent}10` : 'none',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500"
                  style={{
                    background: `${s.accent}10`,
                    border: `1px solid ${s.accent}20`,
                    boxShadow: isHovered ? `0 0 20px ${s.accent}15` : 'none',
                  }}>
                  <s.icon className="w-5 h-5 transition-transform duration-500" style={{
                    color: s.accent,
                    transform: isHovered ? 'scale(1.15)' : 'none',
                  }} />
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-white/85">{s.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
