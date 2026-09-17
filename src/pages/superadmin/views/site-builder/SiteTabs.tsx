import { Eye, LayoutGrid, Globe, Home } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { SITE_TAB_ORDER, type SiteTabId } from '../../../../lib/siteWorkspaceModel';

/*
 * 'studio' reste dans le type : l'ancien Studio Site est MASQUE (plus d'onglet), pas supprime.
 * Son composant SiteStudioTab.tsx est conserve tel quel.
 */
export type SiteTab = SiteTabId | 'studio';

const TAB_DEFS: Record<SiteTabId, { label: string; icon: React.ReactNode }> = {
  'mon-site': { label: 'Mon site', icon: <Home className="w-4 h-4" /> },
  domaine: { label: 'Domaine', icon: <Globe className="w-4 h-4" /> },
  templates: { label: 'Templates', icon: <LayoutGrid className="w-4 h-4" /> },
  apercu: { label: 'Aperçu', icon: <Eye className="w-4 h-4" /> },
};

interface Props {
  activeTab: SiteTabId;
  onTabChange: (tab: SiteTabId) => void;
}

/* Toujours exactement 4 onglets, dans cet ordre (y compris depuis les listes Talvex). */
export default function SiteTabs({ activeTab, onTabChange }: Props) {
  const t = useThemeTokens();
  const tabs = SITE_TAB_ORDER;

  return (
    <div
      role="tablist"
      aria-label="Sections du site"
      className="grid gap-1 p-1 rounded-xl w-full"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`, background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
    >
      {tabs.map(id => {
        const active = activeTab === id;
        const def = TAB_DEFS[id];
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            data-testid={`site-tab-${id}`}
            onClick={() => onTabChange(id)}
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 min-h-[48px] sm:min-h-[38px] px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all min-w-0"
            style={{
              background: active ? t.card.bg : 'transparent',
              border: active ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
              boxShadow: active ? '0 1px 8px rgba(14,165,233,0.15)' : 'none',
              color: active ? '#0ea5e9' : t.text.secondary,
            }}
          >
            {def.icon}
            <span className="truncate max-w-full">{def.label}</span>
          </button>
        );
      })}
    </div>
  );
}
