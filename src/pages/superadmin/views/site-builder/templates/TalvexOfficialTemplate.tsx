import { useState, useRef } from 'react';
import { Eye, Rocket, Lightbulb } from 'lucide-react';
import TalvexLoginModal from './TalvexLoginModal';
import TalvexRegisterModal from './TalvexRegisterModal';
import TalvexVisionView from './TalvexVisionView';
import TalvexInteractiveWebsiteView from './TalvexInteractiveWebsiteView';
import TalvexProjectsView from './TalvexProjectsView';

type InternalView = 'vision' | 'interactive' | 'projects';

const TABS: { id: InternalView; label: string; icon: React.ReactNode }[] = [
  { id: 'vision', label: 'Vision', icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { id: 'interactive', label: 'Site interactif', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'projects', label: 'Nos projets', icon: <Rocket className="w-3.5 h-3.5" /> },
];

interface TemplateProps {
  domainCompanyId?: string | null;
  onDomainLogin?: () => void;
  appIconUrl?: string | null;
}

export default function TalvexOfficialTemplate({ domainCompanyId, onDomainLogin, appIconUrl }: TemplateProps = {}) {
  const [activeView, setActiveView] = useState<InternalView>('interactive');
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleLogin = () => {
    if (onDomainLogin) onDomainLogin();
    else window.location.href = '/';
  };

  const handleOpenLogin = () => setLoginOpen(true);
  const handleOpenRegister = () => setRegisterOpen(true);

  const handleTabChange = (tab: InternalView) => {
    setActiveView(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-[#030712]">
      {/* Internal tab nav */}
      <div className="flex-shrink-0 sticky top-0 z-40 px-3 sm:px-4 py-2.5 border-b border-white/[0.06]" style={{ background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {TABS.map(tab => {
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(6,182,212,0.08))'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#0ea5e9' : 'rgba(255,255,255,0.45)',
                  boxShadow: active ? '0 0 16px rgba(14,165,233,0.1)' : 'none',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeView === 'vision' && <TalvexVisionView />}
        {activeView === 'interactive' && (
          <TalvexInteractiveWebsiteView onLogin={handleOpenLogin} onRegister={handleOpenRegister} />
        )}
        {activeView === 'projects' && <TalvexProjectsView />}
      </div>

      {/* Auth modals */}
      <TalvexLoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} onRegister={() => { setLoginOpen(false); setRegisterOpen(true); }} domainCompanyId={domainCompanyId} appIconUrl={appIconUrl} />
      <TalvexRegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} onBackToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }} />
    </div>
  );
}
