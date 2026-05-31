import { Eye, LayoutGrid, Globe, Paintbrush } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export type SiteTab = 'domaine' | 'templates' | 'studio' | 'apercu';

interface TabDef { id: SiteTab; label: string; icon: React.ReactNode }

const TABS: TabDef[] = [
  { id: 'domaine', label: 'Domaine', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'templates', label: 'Templates', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'studio', label: 'Studio Site', icon: <Paintbrush className="w-3.5 h-3.5" /> },
  { id: 'apercu', label: 'Apercu du site', icon: <Eye className="w-3.5 h-3.5" /> },
];

interface Props {
  activeTab: SiteTab;
  onTabChange: (tab: SiteTab) => void;
  hideDomainTab?: boolean;
  customOrder?: SiteTab[];
  hiddenTabs?: SiteTab[];
}

export default function SiteTabs({ activeTab, onTabChange, hideDomainTab, customOrder, hiddenTabs }: Props) {
  const t = useThemeTokens();

  const orderedTabs = customOrder
    ? customOrder.map(id => TABS.find(tab => tab.id === id)).filter(Boolean) as TabDef[]
    : TABS;

  const visibleTabs = orderedTabs.filter(tab => {
    if (hideDomainTab && tab.id === 'domaine') return false;
    if (hiddenTabs?.includes(tab.id)) return false;
    return true;
  });

  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
      {visibleTabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: active ? 'rgba(14,165,233,0.1)' : 'transparent',
              border: active ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
              color: active ? '#0ea5e9' : t.text.tertiary,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
