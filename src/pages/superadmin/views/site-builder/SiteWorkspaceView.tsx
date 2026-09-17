import { useState } from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePageWithCompany, SiteTemplate } from '../../../../lib/companyHomePages';
import type { SiteTabId } from '../../../../lib/siteWorkspaceModel';
import type { SiteContextState } from '../../../../lib/siteContextModel';
import type { SiteWorkspaceData } from './useSiteWorkspaceData';
import SiteManagerShellHeader from './SiteManagerShellHeader';
import SiteContextBanner from './SiteContextBanner';
import SiteOverviewTab from './SiteOverviewTab';
import SiteDomainPanel from './SiteDomainPanel';
import SiteDomainTab from './SiteDomainTab';
import SiteTemplateLibrary from './SiteTemplateLibrary';
import SiteLivePreviewTab from './SiteLivePreviewTab';
import SitePreviewModal from './SitePreviewModal';
import SiteApplyTemplateModal from './SiteApplyTemplateModal';
import SADomainsModal from '../sites/SADomainsModal';
import { BUTTON_BASE, EmptyPanel, PRIMARY_BUTTON_STYLE, secondaryButtonStyle } from './SiteUiParts';

/*
 * Vue de l'interface Site : MON SITE | DOMAINE | TEMPLATES | APERCU.
 * Composant de presentation : le contexte (verifie par le serveur) et les donnees arrivent en props
 * depuis SiteManagerWorkspace. L'ancien Studio Site est masque (SiteStudioTab.tsx conserve, non monte).
 */
export interface SiteWorkspaceViewProps {
  ctx: SiteContextState;
  data: SiteWorkspaceData;
  title: string;
  hideDomainTab?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

/* hideDomainTab (listes Talvex) est volontairement ignore : l'interface a toujours ses 4 onglets. */
export default function SiteWorkspaceView({ ctx, data, title, onClose, onBack }: SiteWorkspaceViewProps) {
  const t = useThemeTokens();
  const [tab, setTab] = useState<SiteTabId>('mon-site');
  const [previewTemplate, setPreviewTemplate] = useState<SiteTemplate | null>(null);
  const [applyCandidate, setApplyCandidate] = useState<SiteTemplate | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [domainToolsOpen, setDomainToolsOpen] = useState(false);

  const target = ctx.target!;
  const isPlatformSite = target.scope === 'platform';
  const actorIsTalvex = ctx.actor?.role === 'super_admin';
  const activeId = data.activeTemplate?.id ?? null;

  const changeTab = (next: SiteTabId) => { setTab(next); setNotice(null); };

  let body: React.ReactNode;
  if (data.loading) {
    body = <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} /></div>;
  } else if (data.loadError) {
    body = (
      <EmptyPanel t={t} icon={<RefreshCw className="w-6 h-6" />} title="Le site n'a pas pu être chargé" text="Vérifiez votre connexion puis réessayez."
        action={<button onClick={() => data.reload()} className={`${BUTTON_BASE} w-full sm:w-auto`} style={secondaryButtonStyle(t)}>Réessayer</button>} />
    );
  } else if (tab === 'mon-site') {
    body = (
      <SiteOverviewTab t={t} target={target} page={data.page} siteDomain={data.siteDomain} activeTemplate={data.activeTemplate}
        hasTemplates={data.library.length > 0} onTabChange={changeTab} />
    );
  } else if (tab === 'domaine') {
    body = isPlatformSite
      // Site officiel Talvex : outils techniques existants, reserves a Talvex Administrateur.
      ? <SiteDomainTab page={data.page} onOpenDomainManager={() => setDomainToolsOpen(true)} ownerType="super_admin" onPageRefresh={() => data.reload()} />
      : <SiteDomainPanel t={t} page={data.page} siteDomain={data.siteDomain} companyId={target.companyId!} actorIsTalvex={actorIsTalvex} />;
  } else if (tab === 'templates') {
    body = (
      <SiteTemplateLibrary t={t} entries={data.library} targetName={target.name} actorIsTalvex={actorIsTalvex}
        isPlatformSite={isPlatformSite} onPreview={setPreviewTemplate} onUse={setApplyCandidate} />
    );
  } else {
    body = <SiteLivePreviewTab t={t} page={data.page} siteDomain={data.siteDomain} payload={data.sitePreview} targetName={target.name} onTabChange={changeTab} />;
  }

  const pageWithCompany: CompanyHomePageWithCompany | null = data.page
    ? { ...data.page, companies: { name: target.name, entity_type: target.entityType ?? 'platform', parent_company_id: target.parentCompanyId } }
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0" data-testid="site-workspace" data-site-target={target.companyId ?? 'platform'}>
      <SiteManagerShellHeader
        t={t} title={title} activeTab={tab} onTabChange={changeTab}
        banner={<SiteContextBanner t={t} ctx={ctx} />} onClose={onClose} onBack={onBack}
      />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-3 sm:p-4 space-y-3 max-w-6xl mx-auto w-full">
          {notice && (
            <p role="status" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm sm:text-xs"
              style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
              <Check className="w-4 h-4 flex-shrink-0" />{notice}
            </p>
          )}
          {body}
        </div>
      </div>

      {previewTemplate && (
        <SitePreviewModal
          t={t}
          title={previewTemplate.name}
          subtitle="Modèle de template — contenu d'exemple"
          payload={{ templateKey: previewTemplate.template_key, appIconUrl: null }}
          onClose={() => setPreviewTemplate(null)}
          footer={
            <div className="grid grid-cols-1 sm:flex sm:justify-end gap-2">
              <button onClick={() => setPreviewTemplate(null)} className={BUTTON_BASE} style={secondaryButtonStyle(t)}>Fermer</button>
              {previewTemplate.id !== activeId && (
                <button onClick={() => { setApplyCandidate(previewTemplate); setPreviewTemplate(null); }}
                  className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE}>
                  Utiliser ce template
                </button>
              )}
            </div>
          }
        />
      )}

      {applyCandidate && (
        <SiteApplyTemplateModal
          t={t}
          template={applyCandidate}
          page={data.page}
          targetName={target.name}
          onConfirm={data.applyTemplateToSite}
          onClose={() => setApplyCandidate(null)}
          onDone={() => { setNotice(`Le template « ${applyCandidate.name} » est maintenant utilisé.`); setApplyCandidate(null); }}
        />
      )}

      {domainToolsOpen && pageWithCompany && (
        <SADomainsModal page={pageWithCompany} onClose={() => setDomainToolsOpen(false)} onChanged={() => data.reload()} />
      )}
    </div>
  );
}
