import { useState, useEffect, useCallback } from 'react';
import { Globe, X, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import {
  getHomePageByCompanyId,
  getPlatformHomePage,
  getAllTemplates,
  getTemplateById,
  applyTemplate,
  createOrUpdateSite,
  type CompanyHomePage,
  type CompanyHomePageWithCompany,
  type SiteTemplate,
  type SiteScope,
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
  companyName?: string;
  societeId?: string | null;
  onClose?: () => void;
}

export default function SiteManagerShell({ ownerType, title, subtitle, companyId: companyIdProp, companyName: companyNameProp, onClose }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SiteTab>('apercu');
  const [loading, setLoading] = useState(true);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(companyIdProp ?? null);
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyNameProp || '');
  const [page, setPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<SiteTemplate | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState<string | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);

  const siteScope: SiteScope = ownerType === 'super_admin' ? 'platform' : 'company';

  useEffect(() => {
    if (ownerType === 'super_admin') return;
    if (companyIdProp) {
      setResolvedCompanyId(companyIdProp);
      if (companyNameProp) setResolvedCompanyName(companyNameProp);
      return;
    }
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const cid = user?.user?.app_metadata?.company_id;
      if (cid) {
        setResolvedCompanyId(cid);
        const { data: co } = await supabase.from('companies').select('name').eq('id', cid).maybeSingle();
        if (co?.name) setResolvedCompanyName(co.name);
      }
    })();
  }, [companyIdProp, companyNameProp, ownerType]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tmpls, homePage] = await Promise.all([
        getAllTemplates(),
        siteScope === 'platform'
          ? getPlatformHomePage()
          : resolvedCompanyId ? getHomePageByCompanyId(resolvedCompanyId) : Promise.resolve(null),
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
      if (!silent) setLoading(false);
    }
  }, [resolvedCompanyId, siteScope]);

  useEffect(() => {
    if (siteScope === 'company' && !resolvedCompanyId) return;
    loadData();
  }, [loadData, siteScope, resolvedCompanyId]);

  const handleApply = async (template: SiteTemplate) => {
    if (page) {
      await applyTemplate(page.id, template.id);
    } else {
      await createOrUpdateSite({
        siteScope,
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName,
        templateId: template.id,
      });
    }
    setActiveTemplate(template);
    setPreviewTemplateKey(null);
    setPreviewTemplateName(null);
    setActiveTab('apercu');
    await loadData(true);
  };

  const handlePreview = (template: SiteTemplate) => {
    setPreviewTemplateKey(template.template_key);
    setPreviewTemplateName(template.name);
  };

  const handleApplyPreview = async () => {
    if (!previewTemplateKey) return;
    const tmpl = templates.find(tp => tp.template_key === previewTemplateKey);
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
    ? { ...page, companies: resolvedCompanyName ? { name: resolvedCompanyName } : null }
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
                  page={page}
                  onTabChange={setActiveTab}
                  onApplyPreview={handleApplyPreview}
                  onClearPreview={handleClearPreview}
                />
              )}
              {activeTab === 'templates' && (
                <SiteTemplatesTab
                  templates={templates}
                  activeTemplateId={activeTemplate?.id ?? null}
                  onPreview={handlePreview}
                  onApply={handleApply}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === 'domaine' && (
                <SiteDomainTab page={page} onOpenDomainManager={() => setDomainModalOpen(true)} ownerType={ownerType === 'super_admin' ? 'super_admin' : 'admin_company'} onPageRefresh={() => loadData(true)} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Domain modal */}
      {domainModalOpen && pageAsWithCompany && (
        <SADomainsModal
          page={pageAsWithCompany}
          onClose={() => setDomainModalOpen(false)}
          onChanged={() => { setDomainModalOpen(false); loadData(true); }}
        />
      )}
    </div>
  );
}
