import { supabase } from './supabase';
export type { SiteTemplate, SiteTemplateConfig, SiteScope, CompanyHomePage, CompanyHomePageUpsert, CompanyHomePageWithCompany } from './companyHomePagesTypes';
import type { SiteScope, CompanyHomePage, CompanyHomePageUpsert, CompanyHomePageWithCompany, SiteTemplate } from './companyHomePagesTypes';

/* ── Slug helpers ── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'site';
}

/* ── Template queries ── */

export async function getAllTemplates(): Promise<SiteTemplate[]> {
  const { data, error } = await supabase
    .from('site_templates')
    .select('*')
    .eq('is_visible', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteTemplate[];
}

export async function getTemplateById(id: string): Promise<SiteTemplate | null> {
  const { data, error } = await supabase
    .from('site_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTemplateByKey(templateKey: string): Promise<SiteTemplate | null> {
  const { data, error } = await supabase
    .from('site_templates')
    .select('*')
    .eq('template_key', templateKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* ── Home page queries ── */

export async function getAllHomePages(): Promise<CompanyHomePageWithCompany[]> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*, companies(name, company_tier, parent_company_id)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompanyHomePageWithCompany[];
}

export async function getHomePageByCompanyId(companyId: string): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('company_id', companyId)
    .eq('site_scope', 'company')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlatformHomePage(): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('site_scope', 'platform')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHomePageById(id: string): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHomePageBySlug(slug: string): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHomePageByDomain(domain: string): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('custom_domain', domain)
    .eq('is_active', true)
    .eq('domain_verified', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertHomePage(page: CompanyHomePageUpsert): Promise<CompanyHomePage> {
  if (page.company_id) {
    const existing = await getHomePageByCompanyId(page.company_id);
    if (existing) {
      const { data, error } = await supabase
        .from('company_home_pages')
        .update({ ...page, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
  const { data, error } = await supabase
    .from('company_home_pages')
    .insert({ ...page, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleHomePageActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('company_home_pages')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/* ── Landing page template ── */

export async function getLandingTemplateKey(): Promise<string | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('active_template_id, site_templates(template_key)')
    .eq('site_scope', 'platform')
    .eq('is_active', true)
    .not('active_template_id', 'is', null)
    .maybeSingle();
  if (error || !data) return null;
  const tmpl = data.site_templates as unknown as { template_key: string } | null;
  return tmpl?.template_key ?? null;
}

/* ── Template application ── */

export async function applyTemplate(homePageId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from('company_home_pages')
    .update({ active_template_id: templateId, is_active: true, updated_at: new Date().toISOString() })
    .eq('id', homePageId);
  if (error) throw error;
}

export async function createHomePageWithTemplate(companyId: string, templateId: string): Promise<CompanyHomePage> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .upsert(
      {
        company_id: companyId,
        site_scope: 'company',
        title: '',
        subtitle: '',
        welcome_message: '',
        active_template_id: templateId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── Site creation with scope ── */

interface CreateSiteParams {
  siteScope: SiteScope;
  companyId?: string | null;
  companyName?: string;
  templateId: string;
  slug?: string;
}

export async function createOrUpdateSite(params: CreateSiteParams): Promise<CompanyHomePage> {
  const { siteScope, companyId, companyName, templateId, slug: customSlug } = params;

  const generatedSlug = customSlug
    || (siteScope === 'platform' ? 'talvex' : slugify(companyName || 'site'));

  if (siteScope === 'platform') {
    const existing = await getPlatformHomePage();
    if (existing) {
      const { data, error } = await supabase
        .from('company_home_pages')
        .update({
          active_template_id: templateId,
          is_active: true,
          slug: existing.slug || generatedSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('company_home_pages')
      .insert({
        site_scope: 'platform',
        company_id: null,
        title: 'Talvex',
        subtitle: 'Plateforme CRM',
        welcome_message: '',
        active_template_id: templateId,
        slug: generatedSlug,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (!companyId) throw new Error('company_id is required for company scope');

  const existing = await getHomePageByCompanyId(companyId);
  if (existing) {
    const { data, error } = await supabase
      .from('company_home_pages')
      .update({
        active_template_id: templateId,
        is_active: true,
        slug: existing.slug || generatedSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('company_home_pages')
    .insert({
      site_scope: 'company',
      company_id: companyId,
      title: companyName || '',
      subtitle: '',
      welcome_message: '',
      active_template_id: templateId,
      slug: generatedSlug,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
