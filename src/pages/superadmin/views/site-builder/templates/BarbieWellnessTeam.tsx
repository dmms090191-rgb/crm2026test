import { ArrowRight, Users } from 'lucide-react';

export default function BarbieWellnessTeam() {
  return (
    <>
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
    </>
  );
}
