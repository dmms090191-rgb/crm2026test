-- Add company_tier column to classify companies in hierarchy
-- Values: 'rois_admin', 'super_admin', 'admin'
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS company_tier text NOT NULL DEFAULT 'admin';

-- Backfill based on existing auth.users roles
-- Talvex company (super_admin role user) → rois_admin tier
UPDATE public.companies
SET company_tier = 'rois_admin'
WHERE id IN (
  SELECT DISTINCT (raw_app_meta_data->>'company_id')::uuid
  FROM auth.users
  WHERE raw_app_meta_data->>'role' = 'super_admin'
);

-- Company super admin companies → super_admin tier
UPDATE public.companies
SET company_tier = 'super_admin'
WHERE id IN (
  SELECT DISTINCT (raw_app_meta_data->>'company_id')::uuid
  FROM auth.users
  WHERE raw_app_meta_data->>'role' = 'company_super_admin'
);

-- Admin companies stay as default 'admin'

-- Index for filtering by tier
CREATE INDEX IF NOT EXISTS idx_companies_company_tier ON public.companies(company_tier);