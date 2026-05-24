import { useState } from 'react';
import { Globe, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import SiteTabs, { type SiteTab } from './SiteTabs';
import SiteEmptyState from './SiteEmptyState';

export type SiteOwnerType = 'super_admin' | 'admin_company' | 'crm_societe';

interface Props {
  ownerType: SiteOwnerType;
  title: string;
  subtitle: string;
  companyId?: string | null;
  societeId?: string | null;
  emptyMessage?: string;
  onClose?: () => void;
}

export default function SiteManagerShell({ ownerType, title, subtitle, companyId, societeId, emptyMessage, onClose }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SiteTab>('apercu');

  const defaultEmpty = ownerType === 'super_admin'
    ? 'Aucun site officiel Talvex cree pour le moment'
    : 'Aucun site cree pour cette societe';

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            boxShadow: '0 0 20px rgba(14,165,233,0.35)',
          }}
        >
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold truncate" style={{ color: t.heading.primary }}>{title}</h2>
          <p className="text-[11px] sm:text-xs truncate" style={{ color: t.label.muted }}>{subtitle}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
      >
        <SiteTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="min-h-[200px]">
          {activeTab === 'apercu' && <SiteEmptyState message={emptyMessage ?? defaultEmpty} />}
          {activeTab === 'creer-ia' && <TabPlaceholder label="Creer avec IA" description="L'outil de creation de site par intelligence artificielle sera disponible ici." />}
          {activeTab === 'modifier' && <TabPlaceholder label="Modifier le site" description="L'editeur de site sera disponible ici pour personnaliser les pages, les couleurs et le contenu." />}
          {activeTab === 'parametres' && <TabPlaceholder label="Parametres" description="Les parametres du site (SEO, analytics, redirections) seront configures ici." />}
          {activeTab === 'domaine' && <TabPlaceholder label="Domaine" description="La gestion du nom de domaine et des certificats SSL sera disponible ici." />}
        </div>
      </div>
    </div>
  );
}

function TabPlaceholder({ label, description }: { label: string; description: string }) {
  const t = useThemeTokens();
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}>
        <Globe className="w-5 h-5" style={{ color: t.text.tertiary }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: t.text.secondary }}>{label}</p>
      <p className="text-xs max-w-sm" style={{ color: t.text.tertiary }}>{description}</p>
    </div>
  );
}
