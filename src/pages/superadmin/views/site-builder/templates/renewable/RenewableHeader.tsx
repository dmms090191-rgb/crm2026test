import { useState, useEffect } from 'react';
import { Leaf, Menu, X, LogIn, UserPlus, ArrowRight } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onScroll: (id: string) => void;
}

const NAV = [
  { label: 'Accueil', target: 'hero' },
  { label: 'Solutions', target: 'solutions' },
  { label: 'Avantages', target: 'avantages' },
  { label: 'Simulation', target: 'simulator' },
  { label: 'Temoignages', target: 'temoignages' },
  { label: 'Contact', target: 'contact' },
];

export default function RenewableHeader({ onLogin, onRegister, onScroll }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const container = document.getElementById('renewable-scroll-root');
    if (!container) return;
    const handle = () => setScrolled(container.scrollTop > 30);
    container.addEventListener('scroll', handle, { passive: true });
    return () => container.removeEventListener('scroll', handle);
  }, []);

  const handleNav = (target: string) => {
    onScroll(target);
    setMobileOpen(false);
  };

  return (
    <div className="sticky top-0 left-0 right-0 z-50">
      <header className="transition-all duration-300"
        style={{
          background: scrolled || mobileOpen ? 'rgba(3,7,18,0.88)' : 'transparent',
          backdropFilter: scrolled || mobileOpen ? 'blur(20px) saturate(1.4)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <button onClick={() => handleNav('hero')} className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 12px rgba(16,185,129,0.25)' }}>
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white hidden sm:inline">Nova Energie</span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV.map(item => (
                <button key={item.target} onClick={() => handleNav(item.target)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all">
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Desktop actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button onClick={onLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:bg-white/[0.06]"
                style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <LogIn className="w-3 h-3" />
                Connexion
              </button>
              <button onClick={onRegister}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:bg-emerald-500/15"
                style={{ color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                <UserPlus className="w-3 h-3" />
                Inscription
              </button>
              <button onClick={() => handleNav('simulator')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 12px rgba(16,185,129,0.25)' }}>
                Devis gratuit
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="lg:hidden rounded-b-2xl overflow-hidden"
          style={{ background: 'rgba(10,15,30,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-4 space-y-1">
            {NAV.map(item => (
              <button key={item.target} onClick={() => handleNav(item.target)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all">
                {item.label}
              </button>
            ))}
            <div className="pt-3 mt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { onLogin(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <LogIn className="w-4 h-4" />
                Connexion
              </button>
              <button onClick={() => { onRegister(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                <UserPlus className="w-4 h-4" />
                Inscription
              </button>
              <button onClick={() => { handleNav('simulator'); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 12px rgba(16,185,129,0.25)' }}>
                Devis gratuit
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}