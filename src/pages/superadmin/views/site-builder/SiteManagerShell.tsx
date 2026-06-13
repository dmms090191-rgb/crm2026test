import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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
import type { SiteTab } from './SiteTabs';
import SitePreviewTab from './SitePreviewTab';
import SiteTemplatesTab from './SiteTemplatesTab';
import SiteDomainTab from './SiteDomainTab';
import SiteStudioTab from './SiteStudioTab';
import SADomainsModal from '../sites/SADomainsModal';
import SiteTabReorderModal, { type SiteTabConfig } from './SiteTabReorderModal';
import { type SiteOwnerType, DEFAULT_TAB_CONFIG, reconcileTabConfig } from './siteManagerShellHelpers';
import SiteManagerShellHeader from './SiteManagerShellHeader';

export type { SiteOwnerType };

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
  const [studioEditorOpen, setStudioEditorOpen] = useState(false);

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
        const raw = pref.site_tab_config as SiteTabConfig;
        if (Array.isArray(raw.order) && raw.order.length > 0) {
          const cfg = reconcileTabConfig(raw);
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

  const isStudio = activeTab === 'studio';
  const isImmersiveEditor = isStudio && studioEditorOpen;

  return (
    <div className="flex flex-col h-full min-h-0">
      {!isImmersiveEditor && (
        <SiteManagerShellHeader
          t={t} title={title} activeTab={activeTab} onTabChange={setActiveTab}
          tabConfig={tabConfig} hideDomainTab={hideDomainTab}
          onReorderOpen={() => setReorderOpen(true)}
          onClose={onClose} onBack={onBack}
        />
      )}

      <div className={`flex-1 min-h-0 ${isStudio ? '' : 'overflow-y-auto'}`}>
        <div className={isStudio ? 'h-full' : 'p-3'}>
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
              {activeTab === 'studio' && (
                <SiteStudioTab
                  page={page}
                  activeTemplate={activeTemplate}
                  onTabChange={setActiveTab}
                  onTemplateCreated={() => loadData(true)}
                  editorOpen={studioEditorOpen}
                  onEditorOpenChange={setStudioEditorOpen}
                />
              )}
              {activeTab === 'domaine' && (
                <SiteDomainTab page={page} onOpenDomainManager={() => setDomainModalOpen(true)} ownerType={ownerType === 'super_admin' ? 'super_admin' : 'admin_company'} onPageRefresh={() => loadData(true)} />
              )}
            </>
          )}
        </div>
      </div>

      {domainModalOpen && pageAsWithCompany && (
        <SADomainsModal
          page={pageAsWithCompany}
          onClose={() => setDomainModalOpen(false)}
          onChanged={() => { setDomainModalOpen(false); loadData(true); }}
        />
      )}
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
