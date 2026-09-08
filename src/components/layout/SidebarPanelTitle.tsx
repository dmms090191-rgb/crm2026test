import type { ThemeTokens } from '../../lib/themeTokensTypes';

/**
 * En-tete de sidebar : le nom du PANEL, sans logo ni marque.
 *
 * Partage par les panels Groupe, Societe et Commercial pour qu'ils restent
 * alignes. Le panel Talvex Administrateur garde son propre en-tete et
 * n'utilise pas ce composant.
 *
 * Le libelle est celui du panel affiche, jamais celui du compte connecte :
 * en Visu, c'est donc le panel visualise qui se nomme, ce qui est le
 * comportement attendu sans aucune logique supplementaire.
 *
 * Hauteur, bordure et espacement reprennent exactement l'ancien bloc — la
 * suppression du logo ne laisse pas de vide. Replie, le libelle se centre
 * dans la colonne etroite au lieu de disparaitre.
 */
export default function SidebarPanelTitle({ label, collapsed, tokens: t, background }: {
  /** Texte visible. Ex. « Societe ». Sans rapport avec le role technique. */
  label: string;
  collapsed: boolean;
  tokens: ThemeTokens;
  /** Fond de la zone, quand le panel en personnalise un. */
  background?: string;
}) {
  return (
    <div
      className={`flex items-center h-16 flex-shrink-0 overflow-hidden ${collapsed ? 'justify-center px-2' : 'px-4'}`}
      style={{ background: background || t.sidebar.bg, borderBottom: `1px solid ${t.sidebar.border}` }}
    >
      <p
        className={`font-bold tracking-tight truncate ${collapsed ? 'text-[11px]' : 'text-sm'}`}
        style={{ color: t.sidebar.logoText }}
        title={collapsed ? label : undefined}
      >
        {label}
      </p>
    </div>
  );
}
