import { ArrowRight, Sparkles, LogIn } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export default function BarbieWellnessHero({ onLogin }: Props) {
  return (
    <>
      {/* ========== HERO ========== */}
      <header className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Holographic gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12) 0%, rgba(56,168,181,0.05) 30%, rgba(111,83,98,0.1) 60%, rgba(56,168,181,0.06) 100%)', animation: 'bw-iridescent 10s ease-in-out infinite' }} />

        {/* Aurora glow orbs */}
        <div className="absolute top-[-15%] right-[-8%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.2) 0%, rgba(56,168,181,0.05) 40%, transparent 70%)', animation: 'bw-aurora 12s ease-in-out infinite' }} />
        <div className="absolute bottom-[-10%] left-[-12%] w-[280px] h-[280px] sm:w-[450px] sm:h-[450px] lg:w-[650px] lg:h-[650px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.18) 0%, rgba(111,83,98,0.04) 40%, transparent 70%)', animation: 'bw-aurora 15s ease-in-out infinite reverse', animationDelay: '2s' }} />
        <div className="absolute top-[25%] left-[15%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.14) 0%, rgba(111,83,98,0.04) 50%, transparent 70%)', animation: 'bw-aurora 18s ease-in-out infinite', animationDelay: '4s' }} />
        <div className="absolute top-[60%] right-[20%] w-[180px] h-[180px] sm:w-[250px] sm:h-[250px] lg:w-[350px] lg:h-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.15) 0%, rgba(56,168,181,0.03) 40%, transparent 70%)', animation: 'bw-halo-breathe 8s ease-in-out infinite' }} />
        <div className="absolute top-[40%] right-[40%] w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] lg:w-[550px] lg:h-[550px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, rgba(111,83,98,0.06) 50%, transparent 70%)', animation: 'bw-aurora 20s ease-in-out infinite reverse', animationDelay: '3s' }} />

        {/* Iridescent sheen */}
        <div className="absolute inset-0 opacity-25"
          style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12) 0%, rgba(56,168,181,0.06) 25%, rgba(111,83,98,0.1) 50%, rgba(56,168,181,0.04) 75%, rgba(111,83,98,0.06) 100%)', backgroundSize: '400% 400%', animation: 'bw-gradient-shift 12s ease infinite' }} />

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 sm:h-48"
          style={{ background: 'linear-gradient(to top, rgba(188,224,229,0.4), transparent)' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="bw-animate-in mb-8 sm:mb-10 relative" style={{ animation: 'bw-float 6s ease-in-out infinite' }}>
            <div className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-full overflow-hidden p-1.5"
              style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.5), rgba(111,83,98,0.35), rgba(56,168,181,0.3))', boxShadow: '0 0 60px rgba(56,168,181,0.15), 0 0 120px rgba(111,83,98,0.06)' }}>
              <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a9aa8 0%, #38A8B5 15%, #4abbc8 30%, #7a8a90 45%, #8e6878 60%, #6F5362 75%, #7a5d6b 90%, #38A8B5 100%)', backgroundSize: '400% 400%', animation: 'bw-iridescent 6s ease infinite' }}>
                <img
                  src="/logo_BW_transparent_4K.png"
                  alt="Barbie Wellness"
                  className="w-full h-full object-contain"
                  style={{ filter: 'brightness(0) contrast(5)' }}
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #38A8B5, #6F5362)', boxShadow: '0 4px 20px rgba(56,168,181,0.3)' }}>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>

          {/* Badge */}
          <div className="bw-animate-in-d1 inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full mb-6 sm:mb-8"
            style={{ background: 'rgba(56,168,181,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(56,168,181,0.2)', boxShadow: '0 2px 16px rgba(56,168,181,0.06)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#38A8B5' }} />
            <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a8f96' }}>Bien-etre & Nutrition</span>
          </div>

          {/* Title */}
          <h1 className="bw-animate-in-d2 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight mb-6 sm:mb-8">
            <span className="block" style={{ color: '#3d4f5a' }}>TRANSFORMEZ-VOUS</span>
            <span className="block mt-1 sm:mt-2">
              <span style={{ color: '#3d4f5a' }}>AVEC </span>
              <span className="bw-gradient-text">BARBIE WELLNESS</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="bw-animate-in-d3 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12 font-light px-2" style={{ color: '#6b7f8a' }}>
            Barbie Wellness accompagne les femmes qui souhaitent ameliorer leur bien-etre,
            retrouver confiance en elles et decouvrir une activite independante
            dans l'univers de la nutrition et du wellness.
          </p>

          {/* CTA Buttons */}
          <div className="bw-animate-in-d4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <a href="#contact"
              className="group bw-btn-primary inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-white font-semibold text-sm tracking-wide transition-all duration-300 relative z-10">
              <span className="relative z-10 flex items-center gap-3">
                Etre accompagnee
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
            <button
              onClick={() => onLogin()}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300"
              style={{ background: '#6F5362', color: '#ffffff', boxShadow: '0 4px 20px rgba(111,83,98,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#7d5f70'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(111,83,98,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#6F5362'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(111,83,98,0.3)'; }}>
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 sm:mt-20 flex flex-col items-center gap-2" style={{ color: 'rgba(56,168,181,0.25)' }}>
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase">Decouvrir</span>
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(56,168,181,0.2), transparent)' }} />
          </div>
        </div>
      </header>
    </>
  );
}
