import { Clock, Info } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { describeRow, type SearchRow } from '../../../../lib/domainSearchModel';
import { BuySoonButton, DomainName, DomainStatusBadge, HOVER_BORDER_CLASS, hoverBorderStyle } from './SiteDomainResultParts';

/*
 * Extension recommandee (.com .fr .net .org .eu .io ou extension saisie) presentee en carte :
 * nom, statut, prix (cout Hostinger pour Talvex, « Prix client : bientot disponible » sinon),
 * bouton Acheter DESACTIVE. La ligne « non proposee » occupe toute la largeur de la grille.
 */
interface Props {
  t: ThemeTokens;
  row: SearchRow;
  actorIsTalvex: boolean;
  requested: boolean;
}

export default function SiteDomainResultCard({ t, row, actorIsTalvex, requested }: Props) {
  const view = describeRow(row, actorIsTalvex);

  if (row.status === 'not_offered') {
    return (
      <li className="col-span-full rounded-2xl px-4 py-3.5 sm:px-5"
        style={{ border: `1px dashed ${t.surface.border}` }} data-testid="site-domain-result" data-status={row.status}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <DomainName domain={row.domain} tld={row.tld} color={t.text.tertiary} tldColor={t.text.tertiary}
            className="text-base sm:text-[15px] font-semibold" />
          <DomainStatusBadge t={t} status={row.status} label={view.label} />
        </div>
        <p className="text-sm sm:text-xs mt-1" style={{ color: t.text.tertiary }}>
          {view.condition} Les extensions proposées sont vérifiées ci-dessous.
        </p>
      </li>
    );
  }

  const available = row.status === 'available';
  const price = view.price;

  return (
    <li className={`rounded-2xl p-4 sm:p-5 flex flex-col min-w-0 transition-colors duration-200 ${HOVER_BORDER_CLASS}`}
      style={{
        background: available ? t.card.bg : 'transparent',
        boxShadow: available ? '0 1px 2px rgba(0,0,0,0.10)' : 'none',
        ...hoverBorderStyle(t.surface.border, t.accent.border),
      }}
      data-testid="site-domain-result" data-status={row.status}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <DomainName domain={row.domain} tld={row.tld}
          color={available ? t.heading.primary : t.text.tertiary} tldColor={available ? t.text.secondary : t.text.tertiary}
          className="text-lg sm:text-base font-semibold tracking-tight leading-snug" />
        <DomainStatusBadge t={t} status={row.status} label={view.label} />
      </div>
      {requested && (
        <p className="mt-1 text-[11px] font-medium" style={{ color: t.text.tertiary }}>Extension recherchée</p>
      )}

      {available && price?.kind === 'provider' && (
        <div className="mt-3 sm:mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Coût Hostinger 1re année</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight" style={{ color: t.heading.primary }}>{price.firstYear}</p>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 flex items-center justify-between gap-3 text-sm sm:text-xs" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <span style={{ color: t.text.tertiary }}>Renouvellement</span>
            <span className="font-medium tabular-nums whitespace-nowrap" style={{ color: t.text.secondary }}>{price.renewal}</span>
          </div>
        </div>
      )}
      {available && price && price.kind !== 'provider' && (
        <p className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm sm:text-xs"
          style={{ background: t.surface.secondary, color: t.text.secondary }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.tertiary }} aria-hidden="true" />
          {price.text}
        </p>
      )}
      {row.status === 'unavailable' && (
        <p className="mt-3 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>Ce nom n'est pas libre avec cette extension.</p>
      )}
      {row.status === 'unknown' && (
        <p className="mt-3 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>La vérification n'a pas abouti. Relancez la recherche dans quelques instants.</p>
      )}

      {view.condition && (
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />{view.condition}
        </p>
      )}

      {view.showBuyPlaceholder && (
        <div className="mt-auto pt-3.5 sm:pt-4">
          <BuySoonButton t={t} fullWidth />
        </div>
      )}
    </li>
  );
}
