import { ArrowRight, Leaf } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onScroll: (id: string) => void;
}

export default function RenewableFooter({ onLogin, onRegister, onScroll }: Props) {
  return (
    <>
      {/* CTA Section */}
      <section id="contact" className="relative py-20 sm:py-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ background: 'radial-gradient(ellipse at center, #10b981, transparent 70%)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-4">
            Pret a reduire vos factures et moderniser votre energie ?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto">
            Decrivez votre projet, recevez une premiere estimation et echangez avec un conseiller.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => onScroll('simulator')}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}>
              Demander un devis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={onRegister}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/[0.06]"
              style={{ border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              Creer mon espace
            </button>
            <button onClick={onLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/[0.06]"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              Connexion
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 12px rgba(16,185,129,0.3)' }}>
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Nova Energie</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Solutions d'energie renouvelable pour particuliers et professionnels. Accompagnement de A a Z.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Solutions</h4>
              <ul className="space-y-2">
                {['Panneaux solaires', 'Audit energetique', 'Renovation', 'Stockage'].map(l => (
                  <li key={l}><button onClick={() => onScroll('solutions')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">{l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Ressources</h4>
              <ul className="space-y-2">
                {['Devis gratuit', 'Simulateur', 'Espace client', 'Contact'].map(l => (
                  <li key={l}><button onClick={() => onScroll('simulator')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">{l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Compte</h4>
              <ul className="space-y-2">
                <li><button onClick={onLogin} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">Connexion</button></li>
                <li><button onClick={onRegister} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">Inscription</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-slate-600">
              &copy; {new Date().getFullYear()} Nova Energie. Tous droits reserves. Site de demonstration.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Mentions legales</span>
              <span className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Politique de confidentialite</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
