import { useState } from 'react';
import { CalendarClock, Info } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import type { SiteDomainRecord } from '../../../../lib/siteDomainTypes';
import { domainSummary, formatDateFr } from '../../../../lib/siteWorkspaceModel';
import { SITE_ACCENT } from './SiteUiParts';
import SiteDomainConnected from './SiteDomainConnected';
import SiteConnectDomainStep from './SiteConnectDomainStep';

/*
 * DOMAINE (Groupe / Societe) quand un domaine est deja connecte.
 * Vue volontairement simple : l'adresse, son etat, et deux actions — changer de domaine, deconnecter.
 * Tout le travail chez l'hebergeur et le registrar est fait par le serveur : le client n'a jamais a
 * ouvrir un autre outil, et ne voit aucun jargon technique.
 *
 * Le parcours se limite a un domaine que le client possede DEJA : saisir, verifier, choisir.
 * Ni catalogue d'extensions (SiteDomainSearch) ni carte d'achat a venir (SiteDomainUpcomingCard) ne
 * sont montes ici : ces deux ecrans existent toujours sur disque, mais rien ne doit laisser croire
 * qu'on achete un domaine dans Talvex aujourd'hui.
 */
interface Props {
  t: ThemeTokens;
  page: CompanyHomePage | null;
  siteDomain: SiteDomainRecord | null;
  /* Entreprise ciblee par le SiteContext (verifiee a nouveau par le serveur a chaque action). */
  companyId: string;
  targetName: string;
  actorIsTalvex: boolean;
  /* Rechargement apres un changement ou une deconnexion, avec le message a afficher au client. */
  onChanged: (notice: string) => void;
}

export default function SiteDomainPanel({ t, page, siteDomain, companyId, targetName, actorIsTalvex, onChanged }: Props) {
  const [changing, setChanging] = useState(false);
  const summary = domainSummary(page, siteDomain);
  const renewal = formatDateFr(summary.renewalDate);

  if (changing) {
    return (
      <div className="space-y-5" data-testid="site-domain-panel" data-panel-mode="change">
        <SiteConnectDomainStep
          t={t}
          companyId={companyId}
          targetName={targetName}
          mode="switch"
          currentDomain={summary.domain}
          onCancel={() => setChanging(false)}
          onAttached={domain => { setChanging(false); onChanged(`${domain} est maintenant l'adresse de votre site.`); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="site-domain-panel" data-panel-mode="connected">
      <SiteDomainConnected
        t={t}
        companyId={companyId}
        summary={summary}
        onChangeDomain={() => setChanging(true)}
        onDisconnected={() => onChanged('Le domaine a été déconnecté. Il reste votre propriété et vos e-mails ne sont pas touchés.')}
      />

      {renewal && (
        <p className="flex items-center gap-1.5 px-1 text-sm sm:text-xs" style={{ color: t.text.secondary }}>
          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {summary.renewalDue ? 'Renouvellement à prévoir le' : 'Renouvellement le'} {renewal}
        </p>
      )}

      {actorIsTalvex && (
        <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" data-testid="site-domain-talvex-note"
          style={{ background: t.surface.secondary, border: `1px dashed ${t.surface.border}` }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: SITE_ACCENT }} aria-hidden="true" />
          <p className="text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>
            Espace Talvex : les outils techniques des domaines restent disponibles dans Talvex › Sites &amp; Domaines.
          </p>
        </div>
      )}
    </div>
  );
}
