import { supabase } from './supabase';

/* ── Site template types ── */

export interface SiteTemplate {
  id: string;
  name: string;
  slug: string;
  template_key: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/* ── Company home page types ── */

export interface CompanyHomePage {
  id: string;
  company_id: string;
  title: string;
  subtitle: string;
  welcome_message: string;
  logo_url: string | null;
  main_color: string | null;
  secondary_color: string | null;
  hero_image_url: string | null;
  slug: string | null;
  custom_domain: string | null;
  domain_status: string;
  domain_verified: boolean;
  domain_provider: string | null;
  domain_type: string | null;
  domain_notes: string | null;
  last_domain_check_at: string | null;
  domain_purchase_price: number | null;
  domain_sell_price: number | null;
  domain_payment_status: string | null;
  domain_order_id: string | null;
  domain_expires_at: string | null;
  domain_auto_renew: boolean | null;
  active_template_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyHomePageUpsert = Omit<CompanyHomePage, 'id' | 'created_at' | 'updated_at'>;

export interface CompanyHomePageWithCompany extends CompanyHomePage {
  companies: { name: string } | null;
}

/* ── Template queries ── */

export async function getAllTemplates(): Promise<SiteTemplate[]> {
  const { data, error } = await supabase
    .from('site_templates')
    .select('*')
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
    .select('*, companies(name)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompanyHomePageWithCompany[];
}

export async function getHomePageByCompanyId(companyId: string): Promise<CompanyHomePage | null> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .select('*')
    .eq('company_id', companyId)
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
  const { data, error } = await supabase
    .from('company_home_pages')
    .upsert(
      { ...page, updated_at: new Date().toISOString() },
      { onConflict: 'company_id' }
    )
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
    .eq('is_active', true)
    .not('active_template_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const tmpl = data.site_templates as unknown as { template_key: string } | null;
  return tmpl?.template_key ?? null;
}

/* ── Template application ── */

export async function applyTemplate(homePageId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from('company_home_pages')
    .update({ active_template_id: templateId, updated_at: new Date().toISOString() })
    .eq('id', homePageId);
  if (error) throw error;
}

export async function createHomePageWithTemplate(companyId: string, templateId: string): Promise<CompanyHomePage> {
  const { data, error } = await supabase
    .from('company_home_pages')
    .upsert(
      {
        company_id: companyId,
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
