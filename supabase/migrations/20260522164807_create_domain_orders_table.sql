/*
  # Create domain_orders table

  Prepares the order tracking system for domain purchases via Talvex.
  This table stores the full history of domain orders (purchases, renewals)
  and their associated pricing/payment data.

  1. New Tables
    - `domain_orders`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK -> companies, the company this order belongs to)
      - `home_page_id` (uuid, FK -> company_home_pages, the site page linked to)
      - `domain_name` (text, the domain being ordered e.g. restaurantbella.com)
      - `action` (text, 'purchase' or 'renewal')
      - `vercel_order_id` (text, returned by Vercel after buy)
      - `vercel_order_status` (text, draft/purchasing/completed/failed)
      - `purchase_price` (numeric, cost price from Vercel in USD)
      - `renewal_price` (numeric, renewal price from Vercel in USD)
      - `sell_price` (numeric, price charged to client)
      - `margin` (numeric, sell_price - purchase_price)
      - `years` (integer, duration of purchase, default 1)
      - `currency` (text, default 'USD')
      - `payment_status` (text, pending/paid/failed/refunded)
      - `payment_method` (text, for future Stripe etc.)
      - `payment_reference` (text, external payment reference)
      - `contact_info` (jsonb, contact info sent to Vercel)
      - `error_message` (text, error message if failed)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_by` (uuid, FK -> auth.users, who initiated the order)

  2. Security
    - Enable RLS on `domain_orders`
    - Super admin can read and insert orders via JWT role check

  3. Notes
    - No buy endpoint is called at this stage
    - This table is created to prepare future order tracking
*/

CREATE TABLE IF NOT EXISTS domain_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  home_page_id uuid REFERENCES company_home_pages(id) ON DELETE SET NULL,
  domain_name text NOT NULL,
  action text NOT NULL DEFAULT 'purchase',
  vercel_order_id text,
  vercel_order_status text DEFAULT 'draft',
  purchase_price numeric NOT NULL DEFAULT 0,
  renewal_price numeric DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  years integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  contact_info jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE domain_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read domain orders"
  ON domain_orders
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admin can insert domain orders"
  ON domain_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admin can update domain orders"
  ON domain_orders
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE INDEX IF NOT EXISTS idx_domain_orders_company_id ON domain_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_domain_orders_home_page_id ON domain_orders(home_page_id);
CREATE INDEX IF NOT EXISTS idx_domain_orders_domain_name ON domain_orders(domain_name);
