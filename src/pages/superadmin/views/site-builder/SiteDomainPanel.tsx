import { Globe, ShoppingBag, RefreshCw, ShieldCheck, Info, CalendarClock } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import type { SiteDomainRecord } from '../../../../lib/siteDomainTypes';
import { domainSummary, formatDateFr, publicSiteUrl } from '../../../../lib/siteWorkspaceModel';
import { SITE_ACCENT, StatusPill, cardStyle } from './SiteUiParts';
import SiteDomainSearch from './SiteDomainSearch';

/*
 * DOMAINE (Groupe / Societe).
 * - Affiche seulement des informations reelles : site_domains (via get_site_domains), sinon
 *   les anciennes colonnes de company_home_pages.
 * - Recherche de disponibilite : branchee sur le serveur Talvex (compte Hostinger central, lecture seule).
 * - Achat et renouvellement : pas encore disponibles (bouton Acheter desactive). Rien n'est simule.
 */
interface Props {
  t: ThemeTokens;
  page: CompanyHomePage | null;
  siteDomain: SiteDomainRecord | null;
  /* Entreprise ciblee par le SiteContext (verifiee a nouveau par le serveur a chaque recherche). */
  companyId: string;
  actorIsTalvex: boolean;
}

const UPCOMING = [
  { icon: <ShoppingBag className="w-4 h-4" />, text: "L'acheter en quelques clics" },
  { icon: <RefreshCw className="w-4 h-4" />, text: 'Suivre son renouvellement' },
];

export default function SiteDomainPanel({ t, page, siteDomain, companyId, actorIsTalvex }: Props) {
  const domain = domainSummary(page, siteDomain);
  const renewal = formatDateFr(domain.renewalDate);
  const talvexAddress = page ? publicSiteUrl({ ...page, custom_domain: null }, window.location.origin) : null;

  return (
    <div className="space-y-3" data-testid="site-domain-panel">
      <div className="rounded-2xl p-4 sm:p-5" style={cardStyle(t)}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(14,165,233,0.10)', color: SITE_ACCENT }}>
            <Globe className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Votre domaine</p>
            <p className="text-lg sm:text-base font-bold break-all" style={{ color: t.heading.primary }}>
              {domain.domain ?? 'Aucun domaine pour le moment'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {domain.domain && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill t={t} tone={domain.tone} label={domain.label} />
            </div>
          )}
          <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>{domain.hint}</p>
          {renewal && (
            <p className="flex items-center gap-1.5 text-sm sm:text-xs" style={{ color: t.text.secondary }}>
              <CalendarClock className="w-3.5 h-3.5" /> {domain.renewalDue ? 'Renouvellement à prévoir le' : 'Renouvellement le'} {renewal}
            </p>
          )}
          {!domain.domain && talvexAddress?.url && (
            <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              Votre site reste accessible à son adresse Talvex en attendant.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-4 sm:p-5" style={cardStyle(t)} data-testid="site-domain-upcoming">
        <p className="text-base sm:text-sm font-bold" style={{ color: t.heading.primary }}>Obtenir un nom de domaine</p>
        <p className="text-sm sm:text-xs mt-1.5 leading-relaxed" style={{ color: t.text.secondary }}>
          Vérifiez si le nom de votre choix est libre. Talvex s'occupe de tout : vous n'avez aucun compte à créer chez un hébergeur.
        </p>

        <SiteDomainSearch t={t} companyId={companyId} actorIsTalvex={actorIsTalvex} />

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)', color: SITE_ACCENT }}>
              Bientôt disponible
            </span>
          </div>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {UPCOMING.map(item => (
              <li key={item.text} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm sm:text-xs"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                <span style={{ color: SITE_ACCENT }}>{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-1.5 mt-4 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" /> Votre domaine appartiendra toujours au site de votre entreprise.
        </p>
      </div>

      {actorIsTalvex && (
        <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" data-testid="site-domain-talvex-note"
          style={{ background: t.surface.secondary, border: `1px dashed ${t.surface.border}` }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: SITE_ACCENT }} />
          <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>
            Espace Talvex : les outils techniques des domaines restent disponibles dans Talvex › Sites &amp; Domaines.
          </p>
        </div>
      )}
    </div>
  );
}
