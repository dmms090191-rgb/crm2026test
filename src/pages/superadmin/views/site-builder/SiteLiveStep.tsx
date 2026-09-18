import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, Globe, LayoutGrid, Maximize2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import type { SiteDomainRecord } from '../../../../lib/siteDomainTypes';
import { publicSiteUrl, siteDisplayName, type PreviewDevice, type SitePreviewPayload } from '../../../../lib/siteWorkspaceModel';
import SitePreviewFrame, { PreviewDeviceSwitcher, defaultPreviewDevice } from './SitePreviewFrame';
import SitePreviewModal from './SitePreviewModal';
import { SITE_ACCENT } from './SiteUiParts';

/*
 * ETAPE 3 — LE SITE.
 * Le site reel occupe tout l'espace disponible ; les commandes restent discretes :
 * gerer le domaine, changer le template, ouvrir le vrai site. Meme moteur d'apercu qu'avant
 * (iframe /site-apercu) : rien n'est simule, rien n'a ete duplique.
 */
interface Props {
  t: ThemeTokens;
  page: CompanyHomePage;
  siteDomain: SiteDomainRecord | null;
  payload: SitePreviewPayload;
  targetName: string;
  domain: string | null;
  onManageDomain: () => void;
  onChangeTemplate: () => void;
}

const MIN_HEIGHT = 380;

/* Hauteur restante sous la barre de commandes : le site remplit l'ecran, sans double ascenseur. */
function useFillHeight(ref: React.RefObject<HTMLElement>, layoutKey: unknown): number {
  const [height, setHeight] = useState(MIN_HEIGHT);
  useLayoutEffect(() => {
    const measure = () => {
      const element = ref.current;
      if (!element) return;
      const top = element.getBoundingClientRect().top;
      setHeight(Math.max(MIN_HEIGHT, Math.round(window.innerHeight - top - 16)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref, layoutKey]);
  return height;
}

export default function SiteLiveStep({ t, page, siteDomain, payload, targetName, domain, onManageDomain, onChangeTemplate }: Props) {
  const [device, setDevice] = useState<PreviewDevice>(defaultPreviewDevice);
  const [fullscreen, setFullscreen] = useState(false);
  const frameZoneRef = useRef<HTMLDivElement>(null);
  // Connu des le premier rendu : la barre de commandes ne change pas de hauteur apres coup.
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches);
  const height = useFillHeight(frameZoneRef, wide);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const name = siteDisplayName(page, targetName);
  const link = publicSiteUrl(page, window.location.origin, siteDomain);
  const button = 'inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-sm sm:text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
  const quiet = { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary };

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="site-step-site">
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        {/* Sur mobile le domaine prend sa propre ligne : il ne doit jamais etre tronque a deux lettres. */}
        <div className="min-w-0 w-full sm:w-auto sm:flex-1 flex items-center gap-2">
          <Globe className="w-4 h-4 flex-shrink-0" style={{ color: SITE_ACCENT }} aria-hidden="true" />
          <p className="min-w-0 truncate text-sm font-semibold" style={{ color: t.heading.primary }}>
            {domain ?? name}
          </p>
        </div>
        {wide && <PreviewDeviceSwitcher t={t} device={device} onChange={setDevice} />}
        <div className="flex items-center gap-2">
          <button type="button" onClick={onManageDomain} className={button} style={quiet} data-testid="site-live-domain">
            <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Domaine
          </button>
          <button type="button" onClick={onChangeTemplate} className={button} style={quiet} data-testid="site-live-template">
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" /> Template
          </button>
          {wide && (
            <button type="button" onClick={() => setFullscreen(true)} className={button} style={quiet} aria-label="Plein écran">
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {link.url ? (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className={button} style={quiet} data-testid="site-live-open">
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Ouvrir
            </a>
          ) : (
            <button type="button" disabled title={link.hint} className={`${button} opacity-50 cursor-not-allowed`} style={quiet}>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Ouvrir
            </button>
          )}
        </div>
      </div>

      <div ref={frameZoneRef} className="flex-1 min-h-0">
        <SitePreviewFrame t={t} payload={payload} device={device} height={height} title={`Site ${name}`} />
      </div>

      {fullscreen && (
        <SitePreviewModal t={t} title={name} subtitle="Votre site" payload={payload} onClose={() => setFullscreen(false)} />
      )}
    </div>
  );
}
