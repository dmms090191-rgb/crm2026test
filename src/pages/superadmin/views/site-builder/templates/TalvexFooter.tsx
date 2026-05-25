import { Zap, LogIn, UserPlus } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

const LINKS = [
  { title: 'Produit', items: ['Fonctionnalités', 'Secteurs', 'Templates', 'Tarifs'] },
  { title: 'Entreprise', items: ['À propos', 'Vision', 'Projets', 'Contact'] },
  { title: 'Support', items: ['Documentation', 'Demandes', 'Améliorations', 'Statut'] },
];

export default function TalvexFooter({ onLogin, onRegister }: Props) {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050a14]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">Talvex</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 max-w-[200px]">
              La plateforme tout-en-un pour gérer et faire évoluer votre entreprise locale.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#0ea5e9' }}
              >
                <LogIn className="w-3 h-3" />
                Connexion
              </button>
              <button
                onClick={onRegister}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-105 bg-gradient-to-r from-sky-500 to-cyan-500 text-white"
              >
                <UserPlus className="w-3 h-3" />
                Inscription
              </button>
            </div>
          </div>

          {/* Link columns */}
          {LINKS.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j}>
                    <span className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] sm:text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Talvex. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">Confidentialité</span>
            <span className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">Conditions</span>
            <span className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">Mentions légales</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
