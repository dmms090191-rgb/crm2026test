import { Heart, CheckCircle2 } from 'lucide-react';
import { CARDS, AUDIENCE } from './barbieWellnessData';

export default function BarbieWellnessServices() {
  return (
    <>
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
    </>
  );
}
