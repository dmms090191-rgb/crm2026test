import { Eye, Sparkles, Pencil, Settings, Globe } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export type SiteTab = 'apercu' | 'creer-ia' | 'modifier' | 'parametres' | 'domaine';

interface Props {
  activeTab: SiteTab;
  onTabChange: (tab: SiteTab) => void;
}

const TABS: { id: SiteTab; label: string; icon: React.ReactNode }[] = [
  { id: 'apercu', label: 'Apercu du site', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'creer-ia', label: 'Creer avec IA', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'modifier', label: 'Modifier le site', icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: 'parametres', label: 'Parametres', icon: <Settings className="w-3.5 h-3.5" /> },
  { id: 'domaine', label: 'Domaine', icon: <Globe className="w-3.5 h-3.5" /> },
];

export default function SiteTabs({ activeTab, onTabChange }: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
      {TABS.map(tab => {
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
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
