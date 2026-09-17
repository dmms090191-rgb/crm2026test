import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import {
  PREVIEW_DEVICE_WIDTHS, PREVIEW_PAYLOAD_MESSAGE, PREVIEW_READY_MESSAGE, PREVIEW_ROUTE, previewScale,
  type PreviewDevice, type SitePreviewPayload,
} from '../../../../lib/siteWorkspaceModel';

/*
 * Apercu fidele du site : iframe sur la route interne /site-apercu (rendu seul, aucune lecture
 * en base, aucune session rafraichie). Les donnees, deja chargees avec les droits de la personne
 * connectee, sont transmises par postMessage restreint a la meme origine.
 * L'iframe a la vraie largeur de l'appareil, reduite a l'echelle : les points de rupture du
 * template (mobile / tablette / ordinateur) sont donc ceux d'un vrai appareil.
 */
interface Props {
  t: ThemeTokens;
  payload: SitePreviewPayload;
  device: PreviewDevice;
  height: number;
  title: string;
}

export default function SitePreviewFrame({ t, payload, device, height, title }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (win) win.postMessage({ type: PREVIEW_PAYLOAD_MESSAGE, payload }, window.location.origin);
  }, [payload]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if ((event.data as { type?: unknown } | null)?.type !== PREVIEW_READY_MESSAGE) return;
      setReady(true);
      send();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // Contenu modifie (autre template, autre site) : on renvoie sans recharger l'iframe.
  useEffect(() => { if (ready) send(); }, [ready, send]);

  const deviceWidth = PREVIEW_DEVICE_WIDTHS[device];
  const scale = previewScale(containerWidth, device);
  const frameWidth = deviceWidth;
  const frameHeight = Math.round(height / scale);
  const visualWidth = Math.round(deviceWidth * scale);

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <div className="relative mx-auto overflow-hidden rounded-xl"
        style={{ width: visualWidth || '100%', maxWidth: '100%', height, background: '#020617', border: `1px solid ${t.surface.border}` }}>
        <iframe
          ref={frameRef}
          src={PREVIEW_ROUTE}
          title={title}
          data-testid="site-preview-iframe"
          data-device={device}
          // Pas d'attribut sandbox : avec allow-scripts + allow-same-origin il ne protege rien
          // (avertissement navigateur). Les garde-fous sont dans SitePreviewEntry
          // (aucun envoi de formulaire, aucune navigation hors de l'apercu).
          style={{
            width: frameWidth, height: frameHeight, border: 0, display: 'block',
            transform: `scale(${scale})`, transformOrigin: 'top left',
          }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: t.surface.secondary }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
          </div>
        )}
      </div>
    </div>
  );
}

const DEVICES: { id: PreviewDevice; label: string; icon: React.ReactNode }[] = [
  { id: 'desktop', label: 'Ordinateur', icon: <Monitor className="w-4 h-4" /> },
  { id: 'tablet', label: 'Tablette', icon: <Tablet className="w-4 h-4" /> },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
];

export function PreviewDeviceSwitcher({ t, device, onChange }: { t: ThemeTokens; device: PreviewDevice; onChange: (d: PreviewDevice) => void }) {
  return (
    <div role="radiogroup" aria-label="Taille d'écran" className="grid grid-cols-3 gap-1 p-1 rounded-xl w-full sm:w-auto"
      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
      {DEVICES.map(d => {
        const active = d.id === device;
        return (
          <button key={d.id} role="radio" aria-checked={active} onClick={() => onChange(d.id)} data-testid={`site-preview-device-${d.id}`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: active ? t.card.bg : 'transparent',
              border: active ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
              color: active ? '#0ea5e9' : t.text.secondary,
            }}>
            {d.icon}<span className="hidden min-[400px]:inline">{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function defaultPreviewDevice(): PreviewDevice {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 640) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}
