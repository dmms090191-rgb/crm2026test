import { useState, useEffect, useRef } from 'react';
import { Menu, X, Phone, LogIn, UserPlus } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Services', href: '#gold-services' },
  { label: 'Evenements', href: '#gold-events' },
  { label: 'Contact', href: '#gold-contact' },
];

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  brandName?: string;
  ctaText?: string;
}

export default function GoldBuyingNav({ onLogin, onRegister, brandName, ctaText }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scrollParent = navRef.current?.closest('[style*="overflow"], .overflow-y-auto, .overflow-auto') as HTMLElement | null;
    const target = scrollParent ?? window;
    const onScroll = () => {
      const y = scrollParent ? scrollParent.scrollTop : window.scrollY;
      setScrolled(y > 60);
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(212,160,23,0.1)' : '1px solid transparent',
      }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="text-base font-black text-white/80 tracking-tight">
          {brandName ? (
            <span className="text-transparent bg-clip-text" style={{
              background: 'linear-gradient(135deg, #f5d060, #d4a017)',
              WebkitBackgroundClip: 'text',
            }}>{brandName}</span>
          ) : (
            <>
              <span className="text-white/50">C</span>
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>O</span>
              <span className="text-white/50">R</span>
            </>
          )}
        </a>

        <div className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}
              className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors duration-300">
              {l.label}
            </a>
          ))}
          <a href="tel:0981222566"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300"
            style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)', color: '#d4a017' }}>
            <Phone className="w-3 h-3" />
            {ctaText || 'Appeler'}
          </a>

          <div className="h-4 w-px bg-white/10" />

          <button onClick={onLogin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)', color: '#d4a017' }}>
            <LogIn className="w-3.5 h-3.5" />
            Connexion
          </button>

          <button onClick={onRegister}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #d4a017, #b8860b)',
              color: '#0a0a0a',
              boxShadow: '0 0 15px rgba(212,160,23,0.15)',
            }}>
            <UserPlus className="w-3.5 h-3.5" />
            S'inscrire
          </button>
        </div>

        <button className="sm:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen
            ? <X className="w-5 h-5 text-white/60" />
            : <Menu className="w-5 h-5 text-white/60" />
          }
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden px-6 pb-4 space-y-2" style={{ background: 'rgba(10,10,10,0.95)' }}>
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-xs font-semibold text-white/50 transition-colors"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {l.label}
            </a>
          ))}
          <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <button onClick={() => { setMenuOpen(false); onLogin(); }}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(212,160,23,0.06)', color: '#d4a017' }}>
            <LogIn className="w-3.5 h-3.5" />
            Connexion
          </button>
          <button onClick={() => { setMenuOpen(false); onRegister(); }}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #d4a017, #b8860b)', color: '#0a0a0a' }}>
            <UserPlus className="w-3.5 h-3.5" />
            S'inscrire
          </button>
          <a href="tel:0981222566" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white/40"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Phone className="w-3.5 h-3.5" />
            09 81 22 25 66
          </a>
        </div>
      )}
    </nav>
  );
}
