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
    <div className="min-h-full bg-[#050505] text-white selection:bg-pink-500/30 selection:text-white">
      <style>{`
        @keyframes bw-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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
        .bw-animate-in { animation: bw-fade-up 0.8s ease-out both; }
        .bw-animate-in-d1 { animation: bw-fade-up 0.8s ease-out 0.1s both; }
        .bw-animate-in-d2 { animation: bw-fade-up 0.8s ease-out 0.2s both; }
        .bw-animate-in-d3 { animation: bw-fade-up 0.8s ease-out 0.3s both; }
        .bw-animate-in-d4 { animation: bw-fade-up 0.8s ease-out 0.4s both; }
        .bw-glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .bw-glass-hover:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(236,72,153,0.2);
        }
        .bw-gradient-text {
          background: linear-gradient(135deg, #ec4899, #a855f7, #881337);
          background-size: 200% 200%;
          animation: bw-gradient-shift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bw-btn-primary {
          background: linear-gradient(135deg, #ec4899, #a855f7);
          box-shadow: 0 0 30px rgba(236,72,153,0.3), 0 0 60px rgba(168,85,247,0.1);
        }
        .bw-btn-primary:hover {
          box-shadow: 0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(168,85,247,0.2);
          transform: translateY(-2px);
        }
        .bw-glow-orb {
          animation: bw-glow-pulse 4s ease-in-out infinite;
        }
      `}</style>

      {/* ========== HERO ========== */}
      <header className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Orbs - scaled down on mobile */}
        <div className="absolute top-[-20%] right-[-10%] w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] rounded-full bw-glow-orb"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[220px] h-[220px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] rounded-full bw-glow-orb"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute top-[30%] left-[20%] w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] lg:w-[300px] lg:h-[300px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(136,19,55,0.1) 0%, transparent 70%)' }} />

        {/* Grid subtle */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center">
          {/* Photo */}
          <div className="bw-animate-in mb-8 sm:mb-10 relative" style={{ animation: 'bw-float 6s ease-in-out infinite' }}>
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-pink-500/30 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-600/20">
                <img
                  src="/logo_BW_transparent_4K.png"
                  alt="Barbie Wellness"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>

          {/* Badge */}
          <div className="bw-animate-in-d1 inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bw-glass border border-pink-500/20 mb-6 sm:mb-8">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-pink-300/90">Bien-etre & Nutrition</span>
          </div>

          {/* Title */}
          <h1 className="bw-animate-in-d2 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight mb-6 sm:mb-8">
            <span className="block text-white/95">TRANSFORMEZ-VOUS</span>
            <span className="block mt-1 sm:mt-2">
              <span className="text-white/95">AVEC </span>
              <span className="bw-gradient-text">BARBIE WELLNESS</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="bw-animate-in-d3 text-sm sm:text-base md:text-lg text-white/50 leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12 font-light px-2">
            Barbie Wellness accompagne les femmes qui souhaitent ameliorer leur bien-etre,
            retrouver confiance en elles et decouvrir une activite independante
            dans l'univers de la nutrition et du wellness.
          </p>

          {/* CTA Buttons */}
          <div className="bw-animate-in-d4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <a href="#contact"
              className="group bw-btn-primary inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-white font-semibold text-sm tracking-wide transition-all duration-300">
              Etre accompagnee
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <button
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bw-glass border-pink-500/15 text-white/80 font-semibold text-sm tracking-wide transition-all duration-300 hover:bg-white/[0.06] hover:border-pink-500/30 hover:text-white">
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 sm:mt-20 flex flex-col items-center gap-2 text-white/20">
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase">Decouvrir</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>
      </header>

      {/* ========== CE QUE JE FAIS ========== */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
        <div className="absolute top-[50%] right-[-5%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full bw-glow-orb"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)', animationDelay: '1s' }} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bw-glass border-pink-500/15 mb-5 sm:mb-6">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-pink-300/80">Notre approche</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 text-white/95">
              Un accompagnement{' '}
              <span className="bw-gradient-text">simple et humain</span>
            </h2>
            <p className="text-sm sm:text-base text-white/40 max-w-2xl mx-auto leading-relaxed font-light px-2 sm:px-0">
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
                  style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.05) 0%, rgba(168,85,247,0.03) 100%)' }} />
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-pink-500/15 to-purple-600/10 border border-pink-500/10 flex items-center justify-center text-pink-400 mb-4 sm:mb-5 group-hover:scale-110 group-hover:border-pink-500/25 transition-all duration-300">
                    {c.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-white/90 group-hover:text-white transition-colors">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-white/40 leading-relaxed group-hover:text-white/55 transition-colors">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== POUR QUI ========== */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(236,72,153,0.03) 0%, transparent 50%, rgba(168,85,247,0.02) 100%)' }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bw-glass border-purple-500/15 mb-5 sm:mb-6">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-purple-300/80">Pour qui</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white/95">
              A qui s'adresse{' '}
              <span className="bw-gradient-text">Barbie Wellness</span>
              <span className="text-white/95"> ?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {AUDIENCE.map((item, i) => (
              <div key={i}
                className="group flex items-start gap-3 sm:gap-4 rounded-xl p-4 sm:p-5 bw-glass bw-glass-hover transition-all duration-300">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/15 border border-pink-500/15 flex items-center justify-center mt-0.5 group-hover:border-pink-500/30 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
                </div>
                <span className="text-xs sm:text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors font-medium">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== REJOINDRE L'EQUIPE ========== */}
      <section id="equipe" className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-500/15 to-transparent" />
        <div className="absolute bottom-[20%] left-[-8%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] rounded-full bw-glow-orb"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', animationDelay: '3s' }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.05), rgba(136,19,55,0.06))' }} />
            <div className="absolute inset-0 bw-glass" />

            <div className="relative px-6 py-10 sm:p-14 lg:p-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6 sm:mb-8">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-pink-300/80">L'equipe</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-5 sm:mb-6 text-white/95 leading-tight">
                Envie de developper{' '}
                <span className="bw-gradient-text">votre activite</span>
                <span className="text-white/95"> ?</span>
              </h2>

              <p className="text-sm sm:text-base text-white/40 max-w-xl mx-auto leading-relaxed mb-4 sm:mb-5 font-light">
                Barbie Wellness forme et accompagne les femmes qui souhaitent apprendre
                a developper leur clientele, vendre des produits de nutrition et evoluer
                dans un environnement motivant.
              </p>
              <p className="text-sm sm:text-base text-white/40 max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10 font-light">
                Vous n'etes jamais seule : vous avancez avec le soutien de notre equipe
                et d'un accompagnement continu.
              </p>

              <a href="#contact"
                className="group bw-btn-primary inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-white font-semibold text-sm tracking-wide transition-all duration-300">
                En savoir plus
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT ========== */}
      <section id="contact" className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute top-[30%] right-[-10%] w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full bw-glow-orb"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bw-glass border-pink-500/15 mb-5 sm:mb-6">
              <Send className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-pink-300/80">Contact</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 text-white/95">
              Prete a{' '}
              <span className="bw-gradient-text">commencer</span>
              <span className="text-white/95"> ?</span>
            </h2>
            <p className="text-sm sm:text-base text-white/40 max-w-lg mx-auto leading-relaxed font-light px-2 sm:px-0">
              Laissez vos coordonnees et notre equipe vous recontactera personnellement.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl bw-glass p-8 sm:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/15 border border-pink-500/20 flex items-center justify-center mx-auto mb-5 sm:mb-6">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-pink-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white/90 mb-3">Message envoye</h3>
              <p className="text-xs sm:text-sm text-white/40">Merci ! Notre equipe vous recontactera tres prochainement.</p>
            </div>
          ) : (
            <div className="rounded-2xl bw-glass p-5 sm:p-8 md:p-10">
              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                      <User className="w-3 h-3" /> Nom
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Votre nom"
                      className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-pink-500/40 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                      <Phone className="w-3 h-3" /> Telephone
                    </label>
                    <input
                      type="tel"
                      value={form.tel}
                      onChange={e => setForm(p => ({ ...p, tel: e.target.value }))}
                      placeholder="06 12 34 56 78"
                      className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-pink-500/40 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="votre@email.com"
                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-pink-500/40 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                    <Sparkles className="w-3 h-3" /> Votre objectif
                  </label>
                  <textarea
                    value={form.objectif}
                    onChange={e => setForm(p => ({ ...p, objectif: e.target.value }))}
                    placeholder="Dites-nous ce que vous recherchez..."
                    rows={3}
                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm placeholder:text-white/20 focus:outline-none focus:border-pink-500/40 focus:bg-white/[0.06] transition-all resize-none"
                  />
                </div>
                <button
                  onClick={() => setSent(true)}
                  className="group w-full bw-btn-primary flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-300">
                  Etre recontactee
                  <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="relative border-t border-white/[0.04]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3">
              <img src="/logo_BW_transparent_4K.png" alt="Barbie Wellness" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <span className="text-sm sm:text-base font-bold text-white/80 tracking-tight">Barbie Wellness</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/25 tracking-widest uppercase font-medium">
              Bien-etre &bull; Nutrition &bull; Accompagnement
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
            <p className="text-[11px] text-white/15">
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