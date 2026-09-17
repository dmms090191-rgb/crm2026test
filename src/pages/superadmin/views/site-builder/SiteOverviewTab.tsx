import { ExternalLink, Eye, Globe, LayoutGrid, CalendarClock, Building2, Sparkles } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage, SiteTemplate } from '../../../../lib/companyHomePages';
import {
  domainSummary, formatDateFr, publicationStatus, publicSiteUrl, siteDisplayName,
  type SiteTabId,
} from '../../../../lib/siteWorkspaceModel';
import type { SiteDomainRecord } from '../../../../lib/siteDomainTypes';
import { ENTITY_LABELS, type SiteTarget } from '../../../../lib/siteContextModel';
import {
  BUTTON_BASE, EmptyPanel, InfoTile, PRIMARY_BUTTON_STYLE, SITE_GRADIENT, StatusPill, cardStyle, secondaryButtonStyle,
} from './SiteUiParts';

/* MON SITE : tableau de bord simple du site de l'entreprise ciblee. Aucun jargon technique. */
interface Props {
  t: ThemeTokens;
  target: SiteTarget;
  page: CompanyHomePage | null;
  siteDomain: SiteDomainRecord | null;
  activeTemplate: SiteTemplate | null;
  hasTemplates: boolean;
  onTabChange: (tab: SiteTabId) => void;
}

export default function SiteOverviewTab({ t, target, page, siteDomain, activeTemplate, hasTemplates, onTabChange }: Props) {
  const ownerLabel = target.entityType ? `${target.name} · ${ENTITY_LABELS[target.entityType]}` : target.name;

  if (!page) {
    return (
      <EmptyPanel
        t={t}
        icon={<Sparkles className="w-6 h-6" />}
        title="Votre site n'est pas encore créé"
        text={hasTemplates
          ? `Choisissez un template pour créer le site de ${target.name}.`
          : "Aucun template n'est encore disponible pour votre entreprise. L'équipe Talvex peut vous en attribuer un."}
        action={hasTemplates ? (
          <button onClick={() => onTabChange('templates')} className={`${BUTTON_BASE} w-full sm:w-auto`} style={PRIMARY_BUTTON_STYLE}>
            <LayoutGrid className="w-4 h-4" /> Choisir un template
          </button>
        ) : undefined}
      />
    );
  }

  const publication = publicationStatus(page, siteDomain);
  const domain = domainSummary(page, siteDomain);
  const link = publicSiteUrl(page, window.location.origin, siteDomain);
  const updated = formatDateFr(page.updated_at);

  return (
    <div className="space-y-3" data-testid="site-overview">
      <div className="rounded-2xl overflow-hidden" style={cardStyle(t)}>
        <div className="h-1.5" style={{ background: SITE_GRADIENT }} />
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Mon site</p>
            <h3 className="text-xl sm:text-2xl font-bold mt-1 break-words" style={{ color: t.heading.primary }}>
              {siteDisplayName(page, target.name)}
            </h3>
            <p className="flex items-center gap-1.5 text-sm sm:text-xs mt-1.5 min-w-0" style={{ color: t.text.secondary }}>
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{ownerLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill t={t} tone={publication.tone} label={publication.label} />
          </div>
          <p className="text-sm sm:text-xs leading-relaxed -mt-1" style={{ color: t.text.tertiary }}>
            {publication.hint}
          </p>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
            {link.url ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE} data-testid="site-open-public">
                <ExternalLink className="w-4 h-4" /> Voir mon site
              </a>
            ) : (
              <button disabled className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE} title={link.hint}>
                <ExternalLink className="w-4 h-4" /> Voir mon site
              </button>
            )}
            <button onClick={() => onTabChange('apercu')} className={BUTTON_BASE} style={secondaryButtonStyle(t)}>
              <Eye className="w-4 h-4" /> Aperçu
            </button>
          </div>
          {!link.url && <p className="text-sm sm:text-xs -mt-2" style={{ color: t.text.tertiary }}>{link.hint}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoTile t={t} icon={<LayoutGrid className="w-4 h-4" />} label="Template"
          action={
            <button onClick={() => onTabChange('templates')} className={`${BUTTON_BASE} w-full`} style={secondaryButtonStyle(t)}>
              Changer de template
            </button>
          }>
          <p className="text-base sm:text-sm font-semibold break-words" style={{ color: t.text.primary }}>
            {activeTemplate?.name ?? 'Aucun template'}
          </p>
        </InfoTile>

        <InfoTile t={t} icon={<Globe className="w-4 h-4" />} label="Domaine"
          action={
            <button onClick={() => onTabChange('domaine')} className={`${BUTTON_BASE} w-full`} style={secondaryButtonStyle(t)}>
              Gérer mon domaine
            </button>
          }>
          <p className="text-base sm:text-sm font-semibold break-all" style={{ color: t.text.primary }}>
            {domain.domain ?? 'Aucun domaine'}
          </p>
          {domain.domain && (
            <div className="mt-2"><StatusPill t={t} tone={domain.tone} label={domain.label} /></div>
          )}
        </InfoTile>

        <InfoTile t={t} icon={<CalendarClock className="w-4 h-4" />} label="Dernière modification">
          <p className="text-base sm:text-sm font-semibold" style={{ color: t.text.primary }}>{updated ?? 'Non disponible'}</p>
        </InfoTile>
      </div>
    </div>
  );
}
