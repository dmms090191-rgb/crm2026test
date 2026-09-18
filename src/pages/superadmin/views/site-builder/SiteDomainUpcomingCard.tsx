import { RefreshCw, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { SITE_ACCENT, cardStyle } from './SiteUiParts';

/*
 * CARTE « BIENTOT DISPONIBLE » — conservee, volontairement PAS montee.
 * Elle annoncait l'achat d'un domaine et le suivi du renouvellement depuis Talvex.
 * Retiree du parcours Site le 18/09/2026 : tant que l'achat n'existe pas, l'ecran ne doit pas
 * laisser croire qu'on peut acheter un domaine ici. Le parcours se limite a : je saisis le
 * domaine que je possede deja -> Verifier -> Choisir ce domaine.
 * Le fichier reste en place pour pouvoir la remonter le jour ou l'achat sera reellement branche.
 */
const UPCOMING = [
  { icon: <ShoppingBag className="w-4 h-4" />, text: "L'acheter en quelques clics" },
  { icon: <RefreshCw className="w-4 h-4" />, text: 'Suivre son renouvellement' },
];

export default function SiteDomainUpcomingCard({ t }: { t: ThemeTokens }) {
  return (
    <div className="rounded-2xl px-4 py-4 sm:px-6" style={cardStyle(t)} data-testid="site-domain-upcoming">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <span className="self-start lg:self-auto px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)', color: SITE_ACCENT }}>
          Bientôt disponible
        </span>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
          {UPCOMING.map(item => (
            <li key={item.text} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm sm:text-xs"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              <span style={{ color: SITE_ACCENT }} aria-hidden="true">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-1.5 mt-3 text-sm sm:text-xs" style={{ color: t.text.tertiary }}>
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> Votre domaine appartiendra toujours au site de votre entreprise.
      </p>
    </div>
  );
}
