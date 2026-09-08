import { useState } from 'react';
import TalvexLoginModal from './TalvexLoginModal';
import { getSiteModalTheme } from './siteModalTheme';
import BarbieWellnessStyles from './BarbieWellnessStyles';
import BarbieWellnessHero from './BarbieWellnessHero';
import BarbieWellnessServices from './BarbieWellnessServices';
import BarbieWellnessTeam from './BarbieWellnessTeam';
import BarbieWellnessContact from './BarbieWellnessContact';
import BarbieWellnessFooter from './BarbieWellnessFooter';

export default function BarbieWellnessTemplate() {
  const [form, setForm] = useState({ nom: '', tel: '', email: '', objectif: '' });
  const [sent, setSent] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const bwTheme = getSiteModalTheme('barbie_wellness');

  const handleLogin = () => {
    setLoginOpen(false);
    window.location.href = '/';
  };

  return (
    <div className="min-h-full selection:bg-[#38A8B5]/30 selection:text-white" style={{ background: 'linear-gradient(160deg, #e8f4f6 0%, #d4eef1 8%, #bfe5e9 16%, #c8dde0 24%, #d5cfd3 34%, #c9b8c0 44%, #b8a0ac 52%, #c4b5bc 60%, #d0d8db 68%, #bce0e5 76%, #a8d5dc 84%, #c5e3e8 92%, #e0f0f3 100%)' }}>
      <BarbieWellnessStyles />
      <BarbieWellnessHero onLogin={() => setLoginOpen(true)} />
      <BarbieWellnessServices />
      <BarbieWellnessTeam />
      <BarbieWellnessContact form={form} setForm={setForm} sent={sent} setSent={setSent} />
      <BarbieWellnessFooter />
      <TalvexLoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        theme={bwTheme}
      />
    </div>
  );
}
