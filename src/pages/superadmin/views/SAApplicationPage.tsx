import { Smartphone } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import usePwaInstall from '../../../hooks/usePwaInstall';
import { useAppIcon } from '../../../hooks/useAppIcon';
import SimulatedPhone from '../../../components/SimulatedPhone';
import AppFeaturesList from './application/AppFeaturesList';
import PwaInstallButton from './application/PwaInstallButton';

interface Props {
  onChangeAppIcon?: () => void;
}

export default function SAApplicationPage({ onChangeAppIcon }: Props) {
  const t = useThemeTokens();
  const { appIconUrl } = useAppIcon(null, 'super_admin');
  const pwa = usePwaInstall();

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}
        >
          <Smartphone className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>Application mobile</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: t.heading.primary }}>
          Talvex
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: t.text.tertiary }}>
          Gerez votre activite ou que vous soyez avec l'application mobile Talvex.
          L'apercu ci-dessous affiche la vraie interface responsive du projet.
        </p>
      </div>

      {/* Two-column: Features + Phone */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start justify-items-center">
        {/* Features card */}
        <div
          className="rounded-2xl p-6 sm:p-8 w-full max-w-md"
          style={{
            background: t.surface.primary,
            border: `1px solid ${t.surface.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <AppFeaturesList appIconUrl={appIconUrl} onChangeAppIcon={onChangeAppIcon} />
        </div>

        {/* Real responsive phone preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#0ea5e9' }}>
              Apercu responsive reel
            </span>
          </div>
          <SimulatedPhone appIconUrl={appIconUrl} appName="Talvex" />
        </div>
      </div>

      {/* Install button */}
      <div className="flex justify-center mt-8 sm:mt-10">
        <PwaInstallButton pwa={pwa} appName="Talvex" />
      </div>
    </div>
  );
}
