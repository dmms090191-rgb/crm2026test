import { Globe, Search, BadgeCheck, ShoppingBag, RefreshCw, ShieldCheck, Info, CalendarClock } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { domainSummary, formatDateFr, publicSiteUrl } from '../../../../lib/siteWorkspaceModel';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, SITE_ACCENT, StatusPill, cardStyle } from './SiteUiParts';

/*
 * DOMAINE (Groupe / Societe) — INTERFACE UNIQUEMENT.
 * - Affiche seulement des informations reelles (company_home_pages).
 * - Recherche, disponibilite, prix, achat et renouvellement : backend pas encore branche
 *   (futur compte Hostinger central de Talvex). Rien n'est simule.
 */
interface Props {
  t: ThemeTokens;
  page: CompanyHomePage | null;
  actorIsTalvex: boolean;
}

const UPCOMING = [
  { icon: <Search className="w-4 h-4" />, text: 'Rechercher le nom de domaine de votre choix' },
  { icon: <BadgeCheck className="w-4 h-4" />, text: "Voir s'il est disponible et son prix" },
  { icon: <ShoppingBag className="w-4 h-4" />, text: "L'acheter en quelques clics" },
  { icon: <RefreshCw className="w-4 h-4" />, text: 'Suivre son renouvellement' },
];

export default function SiteDomainPanel({ t, page, actorIsTalvex }: Props) {
  const domain = domainSummary(page);
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
              <CalendarClock className="w-3.5 h-3.5" /> Renouvellement le {renewal}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base sm:text-sm font-bold" style={{ color: t.heading.primary }}>Obtenir un nom de domaine</p>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)', color: SITE_ACCENT }}>
            Bientôt disponible
          </span>
        </div>
        <p className="text-sm sm:text-xs mt-1.5 leading-relaxed" style={{ color: t.text.secondary }}>
          La gestion de votre nom de domaine sera disponible ici. Talvex s'occupe de tout : vous n'avez aucun compte à créer chez un hébergeur.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2" aria-disabled="true">
          <input
            disabled
            aria-label="Nom de domaine recherché (bientôt disponible)"
            placeholder="ex. mon-entreprise.fr"
            className="w-full min-h-[44px] sm:min-h-[38px] px-3 rounded-xl text-sm sm:text-xs outline-none cursor-not-allowed opacity-70"
            style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
          />
          <button disabled className={`${BUTTON_BASE} sm:w-auto`} style={PRIMARY_BUTTON_STYLE}>
            <Search className="w-4 h-4" /> Rechercher
          </button>
        </div>

        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {UPCOMING.map(item => (
            <li key={item.text} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm sm:text-xs"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              <span style={{ color: SITE_ACCENT }}>{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>

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
