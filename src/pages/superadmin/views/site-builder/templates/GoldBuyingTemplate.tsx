import { useState } from 'react';
import TalvexLoginModal from './TalvexLoginModal';
import TalvexRegisterModal from './TalvexRegisterModal';
import { getSiteModalTheme } from './siteModalTheme';
import GoldBuyingNav from './gold-buying/GoldBuyingNav';
import GoldBuyingHero from './gold-buying/GoldBuyingHero';
import GoldBuyingServices from './gold-buying/GoldBuyingServices';
import GoldBuyingProcess from './gold-buying/GoldBuyingProcess';
import GoldBuyingOffers from './gold-buying/GoldBuyingOffers';
import GoldBuyingEvents from './gold-buying/GoldBuyingEvents';
import GoldBuyingGuarantees from './gold-buying/GoldBuyingGuarantees';
import GoldBuyingContact from './gold-buying/GoldBuyingContact';
import GoldBuyingFooter from './gold-buying/GoldBuyingFooter';

const GOLD_MODAL_THEME = getSiteModalTheme('gold_buying');

interface TemplateProps {
  domainCompanyId?: string | null;
  onDomainLogin?: () => void;
}

export default function GoldBuyingTemplate({ domainCompanyId, onDomainLogin }: TemplateProps = {}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleLogin = () => {
    if (onDomainLogin) onDomainLogin();
    else window.location.href = '/';
  };

  const handleOpenLogin = () => setLoginOpen(true);
  const handleOpenRegister = () => setRegisterOpen(true);

  return (
    <div className="min-h-full text-white" style={{ background: '#0a0a0a', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <GoldBuyingNav onLogin={handleOpenLogin} onRegister={handleOpenRegister} />
      <GoldBuyingHero onLogin={handleOpenLogin} onRegister={handleOpenRegister} />
      <GoldBuyingServices />
      <GoldBuyingProcess />
      <GoldBuyingOffers />
      <GoldBuyingEvents />
      <GoldBuyingGuarantees />
      <GoldBuyingContact />
      <GoldBuyingFooter />

      <TalvexLoginModal
        isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin}
        onRegister={() => { setLoginOpen(false); setRegisterOpen(true); }}
        theme={GOLD_MODAL_THEME} domainCompanyId={domainCompanyId}
      />
      <TalvexRegisterModal
        isOpen={registerOpen} onClose={() => setRegisterOpen(false)}
        onBackToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }}
        theme={GOLD_MODAL_THEME}
      />
    </div>
  );
}
