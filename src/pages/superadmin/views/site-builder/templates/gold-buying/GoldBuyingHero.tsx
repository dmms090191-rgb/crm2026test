import { useState, useEffect } from 'react';
import { Phone, ArrowDown, Shield, Award, Banknote, LogIn, UserPlus } from 'lucide-react';

const TRUST_BADGES = [
  { icon: Shield, label: 'Expertise gratuite' },
  { icon: Banknote, label: 'Paiement immediat' },
  { icon: Award, label: '100% garanti' },
];

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  title?: string;
  subtitle?: string;
  cta1Text?: string;
  cta2Text?: string;
}

export default function GoldBuyingHero({ onLogin, onRegister, title, subtitle, cta1Text, cta2Text }: Props) {
  const [goldPrice, setGoldPrice] = useState(82.45);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const interval = setInterval(() => {
      setGoldPrice(prev => {
        const delta = (Math.random() - 0.35) * 0.12;
        const next = Math.max(80, Math.min(86, prev + delta));
        setPriceDirection(next >= prev ? 'up' : 'down');
        return Math.round(next * 100) / 100;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]" />

      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #d4a017, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #c9a84c, transparent 70%)' }} />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a017]/30 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full mb-8"
          style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.15)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: priceDirection === 'up' ? '#16a34a' : '#ef4444' }} />
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#d4a017' }}>
            Cours de l'or : {goldPrice.toFixed(2)} EUR/g
          </span>
          <span className="text-[10px]" style={{ color: priceDirection === 'up' ? '#16a34a' : '#ef4444' }}>
            {priceDirection === 'up' ? '+0.8%' : '-0.2%'}
          </span>
        </div>

        <div className="mb-3">
          <span className="text-sm font-semibold tracking-[0.3em] uppercase" style={{ color: 'rgba(212,160,23,0.5)' }}>
            Expert specialiste en metaux precieux
          </span>
        </div>

        <h1 data-studio-field="hero-title" className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] mb-6 tracking-tight">
          {title ? (
            <span className="block" style={{
              background: 'linear-gradient(135deg, #f5d060 0%, #d4a017 30%, #b8860b 60%, #f5d060 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(212,160,23,0.3))',
            }}>
              {title}
            </span>
          ) : (
            <>
              <span className="block text-white/90">COMPAGNIE</span>
              <span className="block text-white/60 text-3xl sm:text-4xl font-light tracking-[0.2em] my-2">de l'</span>
              <span className="block" style={{
                background: 'linear-gradient(135deg, #f5d060 0%, #d4a017 30%, #b8860b 60%, #f5d060 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 40px rgba(212,160,23,0.3))',
              }}>
                OR
              </span>
            </>
          )}
        </h1>

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4a017]/40" />
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#002395' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffffff' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ED2939' }} />
          </div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4a017]/40" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-3 text-white/80">
          Achat d'
          <span className="text-transparent bg-clip-text" style={{
            background: 'linear-gradient(135deg, #f5d060, #d4a017)',
            WebkitBackgroundClip: 'text',
          }}>Or</span>, d'
          <span className="text-transparent bg-clip-text" style={{
            background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)',
            WebkitBackgroundClip: 'text',
          }}>Argent</span>, Bijoux & Pieces
        </h2>

        <p data-studio-field="hero-subtitle" className="text-base text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
          {subtitle || 'Expertise gratuite, paiement immediat, prix au cours du jour. Plus de 15 ans d\'experience dans le rachat de metaux precieux.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a data-studio-field="hero-cta1_text" href="tel:0981222566"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #d4a017, #b8860b)',
              color: '#0a0a0a',
              boxShadow: '0 0 30px rgba(212,160,23,0.2), 0 8px 32px rgba(0,0,0,0.4)',
            }}>
            <Phone className="w-4 h-4 group-hover:animate-pulse" />
            {cta1Text || '09 81 22 25 66'}
          </a>
          <button
            data-studio-field="hero-cta2_text"
            onClick={() => document.getElementById('gold-services')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(212,160,23,0.2)',
              color: '#d4a017',
            }}>
            {cta2Text || 'Decouvrir nos services'}
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <button onClick={onLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)', color: '#d4a017' }}>
            <LogIn className="w-3.5 h-3.5" />
            Espace client
          </button>
          <div className="h-4 w-px bg-white/10" />
          <button onClick={onRegister}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(184,134,11,0.1))',
              border: '1px solid rgba(212,160,23,0.25)',
              color: '#f5d060',
            }}>
            <UserPlus className="w-3.5 h-3.5" />
            Creer un compte
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {TRUST_BADGES.map(b => (
            <div key={b.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.1)' }}>
              <b.icon className="w-4 h-4" style={{ color: '#d4a017' }} />
              <span className="text-xs font-semibold text-white/60">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ArrowDown className="w-5 h-5" style={{ color: 'rgba(212,160,23,0.3)' }} />
      </div>
    </header>
  );
}
