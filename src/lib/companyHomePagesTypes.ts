/* ── Site template types ── */

export interface SiteTemplateConfig {
  canvasBgDesktop?: string | null;
  canvasBgMobile?: string | null;
  gradientDesktop?: Record<string, unknown> | null;
  gradientMobile?: Record<string, unknown> | null;
  bgModeDesktop?: string;
  bgModeMobile?: string;
  pageHeightDesktop?: number | null;
  pageHeightMobile?: number | null;
  overlayElements?: unknown[];
}

export interface SiteTemplate {
  id: string;
  name: string;
  slug: string;
  template_key: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  is_default: boolean;
  is_visible: boolean;
  config: SiteTemplateConfig | null;
  created_at: string;
  updated_at: string;
}

/* ── Company home page types ── */

export type SiteScope = 'platform' | 'company';

export interface CompanyHomePage {
  id: string;
  company_id: string | null;
  site_scope: SiteScope;
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
  app_icon_id: string | null;
  app_icon_url: string | null;
  draft_canvas_bg_desktop: string | null;
  draft_canvas_bg_mobile: string | null;
  published_canvas_bg_desktop: string | null;
  published_canvas_bg_mobile: string | null;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyHomePageUpsert = Omit<CompanyHomePage, 'id' | 'created_at' | 'updated_at'>;

export interface CompanyHomePageCompany {
  name: string;
  company_tier: string;
  parent_company_id: string | null;
}

export interface CompanyHomePageWithCompany extends CompanyHomePage {
  companies: CompanyHomePageCompany | null;
}
