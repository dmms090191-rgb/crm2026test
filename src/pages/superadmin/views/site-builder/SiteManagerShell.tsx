import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import {
  getHomePageByCompanyId,
  getPlatformHomePage,
  getAllTemplates,
  getTemplateById,
  applyTemplate,
  createOrUpdateSite,
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

async function resolveCompanyFromSession(): Promise<{ cid: string | null; cname: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const cid = session?.user?.app_metadata?.company_id ?? null;
  let cname = '';
  if (cid) {
    const { data: co } = await supabase.from('companies').select('name').eq('id', cid).maybeSingle();
    if (co?.name) cname = co.name;
  }
  return { cid, cname };
}

export default function SiteManagerShell({ ownerType, title, subtitle, companyId: companyIdProp, companyName: companyNameProp, onClose }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SiteTab>('apercu');
  const [loading, setLoading] = useState(true);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(companyIdProp ?? null);
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyNameProp || '');
  const [companyIdReady, setCompanyIdReady] = useState(ownerType === 'super_admin' || !!companyIdProp);
  const [page, setPage] = useState<CompanyHomePageWithCompany | null>(null);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<SiteTemplate | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState<string | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const resolvedCompanyIdRef = useRef<string | null>(companyIdProp ?? null);

  const siteScope: SiteScope = ownerType === 'super_admin' ? 'platform' : 'company';

  useEffect(() => {
    if (ownerType === 'super_admin') return;
    if (companyIdProp) {
      setResolvedCompanyId(companyIdProp);
      resolvedCompanyIdRef.current = companyIdProp;
      setCompanyIdReady(true);
      if (companyNameProp) setResolvedCompanyName(companyNameProp);
      return;
    }
    (async () => {
      try {
        const { cid, cname } = await resolveCompanyFromSession();
        if (cid) {
          setResolvedCompanyId(cid);
          resolvedCompanyIdRef.current = cid;
          if (cname) setResolvedCompanyName(cname);
        }
      } finally {
        setCompanyIdReady(true);
      }
    })();
  }, [companyIdProp, companyNameProp, ownerType]);

  const loadTemplates = useCallback(async () => {
    try {
      const tmpls = await getAllTemplates();
      setTemplates(tmpls);
    } catch {
      // silent
    }
  }, []);

  const loadPage = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const cid = resolvedCompanyIdRef.current;
      const homePage = siteScope === 'platform'
        ? await getPlatformHomePage()
        : cid ? await getHomePageByCompanyId(cid) : null;
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
  }, [siteScope]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!companyIdReady) return;
    if (siteScope === 'company' && !resolvedCompanyId) {
      setLoading(false);
      return;
    }
    loadPage();
  }, [loadPage, siteScope, resolvedCompanyId, companyIdReady]);

  const loadData = useCallback(async (silent = false) => {
    await Promise.all([loadTemplates(), loadPage(silent)]);
  }, [loadTemplates, loadPage]);

  const handleApply = async (template: SiteTemplate) => {
    setApplyError(null);
    setApplySuccess(null);

    const { data: { session } } = await supabase.auth.getSession();
    const role = session?.user?.app_metadata?.role ?? 'unknown';
    const userId = session?.user?.id ?? 'none';

    console.log('[ApplyTemplate] start', { templateId: template.id, templateKey: template.template_key });
    console.log('[ApplyTemplate] user', userId);
    console.log('[ApplyTemplate] role', role);

    try {
      let cid = resolvedCompanyIdRef.current;
      let cname = resolvedCompanyName;

      if (siteScope === 'company' && !cid) {
        console.log('[ApplyTemplate] company_id not resolved, fetching from session...');
        const resolved = await resolveCompanyFromSession();
        cid = resolved.cid;
        cname = resolved.cname || cname;
        if (cid) {
          resolvedCompanyIdRef.current = cid;
          setResolvedCompanyId(cid);
          if (resolved.cname) setResolvedCompanyName(resolved.cname);
        }
      }

      console.log('[ApplyTemplate] company_id', cid);
      console.log('[ApplyTemplate] page id', page?.id ?? 'none (will create)');

      if (page) {
        const payload = { pageId: page.id, templateId: template.id, active_template_id: template.id };
        console.log('[ApplyTemplate] payload', payload);
        await applyTemplate(page.id, template.id);
        console.log('[ApplyTemplate] response: update success');
      } else {
        const payload = { siteScope, companyId: cid, companyName: cname, templateId: template.id };
        console.log('[ApplyTemplate] payload (create)', payload);
        await createOrUpdateSite({ siteScope, companyId: cid, companyName: cname, templateId: template.id });
        console.log('[ApplyTemplate] response: create success');
      }

      await loadData(true);

      setActiveTemplate(template);
      setPreviewTemplateKey(null);
      setPreviewTemplateName(null);
      setApplySuccess('Template applique avec succes.');
      setActiveTab('apercu');
      setTimeout(() => setApplySuccess(null), 4000);
    } catch (err: unknown) {
      const supaErr = err as { code?: string; message?: string; details?: string; hint?: string };
      const parts = [supaErr.message || (err instanceof Error ? err.message : String(err))];
      if (supaErr.code) parts.unshift(`[${supaErr.code}]`);
      if (supaErr.details) parts.push(supaErr.details);
      const msg = parts.join(' ');
      console.error('[ApplyTemplate] error', { code: supaErr.code, message: supaErr.message, details: supaErr.details, hint: supaErr.hint, raw: err });
      setApplyError(msg);
    }
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

        {applySuccess && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(22,163,106,0.08)', border: '1px solid rgba(22,163,106,0.15)' }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />
            <p className="text-xs font-medium" style={{ color: '#16a34a' }}>{applySuccess}</p>
          </div>
        )}

        {applyError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
            <p className="text-xs" style={{ color: '#f87171' }}>{applyError}</p>
            <button onClick={() => setApplyError(null)} className="ml-auto text-xs font-medium px-2 py-1 rounded-lg transition-colors" style={{ color: '#f87171' }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

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
