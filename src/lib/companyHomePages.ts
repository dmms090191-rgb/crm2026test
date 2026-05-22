import { supabase } from './supabase';

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyHomePageUpsert = Omit<CompanyHomePage, 'id' | 'created_at' | 'updated_at'>;

export interface CompanyHomePageWithCompany extends CompanyHomePage {
  companies: { name: string } | null;
}

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
