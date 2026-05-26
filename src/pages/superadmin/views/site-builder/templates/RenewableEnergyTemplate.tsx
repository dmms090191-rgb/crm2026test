import { useState, useCallback } from 'react';
import TalvexLoginModal from './TalvexLoginModal';
import TalvexRegisterModal from './TalvexRegisterModal';
import { getSiteModalTheme } from './siteModalTheme';
import RenewableHeader from './renewable/RenewableHeader';
import RenewableHero from './renewable/RenewableHero';
import RenewableStats from './renewable/RenewableStats';
import RenewableSolutions from './renewable/RenewableSolutions';
import RenewableSimulator from './renewable/RenewableSimulator';
import RenewableProcess from './renewable/RenewableProcess';
import RenewableAdvantages from './renewable/RenewableAdvantages';
import RenewableClientSpace from './renewable/RenewableClientSpace';
import RenewableTrust from './renewable/RenewableTrust';
import RenewableFooter from './renewable/RenewableFooter';
import type { SitePageProps } from './templateRegistry';

const RENEWABLE_MODAL_THEME = getSiteModalTheme('renewable_energy');

export default function RenewableEnergyTemplate(props: SitePageProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const brandName = props.companyName || 'Nova Energie';

  const handleLogin = () => {
    window.location.href = '/';
  };

  const handleOpenLogin = () => setLoginOpen(true);
  const handleOpenRegister = () => setRegisterOpen(true);

  const handleScroll = useCallback((id: string) => {
    const container = document.getElementById('renewable-scroll-root');
    const el = document.getElementById(id);
    if (!container || !el) return;
    const top = el.offsetTop - container.offsetTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: '#030712' }}>
      <div id="renewable-scroll-root" className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <RenewableHeader onLogin={handleOpenLogin} onRegister={handleOpenRegister} onScroll={handleScroll} brandName={brandName} />
        <RenewableHero onLogin={handleOpenLogin} onRegister={handleOpenRegister} onScroll={handleScroll} subtitle={props.subtitle} welcomeMessage={props.welcomeMessage} />
        <RenewableStats />
        <RenewableSolutions />
        <RenewableSimulator onRegister={handleOpenRegister} />
        <RenewableProcess />
        <RenewableAdvantages />
        <RenewableClientSpace brandName={brandName} />
        <RenewableTrust />
        <RenewableFooter onLogin={handleOpenLogin} onRegister={handleOpenRegister} onScroll={handleScroll} brandName={brandName} />
      </div>

      <TalvexLoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} onRegister={() => { setLoginOpen(false); setRegisterOpen(true); }} theme={RENEWABLE_MODAL_THEME} />
      <TalvexRegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} onBackToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }} theme={RENEWABLE_MODAL_THEME} />
    </div>
  );
}
