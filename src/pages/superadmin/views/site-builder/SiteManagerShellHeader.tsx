import { Globe, X, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import SiteTabs, { type SiteTab } from './SiteTabs';
import type { SiteTabConfig } from './SiteTabReorderModal';

interface Props {
  t: ThemeTokens;
  title: string;
  activeTab: SiteTab;
  onTabChange: (tab: SiteTab) => void;
  tabConfig: SiteTabConfig;
  hideDomainTab?: boolean;
  onReorderOpen: () => void;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SiteManagerShellHeader({
  t, title, activeTab, onTabChange, tabConfig, hideDomainTab,
  onReorderOpen, onClose, onBack,
}: Props) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 flex-shrink-0"
      style={{ borderBottom: `1px solid ${t.surface.border}` }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      )}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
      >
        <Globe className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-xs font-bold truncate mr-2" style={{ color: t.heading.primary }}>{title}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <SiteTabs
              activeTab={activeTab}
              onTabChange={onTabChange}
              hideDomainTab={hideDomainTab}
              customOrder={tabConfig.order}
              hiddenTabs={tabConfig.hidden}
            />
          </div>
          <button
            onClick={onReorderOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 hover:scale-105"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#0ea5e9' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reorganiser</span>
          </button>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all"
          style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
