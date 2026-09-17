import { ShoppingBag } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { describeRow, type SearchRow } from '../../../../lib/domainSearchModel';
import { PRIMARY_BUTTON_STYLE, StatusPill } from './SiteUiParts';

/*
 * Une extension verifiee : nom, statut et, si disponible, prix (cout Hostinger pour Talvex,
 * « Prix client : bientot disponible » sinon) + bouton Acheter DESACTIVE (achat non ouvert).
 */
interface Props {
  t: ThemeTokens;
  row: SearchRow;
  actorIsTalvex: boolean;
  divider: boolean;
}

export default function SiteDomainResultRow({ t, row, actorIsTalvex, divider }: Props) {
  const view = describeRow(row, actorIsTalvex);
  const available = row.status === 'available';
  const pill = <StatusPill t={t} tone={view.tone} label={view.label} />;

  return (
    <li className="px-3 py-3 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
      style={{ borderTop: divider ? `1px solid ${t.surface.border}` : 'none' }}
      data-testid="site-domain-result" data-status={row.status}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-[15px] sm:text-sm font-semibold break-all"
            style={{ color: available ? t.heading.primary : t.text.secondary }}>
            {row.domain}
          </p>
          <span className="sm:hidden flex-shrink-0">{pill}</span>
        </div>
        {view.condition && (
          <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>{view.condition}</p>
        )}
        {view.priceLines.map(line => (
          <p key={line} className="text-xs mt-1" style={{ color: t.text.secondary }}>{line}</p>
        ))}
      </div>

      {/* Emplacements de largeur fixe sur ordinateur : statuts et boutons alignes d'une ligne a l'autre. */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden sm:flex sm:w-[120px] sm:justify-end">{pill}</span>
        {view.showBuyPlaceholder ? (
          <span className="flex items-center gap-2 sm:w-[200px]">
            <button type="button" disabled aria-disabled="true" title="Bientôt disponible"
              className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-xs font-semibold opacity-50 cursor-not-allowed"
              style={PRIMARY_BUTTON_STYLE} data-testid="site-domain-buy-disabled">
              <ShoppingBag className="w-3.5 h-3.5" /> Acheter
            </button>
            <span className="text-[11px] whitespace-nowrap" style={{ color: t.text.tertiary }}>Bientôt disponible</span>
          </span>
        ) : (
          <span className="hidden sm:block sm:w-[200px]" aria-hidden="true" />
        )}
      </div>
    </li>
  );
}
