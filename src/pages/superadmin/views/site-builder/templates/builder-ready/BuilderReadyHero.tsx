import { ArrowRight, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  title?: string;
  subtitle?: string;
  cta1Text?: string;
  cta1Link?: string;
  cta2Text?: string;
  cta2Link?: string;
}

const STATS = [
  { value: '500+', label: 'Clients actifs' },
  { value: '99.9%', label: 'Disponibilite' },
  { value: '24h', label: 'Support reactif' },
];

export default function BuilderReadyHero({
  onLogin, onRegister, title, subtitle, cta1Text, cta1Link, cta2Text, cta2Link,
}: Props) {
  const headingText = title || 'Votre entreprise, votre vitrine';
  const subText = subtitle || 'Creez une presence en ligne professionnelle en quelques minutes. Simple, rapide et entierement personnalisable.';
  const btn1 = cta1Text || 'Commencer maintenant';
  const btn2 = cta2Text || 'En savoir plus';

  return (
    <header className="relative overflow-hidden" style={{ minHeight: 'max(100vh, 600px)' }}>
      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0c1220 40%, #111827 100%)' }} />

      {/* Ambient glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] lg:w-[700px] lg:h-[700px] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 65%)' }} />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] lg:w-[600px] lg:h-[600px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 65%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 60%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 flex flex-col" style={{ minHeight: 'max(100vh, 600px)' }}>
        {/* Nav */}
        <nav className="flex items-center justify-between py-4 sm:py-5 lg:py-6">
          <span className="text-base sm:text-lg font-bold text-white/90 tracking-tight">Talvex</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-[11px] sm:text-xs font-semibold transition-all active:scale-95 hover:bg-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connexion</span>
            </button>
            <button onClick={onRegister}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-[11px] sm:text-xs font-bold transition-all active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inscription</span>
            </button>
          </div>
        </nav>

        {/* Hero body */}
        <div className="flex-1 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 py-10 sm:py-14 lg:py-0">
          {/* Left text */}
          <div className="flex-1 text-center lg:text-left flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 lg:mb-8 self-center lg:self-start"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>
                Template Builder Ready
              </span>
            </div>

            <h1
              data-studio-field="hero-title"
              className="font-black leading-[1.05] tracking-tight text-white"
              style={{ fontSize: 'clamp(2rem, 5.5vw, 4rem)' }}
            >
              {headingText}
            </h1>

            <p
              data-studio-field="hero-subtitle"
              className="mt-5 sm:mt-6 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {subText}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-8 sm:mt-10 lg:justify-start justify-center">
              <a data-studio-field="hero-cta1_text" href={cta1Link || '#contact'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-sm sm:text-[15px] font-bold transition-all active:scale-95 hover:brightness-110 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 4px 24px rgba(14,165,233,0.35)' }}>
                {btn1}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a data-studio-field="hero-cta2_text" href={cta2Link || '#services'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-sm sm:text-[15px] font-semibold transition-all active:scale-95 hover:bg-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {btn2}
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mt-8 sm:mt-10 lg:justify-start justify-center">
              {['100% personnalisable', 'Mobile-first', 'Publication instantanee'].map(badge => (
                <span key={badge} className="flex items-center gap-1.5 text-[11px] sm:text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right visual */}
          <div className="flex-shrink-0 w-full max-w-sm sm:max-w-md lg:max-w-lg lg:w-[45%]">
            <div className="relative w-full aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(14,165,233,0.06), rgba(16,185,129,0.04), rgba(14,165,233,0.02))',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 60px rgba(14,165,233,0.06)',
              }}>
              {/* Mock dashboard UI */}
              <div className="absolute inset-0 p-4 sm:p-6">
                {/* Top bar */}
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(245,158,11,0.5)' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
                  </div>
                  <div className="flex-1 h-5 rounded-md ml-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
                {/* Content blocks */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {STATS.map(s => (
                    <div key={s.label} className="rounded-lg sm:rounded-xl p-2.5 sm:p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm sm:text-lg font-black" style={{ color: '#0ea5e9' }}>{s.value}</p>
                      <p className="text-[8px] sm:text-[9px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="rounded-lg sm:rounded-xl flex-1 h-[40%]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-end justify-around h-full px-3 sm:px-4 pb-3 sm:pb-4 pt-6 sm:pt-8 gap-1.5 sm:gap-2">
                    {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm sm:rounded-t" style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, rgba(14,165,233,${0.15 + i * 0.05}), rgba(14,165,233,0.05))`,
                        border: '1px solid rgba(14,165,233,0.15)',
                        borderBottom: 'none',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}
