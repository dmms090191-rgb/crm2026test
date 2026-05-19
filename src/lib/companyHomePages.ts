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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyHomePageUpsert = Omit<CompanyHomePage, 'id' | 'created_at' | 'updated_at'>;

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
