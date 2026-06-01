import { useState, type ReactElement } from 'react';
import type { TemplateProps } from './templateRegistry';
import TalvexLoginModal from './TalvexLoginModal';
import TalvexRegisterModal from './TalvexRegisterModal';
import { getSiteModalTheme } from './siteModalTheme';
import BuilderReadyHero from './builder-ready/BuilderReadyHero';
import BuilderReadyServices from './builder-ready/BuilderReadyServices';
import BuilderReadyContact from './builder-ready/BuilderReadyContact';

const MODAL_THEME = getSiteModalTheme('builder_ready');

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

const DEFAULT_ORDER = ['hero', 'services', 'contact'];

export default function BuilderReadyTemplate({ domainCompanyId, onDomainLogin, sectionOverrides, sectionOrder, appIconUrl }: TemplateProps = {}) {
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
    hero: <BuilderReadyHero
      onLogin={handleOpenLogin}
      onRegister={handleOpenRegister}
      title={getContent(o, 'hero', 'title')}
      subtitle={getContent(o, 'hero', 'subtitle')}
      cta1Text={getContent(o, 'hero', 'cta1_text')}
      cta1Link={getContent(o, 'hero', 'cta1_link')}
      cta2Text={getContent(o, 'hero', 'cta2_text')}
      cta2Link={getContent(o, 'hero', 'cta2_link')}
    />,
    services: <BuilderReadyServices
      title={getContent(o, 'services', 'title')}
      subtitle={getContent(o, 'services', 'subtitle')}
    />,
    contact: <BuilderReadyContact
      title={getContent(o, 'contact', 'title')}
      subtitle={getContent(o, 'contact', 'subtitle')}
      phone={getContent(o, 'contact', 'phone')}
      email={getContent(o, 'contact', 'email')}
      address={getContent(o, 'contact', 'address')}
      buttonText={getContent(o, 'contact', 'button_text')}
    />,
  };

  const order = sectionOrder?.length ? sectionOrder : DEFAULT_ORDER;

  return (
    <div
      className="min-h-full text-white"
      style={{
        background: '#0f172a',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {order.map(key => {
        if (!isVisible(o, key)) return null;
        const el = sectionMap[key];
        if (!el) return null;
        return <div key={key} data-section-key={key}>{el}</div>;
      })}

      <TalvexLoginModal
        isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin}
        onRegister={() => { setLoginOpen(false); setRegisterOpen(true); }}
        theme={MODAL_THEME} domainCompanyId={domainCompanyId} appIconUrl={appIconUrl}
      />
      <TalvexRegisterModal
        isOpen={registerOpen} onClose={() => setRegisterOpen(false)}
        onBackToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }}
        theme={MODAL_THEME}
      />
    </div>
  );
}
