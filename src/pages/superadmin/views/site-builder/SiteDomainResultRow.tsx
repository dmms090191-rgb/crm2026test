import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { describeRow, type SearchRow } from '../../../../lib/domainSearchModel';
import { BuySoonButton, DomainName, DomainStatusBadge } from './SiteDomainResultParts';

/*
 * Une ligne compacte par extension verifiee (recommandees et autres extensions).
 * wide (ordinateur) : colonnes alignees DOMAINE / STATUT / 1RE ANNEE / RENOUVELLEMENT / ACTION ;
 * sinon (mobile, conteneur etroit) : petite fiche verticale, jamais de tableau horizontal.
 * Prix : cout Hostinger pour Talvex, « Prix client : bientot disponible » sinon. Acheter DESACTIVE.
 */
export const OTHER_COLUMNS = 'minmax(0,1fr) 128px 112px 136px 196px';

interface Props {
  t: ThemeTokens;
  row: SearchRow;
  actorIsTalvex: boolean;
  wide: boolean;
  divider: boolean;
  /* Extension saisie dans la recherche (« popolera.fr ») : petite mention a cote du nom. */
  requested?: boolean;
}

export default function SiteDomainResultRow({ t, row, actorIsTalvex, wide, divider, requested = false }: Props) {
  const view = describeRow(row, actorIsTalvex);
  const available = row.status === 'available';
  const price = view.price;
  const dash = <span aria-hidden="true" style={{ color: t.text.quaternary }}>—</span>;
  const name = (
    <DomainName domain={row.domain} tld={row.tld}
      color={available ? t.heading.primary : t.text.tertiary} tldColor={available ? t.text.secondary : t.text.tertiary}
      className={wide ? 'text-sm font-semibold' : 'text-[15px] font-semibold'} />
  );
  const condition = view.condition && (
    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: t.text.tertiary }}>{view.condition}</p>
  );
  const rowStyle = { borderTop: divider ? `1px solid ${t.surface.border}` : 'none' };

  if (wide) {
    return (
      <li className="grid items-center gap-4 px-5 min-h-[56px] py-2.5 transition-colors duration-150 [@media(hover:hover)]:hover:bg-[color:var(--dom-row-hover)]"
        style={{ ...rowStyle, gridTemplateColumns: OTHER_COLUMNS }}
        data-testid="site-domain-result" data-status={row.status}>
        <div className="min-w-0">
          {requested ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {name}
              <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: t.text.tertiary }}>Extension recherchée</span>
            </div>
          ) : name}
          {condition}
        </div>
        <div><DomainStatusBadge t={t} status={row.status} label={view.label} /></div>
        {price?.kind === 'provider' ? (
          <>
            {/* L'en-tete de colonnes est masque aux lecteurs d'ecran : libelles repris ici. */}
            <p className="text-sm font-semibold tabular-nums whitespace-nowrap" style={{ color: t.heading.primary }}>
              <span className="sr-only">Coût Hostinger 1re année : </span>{price.firstYear}
            </p>
            <p className="text-xs tabular-nums whitespace-nowrap" style={{ color: t.text.secondary }}>
              <span className="sr-only">Renouvellement : </span>{price.renewal}
            </p>
          </>
        ) : price ? (
          <p className="col-span-2 text-xs" style={{ color: t.text.secondary }}>{price.text}</p>
        ) : actorIsTalvex ? (
          <>{dash}{dash}</>
        ) : (
          <div className="col-span-2">{dash}</div>
        )}
        <div>{view.showBuyPlaceholder ? <BuySoonButton t={t} compact /> : dash}</div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3.5" style={rowStyle} data-testid="site-domain-result" data-status={row.status}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {name}
        <DomainStatusBadge t={t} status={row.status} label={view.label} />
      </div>
      {condition}
      {available && (
        <div className="mt-2.5 space-y-2.5">
          {price?.kind === 'provider' ? (
            <dl className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <dt className="text-[11px]" style={{ color: t.text.tertiary }}>Coût 1re année</dt>
                <dd className="text-[15px] font-semibold tabular-nums" style={{ color: t.heading.primary }}>{price.firstYear}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px]" style={{ color: t.text.tertiary }}>Renouvellement</dt>
                <dd className="text-sm tabular-nums" style={{ color: t.text.secondary }}>{price.renewal}</dd>
              </div>
            </dl>
          ) : price && (
            <p className="text-sm" style={{ color: t.text.secondary }}>{price.text}</p>
          )}
          {view.showBuyPlaceholder && <BuySoonButton t={t} fullWidth />}
        </div>
      )}
    </li>
  );
}
