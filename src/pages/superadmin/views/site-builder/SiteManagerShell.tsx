import { useState, useEffect, useCallback } from 'react';
import { Globe, X, Loader2, SlidersHorizontal, ArrowLeft } from 'lucide-react';
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
import SiteTabReorderModal, { type SiteTabConfig } from './SiteTabReorderModal';

export type SiteOwnerType = 'super_admin' | 'admin_company' | 'crm_societe';

const DEFAULT_TAB_CONFIG: SiteTabConfig = { order: ['apercu', 'templates', 'domaine'], hidden: [] };

interface Props {
  ownerType: SiteOwnerType;
  title: string;
  subtitle: string;
  companyId?: string | null;
  companyName?: string;
  societeId?: string | null;
  hideDomainTab?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SiteManagerShell({ ownerType, title, subtitle, companyId: companyIdProp, companyName: companyNameProp, hideDomainTab, onClose, onBack }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SiteTab>('apercu');
  const [loading, setLoading] = useState(true);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(companyIdProp ?? null);
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyNameProp || '');
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<SiteTemplate | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState<string | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [tabConfig, setTabConfig] = useState<SiteTabConfig>(DEFAULT_TAB_CONFIG);

  const siteScope: SiteScope = ownerType === 'super_admin' ? 'platform' : 'company';

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;
      const uid = user.user.id;

      if (ownerType !== 'super_admin' && !companyIdProp) {
        const cid = user.user.app_metadata?.company_id;
        if (cid) {
          setResolvedCompanyId(cid);
          const { data: co } = await supabase.from('companies').select('name').eq('id', cid).maybeSingle();
          if (co?.name) setResolvedCompanyName(co.name);
        }
      }

      const { data: pref } = await supabase
        .from('user_preferences')
        .select('site_tab_config')
        .eq('user_id', uid)
        .maybeSingle();
      if (pref?.site_tab_config) {
        const cfg = pref.site_tab_config as SiteTabConfig;
        if (Array.isArray(cfg.order) && cfg.order.length > 0) {
          setTabConfig(cfg);
          const firstVisible = cfg.order.find(id => !cfg.hidden?.includes(id));
          if (firstVisible) setActiveTab(firstVisible);
        }
      }
    })();
  }, [companyIdProp, companyNameProp, ownerType]);

  useEffect(() => {
    if (ownerType !== 'super_admin' && companyIdProp) {
      setResolvedCompanyId(companyIdProp);
      if (companyNameProp) setResolvedCompanyName(companyNameProp);
    }
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

  const handleSaveTabConfig = async (cfg: SiteTabConfig) => {
    setTabConfig(cfg);
    if (cfg.hidden.includes(activeTab)) {
      const firstVisible = cfg.order.find(id => !cfg.hidden.includes(id));
      if (firstVisible) setActiveTab(firstVisible);
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const uid = user.user.id;
    await supabase.from('user_preferences').upsert(
      { user_id: uid, site_tab_config: cfg, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
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
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
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
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <SiteTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              hideDomainTab={hideDomainTab}
              customOrder={tabConfig.order}
              hiddenTabs={tabConfig.hidden}
            />
          </div>
          <button
            onClick={() => setReorderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 hover:scale-105"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#0ea5e9' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reorganiser</span>
          </button>
        </div>

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

      {/* Tab reorder modal */}
      {reorderOpen && (
        <SiteTabReorderModal
          config={tabConfig}
          onSave={handleSaveTabConfig}
          onClose={() => setReorderOpen(false)}
          t={t}
          hideDomainTab={hideDomainTab}
        />
      )}
    </div>
  );
}
