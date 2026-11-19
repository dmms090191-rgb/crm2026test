import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { COLONNES_GROUPES } from './colonnesGroupes';

/**
 * Le PREMIER chargement d'une session, quand aucune liste n'est encore connue : la structure du
 * tableau (en-tetes reels, lignes en attente) a la place de l'ancien spinner central. Des qu'une
 * liste a ete lue une fois, src/lib/memoireGroupes.ts la rend aux visites suivantes et ce
 * squelette n'apparait plus.
 */
export default function SASuperAdminsSquelette({ tokens: t }: { tokens: ThemeTokens }) {
  const barre = <div className="h-3.5 rounded animate-pulse" style={{ background: t.surface.hover, width: '64px' }} />;
  return (
    <div data-testid="groupes-squelette" aria-busy="true" aria-label="Chargement des groupes">
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.surface.border}` }}>
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: t.surface.hover }}>
              {COLONNES_GROUPES.map(col => (
                <th key={col} className="px-4 py-3 text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: t.text.tertiary, borderBottom: `1px solid ${t.surface.border}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i} style={{ borderBottom: `1px solid ${t.surface.border}` }}>
                {COLONNES_GROUPES.map(col => <td key={col} className="px-4 py-3.5">{barre}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl p-4 space-y-2.5" style={{ border: `1px solid ${t.surface.border}`, background: t.surface.primary }}>
            <div className="h-4 rounded animate-pulse" style={{ background: t.surface.hover, width: '55%' }} />
            <div className="h-3 rounded animate-pulse" style={{ background: t.surface.hover, width: '75%' }} />
            <div className="h-3 rounded animate-pulse" style={{ background: t.surface.hover, width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
