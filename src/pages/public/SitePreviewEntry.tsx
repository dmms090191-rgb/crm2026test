import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { neutralizePreviewClient } from '../../lib/sitePreviewGuard';
import { getTemplateComponent } from '../superadmin/views/site-builder/templates/templateRegistry';
import {
  PREVIEW_READY_MESSAGE, isPreviewPayloadMessage, type SitePreviewPayload,
} from '../../lib/siteWorkspaceModel';

/*
 * Route interne /site-apercu, montee par main.tsx A LA PLACE de App (pas de detection de role,
 * pas de minuterie d'inactivite).
 * Rendu seul : ne lit rien en base. Le contenu arrive de la fenetre parente (meme origine),
 * qui l'a charge avec les droits de la personne connectee.
 * Mode apercu (voir sitePreviewGuard.ts) : connexion, inscription et ecritures neutralisees sur
 * l'instance Supabase de l'iframe ; aucun envoi de formulaire ; aucune navigation hors de l'apercu.
 */

/* A appeler par main.tsx AVANT le rendu, uniquement sur la route d'apercu. */
export function prepareSitePreviewRealm(): void {
  neutralizePreviewClient(supabase as unknown as Parameters<typeof neutralizePreviewClient>[0]);
  const html = document.documentElement;
  html.dataset.sitePreview = 'guarded';
  // Rendu identique a la page publique : aucun theme de panneau applique.
  html.classList.add('site-page');
  html.removeAttribute('data-theme');
  html.classList.remove('glass-blur-low', 'glass-blur-high');
  html.style.background = '#020617';
  document.body.style.background = '#020617';
  document.getElementById('root')?.classList.add('app-ready');
}

export default function SitePreviewEntry() {
  const [payload, setPayload] = useState<SitePreviewPayload | null>(null);
  const embedded = window.parent !== window;

  useEffect(() => {
    const blockSubmit = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const blockLinks = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (anchor && href && !href.startsWith('#')) e.preventDefault();
    };
    document.addEventListener('submit', blockSubmit, true);
    document.addEventListener('click', blockLinks, true);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (isPreviewPayloadMessage(event.data)) setPayload(event.data.payload);
    };
    window.addEventListener('message', onMessage);
    if (embedded) window.parent.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);

    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('submit', blockSubmit, true);
      document.removeEventListener('click', blockLinks, true);
    };
  }, [embedded]);

  if (!embedded) return <PreviewNotice text="Cette page s'affiche uniquement dans l'aperçu du site Talvex." />;
  if (!payload) return <PreviewNotice text="" />;

  const TemplateComponent = getTemplateComponent(payload.templateKey);
  if (!TemplateComponent) return <PreviewNotice text="Ce template n'est pas disponible." />;

  return (
    <TemplateComponent
      domainCompanyId={null}
      onDomainLogin={() => {}}
      sectionOverrides={payload.sectionOverrides}
      sectionOrder={payload.sectionOrder}
      appIconUrl={payload.appIconUrl}
    />
  );
}

function PreviewNotice({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#020617' }}>
      {text && <p className="text-sm text-center" style={{ color: '#94a3b8' }}>{text}</p>}
    </div>
  );
}
