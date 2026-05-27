import { Globe, LayoutGrid, Eye, ExternalLink, Settings2, CheckCircle2, Link2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getTemplateComponent } from './templates/templateRegistry';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import type { SiteTab } from './SiteTabs';

interface Props {
  activeTemplateKey: string | null;
  previewTemplateKey: string | null;
  previewTemplateName: string | null;
  page: CompanyHomePage | null;
  onTabChange: (tab: SiteTab) => void;
  onApplyPreview: () => void;
  onClearPreview: () => void;
}

export default function SitePreviewTab({
  activeTemplateKey,
  previewTemplateKey,
  previewTemplateName,
  page,
  onTabChange,
  onApplyPreview,
  onClearPreview,
}: Props) {
  const t = useThemeTokens();
  const isPreview = !!previewTemplateKey;
  const displayKey = previewTemplateKey ?? activeTemplateKey;

  if (!displayKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 0 24px rgba(14,165,233,0.1)',
          }}
        >
          <Globe className="w-7 h-7" style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>
          Aucun site actif pour le moment
        </p>
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          Choisissez un template dans l'onglet Templates pour creer votre site.
        </p>
        <button
          onClick={() => onTabChange('templates')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Choisir un template
        </button>
      </div>
    );
  }

  const TemplateComponent = getTemplateComponent(displayKey);
  const siteSlug = page?.slug;
  const publicUrl = siteSlug ? `${window.location.origin}/site/${siteSlug}` : null;
  const hasDomain = !!page?.custom_domain && page.domain_verified;

  return (
    <div className="space-y-3">
      {/* Preview banner */}
      {isPreview && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold truncate" style={{ color: '#f59e0b' }}>
              Previsualisation : {previewTemplateName}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClearPreview}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              Fermer
            </button>
            <button
              onClick={onApplyPreview}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
            >
              Appliquer ce template
            </button>
          </div>
        </div>
      )}

      {/* Site info bar */}
      {!isPreview && page && siteSlug && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />
              <span className="text-xs font-bold" style={{ color: '#16a34a' }}>Actif</span>
            </div>
            <div className="h-4 w-px" style={{ background: t.surface.border }} />
            <div className="flex items-center gap-1.5 min-w-0">
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.tertiary }} />
              <span className="text-xs font-mono truncate" style={{ color: t.text.secondary }}>
                /site/{siteSlug}
              </span>
            </div>
            {hasDomain && (
              <>
                <div className="h-4 w-px hidden sm:block" style={{ background: t.surface.border }} />
                <span className="text-xs font-semibold hidden sm:inline truncate" style={{ color: '#0ea5e9' }}>
                  {page.custom_domain}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 1px 6px rgba(14,165,233,0.25)' }}
              >
                <ExternalLink className="w-3 h-3" />
                Ouvrir le site
              </a>
            )}
            <button
              onClick={() => onTabChange('templates')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              <LayoutGrid className="w-3 h-3" />
              Changer
            </button>
            <button
              onClick={() => onTabChange('domaine')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              <Settings2 className="w-3 h-3" />
              Domaine
            </button>
          </div>
        </div>
      )}

      {/* Template render area */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${t.surface.border}`, height: 600, maxHeight: '75vh' }}
      >
        {TemplateComponent ? (
          <div className="w-full h-full overflow-y-auto" style={{ background: '#020617' }}>
            <TemplateComponent />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: t.surface.secondary }}>
            <p className="text-xs" style={{ color: t.text.tertiary }}>Template non disponible</p>
          </div>
        )}
      </div>
    </div>
  );
}
