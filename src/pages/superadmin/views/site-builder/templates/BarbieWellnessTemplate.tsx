import { useState } from 'react';
import { ArrowRight, Sparkles, Heart, Users, Gem, CheckCircle2, Send, Phone, Mail, User, LogIn } from 'lucide-react';
import TalvexLoginModal from './TalvexLoginModal';
import { getSiteModalTheme } from './siteModalTheme';

const CARDS = [
  {
    icon: <Gem className="w-6 h-6" />,
    title: 'Bien-etre',
    desc: 'Retrouver energie et equilibre au quotidien grace a un accompagnement adapte a vos besoins.',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Accompagnement',
    desc: 'Un suivi personnalise et motivant pour atteindre vos objectifs pas a pas.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Opportunite',
    desc: 'Developper une activite independante au sein d\'une equipe bienveillante et motivante.',
  },
];

const AUDIENCE = [
  'Femmes souhaitant retrouver la forme',
  'Femmes cherchant un accompagnement personnalise',
  'Femmes voulant gagner un revenu complementaire',
  'Femmes souhaitant rejoindre une equipe dynamique',
];

export default function BarbieWellnessTemplate() {
  const [form, setForm] = useState({ nom: '', tel: '', email: '', objectif: '' });
  const [sent, setSent] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const bwTheme = getSiteModalTheme('barbie_wellness');

  const handleLogin = () => {
    setLoginOpen(false);
    window.location.href = '/';
  };

  return (
    <div className="min-h-full selection:bg-[#38A8B5]/30 selection:text-white" style={{ background: 'linear-gradient(160deg, #e8f4f6 0%, #d4eef1 8%, #bfe5e9 16%, #c8dde0 24%, #d5cfd3 34%, #c9b8c0 44%, #b8a0ac 52%, #c4b5bc 60%, #d0d8db 68%, #bce0e5 76%, #a8d5dc 84%, #c5e3e8 92%, #e0f0f3 100%)' }}>
      <style>{`
        @keyframes bw-aurora {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.45; }
          33% { transform: translate(30px, -20px) scale(1.1) rotate(2deg); opacity: 0.6; }
          66% { transform: translate(-20px, 15px) scale(0.95) rotate(-1deg); opacity: 0.4; }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.45; }
        }
        @keyframes bw-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bw-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes bw-fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bw-shimmer {
          0% { transform: translateX(-100%) rotate(15deg); }
          100% { transform: translateX(100%) rotate(15deg); }
        }
        @keyframes bw-halo-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.06); }
        }
        @keyframes bw-iridescent {
          0% { opacity: 0.12; filter: hue-rotate(0deg); }
          50% { opacity: 0.2; filter: hue-rotate(8deg); }
          100% { opacity: 0.12; filter: hue-rotate(0deg); }
        }
        .bw-animate-in { animation: bw-fade-up 0.8s ease-out both; }
        .bw-animate-in-d1 { animation: bw-fade-up 0.8s ease-out 0.1s both; }
        .bw-animate-in-d2 { animation: bw-fade-up 0.8s ease-out 0.2s both; }
        .bw-animate-in-d3 { animation: bw-fade-up 0.8s ease-out 0.3s both; }
        .bw-animate-in-d4 { animation: bw-fade-up 0.8s ease-out 0.4s both; }
        .bw-glass {
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(56,168,181,0.15);
          box-shadow: 0 4px 24px rgba(56,168,181,0.06), 0 1px 0 rgba(255,255,255,0.5) inset;
        }
        .bw-glass-hover:hover {
          background: rgba(255,255,255,0.55);
          border-color: rgba(56,168,181,0.25);
          box-shadow: 0 8px 32px rgba(56,168,181,0.1), 0 1px 0 rgba(255,255,255,0.6) inset;
        }
        .bw-gradient-text {
          background: linear-gradient(135deg, #2a9aa8, #8e6878, #38A8B5);
          background-size: 200% 200%;
          animation: bw-gradient-shift 5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bw-btn-primary {
          background: linear-gradient(135deg, #38A8B5, #7a5d6b, #38A8B5);
          background-size: 200% 200%;
          animation: bw-gradient-shift 5s ease infinite;
          box-shadow: 0 4px 24px rgba(56,168,181,0.25), 0 2px 8px rgba(111,83,98,0.15);
          position: relative;
          overflow: hidden;
        }
        .bw-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: bw-shimmer 3s ease-in-out infinite;
        }
        .bw-btn-primary:hover {
          box-shadow: 0 8px 40px rgba(56,168,181,0.35), 0 4px 16px rgba(111,83,98,0.2);
          transform: translateY(-2px);
        }
        .bw-input {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(56,168,181,0.12);
          color: #3d4f5a;
        }
        .bw-input::placeholder { color: rgba(111,83,98,0.4); }
        .bw-input:focus {
          border-color: rgba(56,168,181,0.4);
          background: rgba(255,255,255,0.65);
          box-shadow: 0 0 20px rgba(56,168,181,0.08);
          outline: none;
        }
      `}</style>

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
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden p-1"
              style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.5), rgba(111,83,98,0.35), rgba(56,168,181,0.3))', boxShadow: '0 0 60px rgba(56,168,181,0.15), 0 0 120px rgba(111,83,98,0.06)' }}>
              <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a9aa8 0%, #38A8B5 15%, #4abbc8 30%, #7a8a90 45%, #8e6878 60%, #6F5362 75%, #7a5d6b 90%, #38A8B5 100%)', backgroundSize: '400% 400%', animation: 'bw-iridescent 6s ease infinite' }}>
                <img
                  src="/logo_BW_transparent_4K.png"
                  alt="Barbie Wellness"
                  className="w-full h-full object-contain"
                  style={{ filter: 'brightness(0.15) contrast(1.8)' }}
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
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
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(56,168,181,0.18)', color: '#4a6b73', boxShadow: '0 2px 16px rgba(56,168,181,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(56,168,181,0.35)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,168,181,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(56,168,181,0.18)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(56,168,181,0.06)'; }}>
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

      {/* ========== CE QUE NOUS FAISONS ========== */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.2), rgba(111,83,98,0.15), transparent)' }} />
        <div className="absolute top-[40%] right-[-8%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, transparent 70%)', animation: 'bw-halo-breathe 10s ease-in-out infinite' }} />
        <div className="absolute bottom-[20%] left-[-5%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.08) 0%, transparent 70%)', animation: 'bw-halo-breathe 13s ease-in-out infinite reverse' }} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 sm:mb-6"
              style={{ background: 'rgba(56,168,181,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,168,181,0.15)' }}>
              <Heart className="w-3.5 h-3.5" style={{ color: '#38A8B5' }} />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a8f96' }}>Notre approche</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5" style={{ color: '#3d4f5a' }}>
              Un accompagnement{' '}
              <span className="bw-gradient-text">simple et humain</span>
            </h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light px-2 sm:px-0" style={{ color: '#7a8e98' }}>
              Chez Barbie Wellness, chaque femme avance a son rythme.
              Que vous souhaitiez ameliorer votre bien-etre, retrouver de l'energie
              ou decouvrir une nouvelle activite, notre equipe vous accompagne
              etape par etape avec des conseils personnalises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {CARDS.map((c, i) => (
              <div key={i}
                className="group relative rounded-2xl p-5 sm:p-7 bw-glass bw-glass-hover transition-all duration-500 cursor-default">
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.06) 0%, rgba(111,83,98,0.03) 100%)' }} />
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-all duration-300"
                    style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12), rgba(111,83,98,0.06))', border: '1px solid rgba(56,168,181,0.15)', color: '#2a9aa8' }}>
                    {c.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3" style={{ color: '#3d4f5a' }}>{c.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#7a8e98' }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== POUR QUI ========== */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(111,83,98,0.05) 30%, rgba(56,168,181,0.04) 70%, transparent 100%)' }} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(111,83,98,0.15), rgba(56,168,181,0.12), transparent)' }} />
        <div className="absolute top-[30%] left-[-5%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, transparent 70%)', animation: 'bw-halo-breathe 12s ease-in-out infinite reverse' }} />
        <div className="absolute bottom-[15%] right-[-8%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.08) 0%, transparent 70%)', animation: 'bw-halo-breathe 15s ease-in-out infinite' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 sm:mb-6"
              style={{ background: 'rgba(111,83,98,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(111,83,98,0.12)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#7a5d6b' }} />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#8e6878' }}>Pour qui</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: '#3d4f5a' }}>
              A qui s'adresse{' '}
              <span className="bw-gradient-text">Barbie Wellness</span>
              <span style={{ color: '#3d4f5a' }}> ?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {AUDIENCE.map((item, i) => (
              <div key={i}
                className="group flex items-start gap-3 sm:gap-4 rounded-xl p-4 sm:p-5 bw-glass bw-glass-hover transition-all duration-300">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mt-0.5 transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12), rgba(111,83,98,0.06))', border: '1px solid rgba(56,168,181,0.15)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#38A8B5' }} />
                </div>
                <span className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: '#4e6068' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== REJOINDRE L'EQUIPE ========== */}
      <section id="equipe" className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.12), transparent)' }} />
        <div className="absolute bottom-[20%] left-[-8%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.1) 0%, transparent 70%)', animation: 'bw-halo-breathe 14s ease-in-out infinite' }} />
        <div className="absolute top-[10%] right-[-5%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, transparent 70%)', animation: 'bw-aurora 16s ease-in-out infinite' }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.08), rgba(111,83,98,0.05), rgba(56,168,181,0.04))', backdropFilter: 'blur(24px)', border: '1px solid rgba(56,168,181,0.12)', boxShadow: '0 8px 48px rgba(56,168,181,0.06), 0 0 40px rgba(111,83,98,0.03), 0 1px 0 rgba(255,255,255,0.3) inset' }}>
            <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
              <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.06) 0%, transparent 70%)' }} />
              <div className="absolute -bottom-16 -left-16 w-[250px] h-[250px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.05) 0%, transparent 70%)' }} />
            </div>

            <div className="relative px-6 py-10 sm:p-14 lg:p-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 sm:mb-8"
                style={{ background: 'rgba(56,168,181,0.08)', border: '1px solid rgba(56,168,181,0.15)' }}>
                <Users className="w-3.5 h-3.5" style={{ color: '#38A8B5' }} />
                <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a8f96' }}>L'equipe</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-5 sm:mb-6 leading-tight" style={{ color: '#3d4f5a' }}>
                Envie de developper{' '}
                <span className="bw-gradient-text">votre activite</span>
                <span style={{ color: '#3d4f5a' }}> ?</span>
              </h2>

              <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-4 sm:mb-5 font-light" style={{ color: '#7a8e98' }}>
                Barbie Wellness forme et accompagne les femmes qui souhaitent apprendre
                a developper leur clientele, vendre des produits de nutrition et evoluer
                dans un environnement motivant.
              </p>
              <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10 font-light" style={{ color: '#7a8e98' }}>
                Vous n'etes jamais seule : vous avancez avec le soutien de notre equipe
                et d'un accompagnement continu.
              </p>

              <a href="#contact"
                className="group bw-btn-primary inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-white font-semibold text-sm tracking-wide transition-all duration-300 relative z-10">
                <span className="relative z-10 flex items-center gap-3">
                  En savoir plus
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT ========== */}
      <section id="contact" className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.15), rgba(111,83,98,0.1), transparent)' }} />
        <div className="absolute top-[30%] right-[-10%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[450px] lg:h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, transparent 70%)', animation: 'bw-halo-breathe 10s ease-in-out infinite' }} />
        <div className="absolute bottom-[10%] left-[-8%] w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] lg:w-[380px] lg:h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.08) 0%, transparent 70%)', animation: 'bw-aurora 14s ease-in-out infinite reverse' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 sm:mb-6"
              style={{ background: 'rgba(56,168,181,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,168,181,0.15)' }}>
              <Send className="w-3.5 h-3.5" style={{ color: '#38A8B5' }} />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a8f96' }}>Contact</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5" style={{ color: '#3d4f5a' }}>
              Prete a{' '}
              <span className="bw-gradient-text">commencer</span>
              <span style={{ color: '#3d4f5a' }}> ?</span>
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-light px-2 sm:px-0" style={{ color: '#7a8e98' }}>
              Laissez vos coordonnees et notre equipe vous recontactera personnellement.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl bw-glass p-8 sm:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12), rgba(111,83,98,0.06))', border: '1px solid rgba(56,168,181,0.15)' }}>
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: '#38A8B5' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3" style={{ color: '#3d4f5a' }}>Message envoye</h3>
              <p className="text-xs sm:text-sm" style={{ color: '#7a8e98' }}>Merci ! Notre equipe vous recontactera tres prochainement.</p>
            </div>
          ) : (
            <div className="rounded-2xl bw-glass p-5 sm:p-8 md:p-10">
              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                      <User className="w-3 h-3" /> Nom
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Votre nom"
                      className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                      <Phone className="w-3 h-3" /> Telephone
                    </label>
                    <input
                      type="tel"
                      value={form.tel}
                      onChange={e => setForm(p => ({ ...p, tel: e.target.value }))}
                      placeholder="06 12 34 56 78"
                      className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="votre@email.com"
                    className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                    <Sparkles className="w-3 h-3" /> Votre objectif
                  </label>
                  <textarea
                    value={form.objectif}
                    onChange={e => setForm(p => ({ ...p, objectif: e.target.value }))}
                    placeholder="Dites-nous ce que vous recherchez..."
                    rows={3}
                    className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all resize-none"
                  />
                </div>
                <button
                  onClick={() => setSent(true)}
                  className="group w-full bw-btn-primary flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-300 relative z-10">
                  <span className="relative z-10 flex items-center gap-3">
                    Etre recontactee
                    <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="relative" style={{ borderTop: '1px solid rgba(56,168,181,0.06)' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.12), rgba(111,83,98,0.08), transparent)' }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3">
              <img src="/logo_BW_transparent_4K.png" alt="Barbie Wellness" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <span className="text-sm sm:text-base font-bold tracking-tight" style={{ color: '#3d4f5a' }}>Barbie Wellness</span>
            </div>
            <p className="text-[10px] sm:text-xs tracking-widest uppercase font-medium" style={{ color: '#8ea0aa' }}>
              Bien-etre &bull; Nutrition &bull; Accompagnement
            </p>
            <div className="w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.15), transparent)' }} />
            <p className="text-[11px]" style={{ color: '#a0b0b8' }}>
              &copy; {new Date().getFullYear()} Barbie Wellness. Tous droits reserves.
            </p>
          </div>
        </div>
      </footer>
      <TalvexLoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        theme={bwTheme}
      />
    </div>
  );
}
