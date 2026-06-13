-- Add parent_company_id to support company hierarchy (CSA -> Admin)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS parent_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index for efficient lookups of child companies
CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id ON public.companies(parent_company_id);
