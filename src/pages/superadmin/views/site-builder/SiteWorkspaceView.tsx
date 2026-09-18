import { useState } from 'react';
import { ArrowLeft, Check, Loader2, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePageWithCompany, SiteTemplate } from '../../../../lib/companyHomePages';
import { siteFlowState, resolveStep, type SiteStep } from '../../../../lib/siteFlowModel';
import { domainSummary } from '../../../../lib/siteWorkspaceModel';
import type { SiteContextState } from '../../../../lib/siteContextModel';
import type { SiteWorkspaceData } from './useSiteWorkspaceData';
import SiteManagerShellHeader from './SiteManagerShellHeader';
import SiteContextBanner from './SiteContextBanner';
import SiteConnectDomainStep from './SiteConnectDomainStep';
import SiteChooseTemplateStep from './SiteChooseTemplateStep';
import SiteLiveStep from './SiteLiveStep';
import SiteDomainPanel from './SiteDomainPanel';
import SiteDomainTab from './SiteDomainTab';
import SitePreviewModal from './SitePreviewModal';
import SiteApplyTemplateModal from './SiteApplyTemplateModal';
import SADomainsModal from '../sites/SADomainsModal';
import { BUTTON_BASE, EmptyPanel, PRIMARY_BUTTON_STYLE, secondaryButtonStyle } from './SiteUiParts';

/*
 * Interface Site : parcours DOMAINE -> TEMPLATE -> SITE.
 * L'etape s'impose d'elle-meme (pas d'onglets) : sans domaine on connecte le domaine, sans template on
 * choisit le site, sinon on voit directement le site. Une fois tout configure, revenir dans Site affiche
 * le site, jamais l'assistant. Les anciens ecrans (onglets, tableau de bord, apercu) restent sur disque,
 * simplement non montes : aucun moteur technique n'a ete supprime.
 * Composant de presentation : le contexte (verifie par le serveur) et les donnees arrivent en props.
 */
export interface SiteWorkspaceViewProps {
  ctx: SiteContextState;
  data: SiteWorkspaceData;
  title: string;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SiteWorkspaceView({ ctx, data, title, onClose, onBack }: SiteWorkspaceViewProps) {
  const t = useThemeTokens();
  const [requested, setRequested] = useState<SiteStep | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SiteTemplate | null>(null);
  const [applyCandidate, setApplyCandidate] = useState<SiteTemplate | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [domainToolsOpen, setDomainToolsOpen] = useState(false);

  const target = ctx.target!;
  const isPlatformSite = target.scope === 'platform';
  const actorIsTalvex = ctx.actor?.role === 'super_admin';
  const activeId = data.activeTemplate?.id ?? null;

  const flow = siteFlowState({
    domain: domainSummary(data.page, data.siteDomain).domain,
    hasTemplate: !!data.page?.active_template_id && data.activeTemplate !== null,
  });
  const step = resolveStep(flow, requested);
  const goTo = (next: SiteStep) => { setRequested(next); setNotice(null); };
  /* Apres une etape franchie : on relache la navigation manuelle pour suivre l'etape reelle. */
  const follow = () => setRequested(null);

  let body: React.ReactNode;
  if (data.loading) {
    body = <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} /></div>;
  } else if (data.loadError) {
    body = (
      <EmptyPanel t={t} icon={<RefreshCw className="w-6 h-6" />} title="Le site n'a pas pu être chargé" text="Vérifiez votre connexion puis réessayez."
        action={<button onClick={() => data.reload()} className={`${BUTTON_BASE} w-full sm:w-auto`} style={secondaryButtonStyle(t)}>Réessayer</button>} />
    );
  } else if (step === 'domaine') {
    body = isPlatformSite
      // Site officiel Talvex : outils techniques existants, reserves a Talvex Administrateur.
      ? <SiteDomainTab page={data.page} onOpenDomainManager={() => setDomainToolsOpen(true)} ownerType="super_admin" onPageRefresh={() => data.reload()} />
      : flow.hasDomain
        // Domaine deja connecte : l'adresse, changer de domaine, deconnecter.
        ? (
          <SiteDomainPanel t={t} page={data.page} siteDomain={data.siteDomain} companyId={target.companyId!}
            targetName={target.name} actorIsTalvex={actorIsTalvex}
            onChanged={async notice => { setNotice(notice); follow(); await data.reload(); }} />
        )
        : (
          <SiteConnectDomainStep t={t} companyId={target.companyId!} targetName={target.name}
            onAttached={async domain => {
              setNotice(`${domain} est maintenant le domaine de votre site.`);
              follow();
              await data.reload();
            }} />
        );
  } else if (step === 'template') {
    body = (
      <SiteChooseTemplateStep t={t} entries={data.library} targetName={target.name} actorIsTalvex={actorIsTalvex}
        isPlatformSite={isPlatformSite} domain={flow.domain} onManageDomain={() => goTo('domaine')}
        onPreview={setPreviewTemplate} onUse={setApplyCandidate} />
    );
  } else {
    body = (
      <SiteLiveStep t={t} page={data.page!} siteDomain={data.siteDomain} payload={data.sitePreview!} targetName={target.name}
        domain={flow.domain} onManageDomain={() => goTo('domaine')} onChangeTemplate={() => goTo('template')} />
    );
  }

  const pageWithCompany: CompanyHomePageWithCompany | null = data.page
    ? { ...data.page, companies: { name: target.name, entity_type: target.entityType ?? 'platform', parent_company_id: target.parentCompanyId } }
    : null;
  const fullBleed = step === 'site' && !data.loading && !data.loadError;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0" data-testid="site-workspace" data-site-target={target.companyId ?? 'platform'} data-site-step={step}>
      <SiteManagerShellHeader t={t} title={title} banner={<SiteContextBanner t={t} ctx={ctx} />} onClose={onClose} onBack={onBack} />
      <div className={`flex-1 min-h-0 overflow-x-hidden ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={fullBleed
          ? 'p-3 sm:p-4 h-full flex flex-col min-h-0 w-full'
          : 'p-3 sm:p-4 space-y-3 max-w-5xl mx-auto w-full'}>
          {/*
            Un seul controle de sortie, jamais d'impasse :
            - si on a quitte volontairement l'etape naturelle, on y revient ;
            - si le site existe deja mais qu'on est ramene au domaine (domaine retire), on peut le rejoindre.
          */}
          {(step !== flow.step || (step === 'domaine' && flow.hasTemplate)) && (
            <button type="button" data-testid="site-back-to-site"
              onClick={step !== flow.step ? follow : () => goTo('site')}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-sm sm:text-xs font-semibold self-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              {step !== flow.step
                ? (flow.step === 'site' ? 'Retour au site' : flow.step === 'template' ? 'Retour au choix du site' : 'Retour au domaine')
                : 'Voir mon site'}
            </button>
          )}
          {notice && (
            <p role="status" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm sm:text-xs flex-shrink-0"
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
                  Choisir ce template
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
          onDone={() => { setNotice(`Votre site utilise « ${applyCandidate.name} ».`); setApplyCandidate(null); follow(); }}
        />
      )}

      {domainToolsOpen && pageWithCompany && (
        <SADomainsModal page={pageWithCompany} onClose={() => setDomainToolsOpen(false)} onChanged={() => data.reload()} />
      )}
    </div>
  );
}
