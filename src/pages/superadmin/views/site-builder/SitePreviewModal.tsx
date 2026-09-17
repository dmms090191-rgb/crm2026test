import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { PreviewDevice, SitePreviewPayload } from '../../../../lib/siteWorkspaceModel';
import SitePreviewFrame, { PreviewDeviceSwitcher, defaultPreviewDevice } from './SitePreviewFrame';

/*
 * Fenetre d'apercu plein ecran (site reel en grand, ou modele de template).
 * Mobile : occupe tout l'ecran. Ordinateur : grande fenetre centree. Toujours dans le viewport.
 */
interface Props {
  t: ThemeTokens;
  title: string;
  subtitle?: string;
  payload: SitePreviewPayload;
  onClose: () => void;
  footer?: ReactNode;
}

export default function SitePreviewModal({ t, title, subtitle, payload, onClose, footer }: Props) {
  const [device, setDevice] = useState<PreviewDevice>(defaultPreviewDevice);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setBodyHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { ro.disconnect(); document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 flex items-stretch sm:items-center justify-center sm:p-4" data-testid="site-preview-modal"
      style={{ zIndex: 100000, background: t.modal.overlayBg, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="w-full h-full sm:h-[92vh] sm:max-w-6xl flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}
        onClick={e => e.stopPropagation()}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 pt-3 pb-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-sm font-bold truncate" style={{ color: t.modal.title }}>{title}</p>
              {subtitle && <p className="text-xs truncate" style={{ color: t.modal.subtitle }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Fermer l'aperçu"
              className="sm:order-last w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <PreviewDeviceSwitcher t={t} device={device} onChange={setDevice} />
        </div>

        <div ref={bodyRef} className="flex-1 min-h-0 p-2 sm:p-3" style={{ background: t.surface.secondary }}>
          {bodyHeight > 0 && (
            <SitePreviewFrame t={t} payload={payload} device={device} height={Math.max(bodyHeight - 16, 240)} title={title} />
          )}
        </div>

        {footer && (
          <div className="flex-shrink-0 px-3 sm:px-4 py-3" style={{ borderTop: `1px solid ${t.modal.border}` }}>{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
