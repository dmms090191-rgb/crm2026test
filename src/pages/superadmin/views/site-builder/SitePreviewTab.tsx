import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, LayoutGrid, Eye, ExternalLink, Settings2, CheckCircle2, Link2, Maximize2, Minimize2 } from 'lucide-react';
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
  const [fullscreen, setFullscreen] = useState(false);
  const isPreview = !!previewTemplateKey;
  const displayKey = previewTemplateKey ?? activeTemplateKey;

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setFullscreen(false);
  }, []);

  useEffect(() => {
    if (fullscreen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [fullscreen, handleEsc]);

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
      <div className="relative">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${t.surface.border}` }}
        >
          {TemplateComponent ? (
            <div
              className="w-full preview-unframe"
              style={{ background: '#020617' }}
            >
              <TemplateComponent />
            </div>
          ) : (
            <div className="flex items-center justify-center py-24" style={{ background: t.surface.secondary }}>
              <p className="text-xs" style={{ color: t.text.tertiary }}>Template non disponible</p>
            </div>
          )}
        </div>

        {TemplateComponent && (
          <button
            onClick={() => setFullscreen(true)}
            className="absolute top-3 right-3 z-[60] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Plein ecran
          </button>
        )}
      </div>

      {/* Fullscreen overlay — portalled to body to escape any parent stacking/overflow */}
      {fullscreen && TemplateComponent && createPortal(
        <div className="fixed inset-0 flex flex-col" style={{ background: '#020617', zIndex: 99999 }}>
          <div className="absolute top-4 right-4" style={{ zIndex: 100000 }}>
            <button
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Quitter
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TemplateComponent />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
