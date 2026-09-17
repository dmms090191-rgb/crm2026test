import type { ReactNode } from 'react';
import { Globe, X, ArrowLeft } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteTabId } from '../../../../lib/siteWorkspaceModel';
import SiteTabs from './SiteTabs';
import { SITE_GRADIENT } from './SiteUiParts';

/*
 * En-tete du module Site : titre, rappel de contexte (Visu), puis les 4 onglets.
 * Le bouton « Reorganiser » est masque : les 4 onglets ont un ordre fixe
 * (SiteTabReorderModal.tsx est conserve, non monte).
 */
interface Props {
  t: ThemeTokens;
  title: string;
  activeTab: SiteTabId;
  onTabChange: (tab: SiteTabId) => void;
  banner?: ReactNode;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SiteManagerShellHeader({ t, title, activeTab, onTabChange, banner, onClose, onBack }: Props) {
  return (
    <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {onBack && (
          <button onClick={onBack} aria-label="Retour"
            className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: SITE_GRADIENT }}>
          <Globe className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-sm font-bold truncate flex-1 min-w-0" style={{ color: t.heading.primary }}>{title}</h2>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer"
            className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {banner}
      <div className="px-3 pb-3 pt-2">
        <SiteTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
