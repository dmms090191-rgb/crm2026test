import { useState, useEffect, useCallback } from 'react';
import { Globe, X, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import {
  getHomePageByCompanyId,
  getAllTemplates,
  getTemplateById,
  applyTemplate,
  createHomePageWithTemplate,
  type CompanyHomePage,
  type CompanyHomePageWithCompany,
  type SiteTemplate,
} from '../../../../lib/companyHomePages';
import SiteTabs, { type SiteTab } from './SiteTabs';
import SitePreviewTab from './SitePreviewTab';
import SiteTemplatesTab from './SiteTemplatesTab';
import SiteDomainTab from './SiteDomainTab';
import SADomainsModal from '../sites/SADomainsModal';

export type SiteOwnerType = 'super_admin' | 'admin_company' | 'crm_societe';

interface Props {
  ownerType: SiteOwnerType;
  title: string;
  subtitle: string;
  companyId?: string | null;
  societeId?: string | null;
  onClose?: () => void;
}

export default function SiteManagerShell({ ownerType, title, subtitle, companyId: companyIdProp, onClose }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SiteTab>('apercu');
  const [loading, setLoading] = useState(true);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(companyIdProp ?? null);
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<SiteTemplate | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState<string | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);

  useEffect(() => {
    if (companyIdProp) { setResolvedCompanyId(companyIdProp); return; }
    if (ownerType !== 'super_admin') return;
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const fromMeta = user?.user?.app_metadata?.company_id;
      if (fromMeta) { setResolvedCompanyId(fromMeta); return; }
      const { data } = await supabase.from('companies').select('id').limit(1).maybeSingle();
      if (data) setResolvedCompanyId(data.id);
    })();
  }, [companyIdProp, ownerType]);

  const loadData = useCallback(async () => {
    if (!resolvedCompanyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [tmpls, homePage] = await Promise.all([
        getAllTemplates(),
        getHomePageByCompanyId(resolvedCompanyId),
      ]);
      setTemplates(tmpls);
      setPage(homePage);
      if (homePage?.active_template_id) {
        const tmpl = await getTemplateById(homePage.active_template_id);
        setActiveTemplate(tmpl);
      } else {
        setActiveTemplate(null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [resolvedCompanyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApply = async (template: SiteTemplate) => {
    if (!resolvedCompanyId) return;
    if (page) {
      await applyTemplate(page.id, template.id);
    } else {
      await createHomePageWithTemplate(resolvedCompanyId, template.id);
    }
    await loadData();
    setPreviewTemplateKey(null);
    setPreviewTemplateName(null);
    setActiveTab('apercu');
  };

  const handlePreview = (template: SiteTemplate) => {
    setPreviewTemplateKey(template.template_key);
    setPreviewTemplateName(template.name);
  };

  const handleApplyPreview = async () => {
    if (!previewTemplateKey) return;
    const tmpl = templates.find(t => t.template_key === previewTemplateKey);
    if (tmpl) {
      await handleApply(tmpl);
      setPreviewTemplateKey(null);
      setPreviewTemplateName(null);
    }
  };

  const handleClearPreview = () => {
    setPreviewTemplateKey(null);
    setPreviewTemplateName(null);
  };

  const pageAsWithCompany: CompanyHomePageWithCompany | null = page
    ? { ...page, companies: null }
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 20px rgba(14,165,233,0.35)' }}
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

      {/* Content */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}
      >
        <SiteTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
            </div>
          ) : (
            <>
              {activeTab === 'apercu' && (
                <SitePreviewTab
                  activeTemplateKey={activeTemplate?.template_key ?? null}
                  previewTemplateKey={previewTemplateKey}
                  previewTemplateName={previewTemplateName}
                  onTabChange={setActiveTab}
                  onApplyPreview={handleApplyPreview}
                  onClearPreview={handleClearPreview}
                />
              )}
              {activeTab === 'templates' && (
                <SiteTemplatesTab
                  templates={templates}
                  activeTemplateId={page?.active_template_id ?? null}
                  onPreview={handlePreview}
                  onApply={handleApply}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === 'domaine' && (
                <SiteDomainTab page={page} onOpenDomainManager={() => setDomainModalOpen(true)} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Domain modal (existing component) */}
      {domainModalOpen && pageAsWithCompany && (
        <SADomainsModal
          page={pageAsWithCompany}
          onClose={() => setDomainModalOpen(false)}
          onChanged={() => { setDomainModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
