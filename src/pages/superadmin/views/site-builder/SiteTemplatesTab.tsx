import { useState } from 'react';
import { Eye, Check, LayoutGrid, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { SiteTemplate } from '../../../../lib/companyHomePages';
import type { SiteTab } from './SiteTabs';

interface Props {
  templates: SiteTemplate[];
  activeTemplateId: string | null;
  onPreview: (template: SiteTemplate) => void;
  onApply: (template: SiteTemplate) => Promise<void>;
  onTabChange: (tab: SiteTab) => void;
}

export default function SiteTemplatesTab({ templates, activeTemplateId, onPreview, onApply, onTabChange }: Props) {
  const t = useThemeTokens();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = async (template: SiteTemplate) => {
    setApplyingId(template.id);
    try {
      await onApply(template);
    } finally {
      setApplyingId(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}
        >
          <LayoutGrid className="w-6 h-6" style={{ color: t.text.tertiary }} />
        </div>
        <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Aucun template disponible</p>
        <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Les templates seront ajoutes prochainement.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {templates.map(tmpl => {
        const isActive = tmpl.id === activeTemplateId;
        const isApplying = applyingId === tmpl.id;

        return (
          <TemplateCard
            key={tmpl.id}
            template={tmpl}
            isActive={isActive}
            isApplying={isApplying}
            onPreview={() => { onPreview(tmpl); onTabChange('apercu'); }}
            onApply={() => handleApply(tmpl)}
            t={t}
          />
        );
      })}
    </div>
  );
}

function TemplateCard({ template, isActive, isApplying, onPreview, onApply, t }: {
  template: SiteTemplate;
  isActive: boolean;
  isApplying: boolean;
  onPreview: () => void;
  onApply: () => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
        border: `1px solid ${isActive ? 'rgba(22,163,106,0.45)' : 'rgba(148, 163, 184, 0.15)'}`,
        boxShadow: isActive
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px rgba(22,163,106,0.18), 0 8px 32px rgba(0,0,0,0.30)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      }}
    >
      {/* Color banner */}
      <div className="h-20 relative" style={{ background: CATEGORY_GRADIENT[template.template_key] ?? 'linear-gradient(135deg, #334155, #1e293b)' }}>
        {isActive && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-500/90 text-white">
            <Check className="w-3 h-3" />
            Actif
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Title + Category */}
        <div>
          <h3 className="text-sm font-bold truncate" style={{ color: t.text.primary }}>{template.name}</h3>
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          >
            {template.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: t.text.tertiary }}>
          {template.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onPreview}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            <Eye className="w-3 h-3" />
            Previsualiser
          </button>
          <button
            onClick={onApply}
            disabled={isActive || isApplying}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: isActive ? 'rgba(22,163,106,0.08)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              border: isActive ? '1px solid rgba(22,163,106,0.2)' : 'none',
              color: isActive ? '#16a34a' : '#fff',
              boxShadow: isActive ? 'none' : '0 2px 8px rgba(14,165,233,0.25)',
            }}
          >
            {isApplying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isActive ? (
              <><Check className="w-3 h-3" /> Actif</>
            ) : (
              'Appliquer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_GRADIENT: Record<string, string> = {
  talvex_official: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(6,182,212,0.15))',
  renewable_energy: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(234,179,8,0.15))',
  heat_pump: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(14,165,233,0.15))',
  fitness: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(249,115,22,0.15))',
  real_estate: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(16,185,129,0.15))',
  renovation: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(120,113,108,0.15))',
  gold_buying: 'linear-gradient(135deg, rgba(212,160,23,0.4), rgba(184,134,11,0.15))',
  builder_ready: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(16,185,129,0.15))',
};
