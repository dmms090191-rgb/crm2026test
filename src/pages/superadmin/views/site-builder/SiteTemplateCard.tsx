import { useState } from 'react';
import { Check, Eye, LayoutTemplate, Star, AlertCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteTemplate } from '../../../../lib/companyHomePages';
import type { TemplateEntry } from '../../../../lib/siteWorkspaceModel';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, StatusPill, cardStyle, secondaryButtonStyle } from './SiteUiParts';

/* Visuel de repli quand un template n'a pas d'image (aucun n'en a aujourd'hui en base). */
const TEMPLATE_GRADIENTS: Record<string, string> = {
  talvex_official: 'linear-gradient(135deg, #0ea5e9 0%, #0e7490 100%)',
  renewable_energy: 'linear-gradient(135deg, #10b981 0%, #ca8a04 100%)',
  heat_pump: 'linear-gradient(135deg, #f97316 0%, #0284c7 100%)',
  fitness: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
  real_estate: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
  renovation: 'linear-gradient(135deg, #d97706 0%, #57534e 100%)',
  gold_buying: 'linear-gradient(135deg, #d4a017 0%, #78350f 100%)',
  builder_ready: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
  barbie_wellness: 'linear-gradient(135deg, #c9956b 0%, #6b8e6b 100%)',
};

interface Props {
  t: ThemeTokens;
  entry: TemplateEntry;
  showAssignment: boolean;
  onPreview: (template: SiteTemplate) => void;
  onUse: (template: SiteTemplate) => void;
}

export default function SiteTemplateCard({ t, entry, showAssignment, onPreview, onUse }: Props) {
  const { template, isActive, isAssigned, isOwnedByTarget } = entry;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!template.thumbnail_url && !imageFailed;

  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col min-w-0"
      data-testid={`site-template-${template.template_key}`}
      style={{ ...cardStyle(t), border: isActive ? '1px solid rgba(16,185,129,0.55)' : cardStyle(t).border }}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden"
        style={{ background: TEMPLATE_GRADIENTS[template.template_key] ?? 'linear-gradient(135deg, #334155, #0f172a)' }}>
        {showImage ? (
          <img src={template.thumbnail_url!} alt="" loading="lazy" onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <LayoutTemplate className="w-8 h-8 text-white/90" />
            <span className="text-white font-bold text-base leading-tight line-clamp-2 drop-shadow">{template.name}</span>
          </div>
        )}
        {isActive && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow">
            <Check className="w-3.5 h-3.5" /> Utilisé actuellement
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <h4 className="text-base sm:text-sm font-bold break-words" style={{ color: t.heading.primary }}>{template.name}</h4>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {template.category && <StatusPill t={t} tone="neutral" label={template.category} />}
            {isOwnedByTarget && <StatusPill t={t} tone="success" label="Créé pour cette entreprise" icon={<Star className="w-3 h-3" />} />}
            {showAssignment && !isAssigned && (
              <StatusPill t={t} tone="warning" label="Non attribué" icon={<AlertCircle className="w-3 h-3" />} />
            )}
          </div>
        </div>

        {template.description && (
          <p className="text-sm sm:text-xs leading-relaxed line-clamp-3" style={{ color: t.text.secondary }}>{template.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
          <button onClick={() => onPreview(template)} className={BUTTON_BASE} style={secondaryButtonStyle(t)}>
            <Eye className="w-4 h-4" /> Aperçu
          </button>
          <button onClick={() => onUse(template)} disabled={isActive} className={BUTTON_BASE}
            style={isActive ? { background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text } : PRIMARY_BUTTON_STYLE}>
            {isActive ? <><Check className="w-4 h-4" /> Utilisé</> : 'Utiliser'}
          </button>
        </div>
      </div>
    </article>
  );
}
