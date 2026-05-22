/*
  # Add domain management fields to company_home_pages

  1. Modified Tables
    - `company_home_pages`
      - `domain_provider` (text, nullable) - Domain registrar/provider (e.g. 'vercel')
      - `domain_type` (text, nullable) - 'talvex_managed' or 'external_connected'
      - `domain_notes` (text, nullable) - Internal notes for Super Admin
      - `last_domain_check_at` (timestamptz, nullable) - Last DNS/domain verification check
      - `domain_purchase_price` (numeric, nullable) - Cost price from provider
      - `domain_sell_price` (numeric, nullable) - Price charged to client
      - `domain_payment_status` (text, nullable) - Payment status: pending, paid, failed
      - `domain_order_id` (text, nullable) - Provider order reference
      - `domain_expires_at` (timestamptz, nullable) - Domain expiration date
      - `domain_auto_renew` (boolean, nullable) - Auto-renewal flag

  2. Security
    - No RLS changes needed: existing policies cover all columns
    - Super Admin has full CRUD, anon can read active pages

  3. Notes
    - All columns are nullable with no defaults to avoid impacting existing data
    - These columns prepare for future domain purchase/management features
    - No data is modified by this migration
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_provider') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_provider text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_type') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_notes') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'last_domain_check_at') THEN
    ALTER TABLE company_home_pages ADD COLUMN last_domain_check_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_purchase_price') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_purchase_price numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_sell_price') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_sell_price numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_payment_status') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_payment_status text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_order_id') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_order_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_expires_at') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_home_pages' AND column_name = 'domain_auto_renew') THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_auto_renew boolean;
  END IF;
END $$;
