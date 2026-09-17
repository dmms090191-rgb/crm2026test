import { useState } from 'react';
import { ExternalLink, LayoutGrid, Maximize2, Sparkles } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { publicSiteUrl, siteDisplayName, type PreviewDevice, type SitePreviewPayload, type SiteTabId } from '../../../../lib/siteWorkspaceModel';
import SitePreviewFrame, { PreviewDeviceSwitcher, defaultPreviewDevice } from './SitePreviewFrame';
import SitePreviewModal from './SitePreviewModal';
import { BUTTON_BASE, EmptyPanel, PRIMARY_BUTTON_STYLE, secondaryButtonStyle } from './SiteUiParts';

/*
 * APERCU : le vrai site de l'entreprise ciblee (instance company_home_pages reelle,
 * template actif et sections publiees), rendu comme la page publique.
 */
interface Props {
  t: ThemeTokens;
  page: CompanyHomePage | null;
  payload: SitePreviewPayload | null;
  targetName: string;
  onTabChange: (tab: SiteTabId) => void;
}

function frameHeight(): number {
  if (typeof window === 'undefined') return 640;
  return Math.max(420, Math.min(Math.round(window.innerHeight * 0.68), 820));
}

export default function SiteLivePreviewTab({ t, page, payload, targetName, onTabChange }: Props) {
  const [device, setDevice] = useState<PreviewDevice>(defaultPreviewDevice);
  const [fullscreen, setFullscreen] = useState(false);

  if (!page || !payload) {
    return (
      <EmptyPanel
        t={t}
        icon={<Sparkles className="w-6 h-6" />}
        title={page ? "Votre site n'a pas encore de template" : "Votre site n'est pas encore créé"}
        text="Choisissez un template : l'aperçu de votre site apparaîtra ici."
        action={
          <button onClick={() => onTabChange('templates')} className={`${BUTTON_BASE} w-full sm:w-auto`} style={PRIMARY_BUTTON_STYLE}>
            <LayoutGrid className="w-4 h-4" /> Choisir un template
          </button>
        }
      />
    );
  }

  const name = siteDisplayName(page, targetName);
  const link = publicSiteUrl(page, window.location.origin);

  return (
    <div className="space-y-3" data-testid="site-live-preview">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-sm font-bold truncate" style={{ color: t.heading.primary }}>{name}</p>
          <p className="text-sm sm:text-xs" style={{ color: t.text.tertiary }}>Votre site tel que vos visiteurs le voient.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <PreviewDeviceSwitcher t={t} device={device} onChange={setDevice} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFullscreen(true)} className={BUTTON_BASE} style={secondaryButtonStyle(t)}>
              <Maximize2 className="w-4 h-4" /> Plein écran
            </button>
            {link.url ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE}>
                <ExternalLink className="w-4 h-4" /> Voir mon site
              </a>
            ) : (
              <button disabled title={link.hint} className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE}>
                <ExternalLink className="w-4 h-4" /> Voir mon site
              </button>
            )}
          </div>
        </div>
      </div>

      <SitePreviewFrame t={t} payload={payload} device={device} height={frameHeight()} title={`Aperçu du site ${name}`} />

      {fullscreen && (
        <SitePreviewModal t={t} title={name} subtitle="Aperçu de votre site" payload={payload} onClose={() => setFullscreen(false)} />
      )}
    </div>
  );
}
