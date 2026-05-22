/*
  # Create domain_pricing_config table

  Stores the global pricing margin configuration for domain sales via Talvex.
  Super Admin can adjust the margin type and value.

  1. New Tables
    - `domain_pricing_config`
      - `id` (uuid, primary key)
      - `margin_type` (text, 'percentage' or 'fixed')
      - `margin_value` (numeric, e.g. 30 for 30% or 5 for 5 USD fixed)
      - `min_margin` (numeric, minimum margin in USD when using percentage)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Super admin can select and update

  3. Seed
    - Insert default config: 30% margin, minimum 3 USD
*/

CREATE TABLE IF NOT EXISTS domain_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  margin_type text NOT NULL DEFAULT 'percentage',
  margin_value numeric NOT NULL DEFAULT 30,
  min_margin numeric DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE domain_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read pricing config"
  ON domain_pricing_config
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admin can update pricing config"
  ON domain_pricing_config
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

INSERT INTO domain_pricing_config (margin_type, margin_value, min_margin)
VALUES ('percentage', 30, 3);
