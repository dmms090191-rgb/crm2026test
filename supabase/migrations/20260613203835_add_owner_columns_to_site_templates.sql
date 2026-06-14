ALTER TABLE site_templates ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);
ALTER TABLE site_templates ADD COLUMN IF NOT EXISTS owner_company_id uuid REFERENCES companies(id);