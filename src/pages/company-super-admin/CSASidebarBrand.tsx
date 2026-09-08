import { Shield } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  collapsed: boolean;
  /** Nom du Groupe affiche en petit sous la marque. Ex : « WILLNESS ». */
  companyName?: string;
  /**
   * Logo du Groupe. Quand il sera disponible, il remplace le libelle texte
   * sans aucune autre modification : c'est le seul point a brancher.
   * Tant qu'il vaut null, `brandLabel` s'affiche.
   */
  logoUrl?: string | null;
  /** Repli texte tant qu'aucun logo n'est fourni. */
  brandLabel?: string;
  tokens: ThemeTokens;
}

/**
 * Zone de MARQUE de la sidebar du panel Groupe.
 *
 * Aujourd'hui : badge + libelle texte + nom du Groupe.
 * Demain      : badge + <img> du logo du Groupe + nom du Groupe.
 *
 * Le basculement se fait en passant `logoUrl` — la mise en page, les tailles
 * et les couleurs restent identiques dans les deux cas.
 */
export default function CSASidebarBrand({
  collapsed, companyName, logoUrl = null, brandLabel = 'TALVEX', tokens: t,
}: Props) {
  const badge = (
    <div
      className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${collapsed ? 'mx-auto' : 'flex-shrink-0'}`}
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}
    >
      <Shield className="w-4 h-4 text-white" strokeWidth={2} />
    </div>
  );

  if (collapsed) return badge;

  return (
    <>
      {badge}
      <div className="min-w-0 leading-tight">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandLabel}
            className="h-4 w-auto max-w-full object-contain object-left"
          />
        ) : (
          <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>
            {brandLabel}
          </p>
        )}
        {companyName ? (
          <p className="text-[9px] tracking-[0.2em] uppercase truncate" style={{ color: t.sidebar.logoSub }}>
            {companyName}
          </p>
        ) : null}
      </div>
    </>
  );
}
