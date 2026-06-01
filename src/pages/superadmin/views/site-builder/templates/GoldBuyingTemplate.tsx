import { useState, type ReactElement } from 'react';
import type { TemplateProps } from './templateRegistry';
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

function getContent(
  overrides: TemplateProps['sectionOverrides'],
  section: string,
  field: string,
): string | undefined {
  return overrides?.[section]?.content[field] || undefined;
}

function isVisible(overrides: TemplateProps['sectionOverrides'], section: string): boolean {
  if (!overrides?.[section]) return true;
  return overrides[section].visible !== false;
}

const DEFAULT_ORDER = ['nav', 'hero', 'services', 'process', 'offers', 'events', 'guarantees', 'contact', 'footer'];

export default function GoldBuyingTemplate({ domainCompanyId, onDomainLogin, sectionOverrides, sectionOrder, appIconUrl }: TemplateProps = {}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleLogin = () => {
    if (onDomainLogin) onDomainLogin();
    else window.location.href = '/';
  };

  const handleOpenLogin = () => setLoginOpen(true);
  const handleOpenRegister = () => setRegisterOpen(true);

  const o = sectionOverrides;

  const sectionMap: Record<string, ReactElement> = {
    nav: <GoldBuyingNav
      onLogin={handleOpenLogin}
      onRegister={handleOpenRegister}
      brandName={getContent(o, 'nav', 'brand_name')}
      ctaText={getContent(o, 'nav', 'cta_text')}
    />,
    hero: <GoldBuyingHero
      onLogin={handleOpenLogin}
      onRegister={handleOpenRegister}
      title={getContent(o, 'hero', 'title')}
      subtitle={getContent(o, 'hero', 'subtitle')}
      cta1Text={getContent(o, 'hero', 'cta1_text')}
      cta2Text={getContent(o, 'hero', 'cta2_text')}
    />,
    services: <GoldBuyingServices
      title={getContent(o, 'services', 'title')}
      subtitle={getContent(o, 'services', 'subtitle')}
    />,
    process: <GoldBuyingProcess
      title={getContent(o, 'process', 'title')}
      subtitle={getContent(o, 'process', 'subtitle')}
    />,
    offers: <GoldBuyingOffers
      title={getContent(o, 'offers', 'title')}
      subtitle={getContent(o, 'offers', 'subtitle')}
    />,
    events: <GoldBuyingEvents
      title={getContent(o, 'events', 'title')}
      subtitle={getContent(o, 'events', 'subtitle')}
    />,
    guarantees: <GoldBuyingGuarantees
      title={getContent(o, 'guarantees', 'title')}
      subtitle={getContent(o, 'guarantees', 'subtitle')}
    />,
    contact: <GoldBuyingContact
      title={getContent(o, 'contact', 'title')}
      address={getContent(o, 'contact', 'address')}
      phone={getContent(o, 'contact', 'phone')}
      email={getContent(o, 'contact', 'email')}
    />,
    footer: <GoldBuyingFooter
      copyright={getContent(o, 'footer', 'copyright')}
    />,
  };

  const order = sectionOrder?.length ? sectionOrder : DEFAULT_ORDER;

  return (
    <div className="min-h-full text-white" style={{ background: '#0a0a0a', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {order.map(key => {
        if (!isVisible(o, key)) return null;
        const el = sectionMap[key];
        if (!el) return null;
        return <div key={key} data-section-key={key}>{el}</div>;
      })}

      <TalvexLoginModal
        isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin}
        onRegister={() => { setLoginOpen(false); setRegisterOpen(true); }}
        theme={GOLD_MODAL_THEME} domainCompanyId={domainCompanyId} appIconUrl={appIconUrl}
      />
      <TalvexRegisterModal
        isOpen={registerOpen} onClose={() => setRegisterOpen(false)}
        onBackToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }}
        theme={GOLD_MODAL_THEME}
      />
    </div>
  );
}
