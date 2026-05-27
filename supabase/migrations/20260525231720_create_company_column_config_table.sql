/*
  # Create company_column_config table

  1. New Tables
    - `company_column_config`
      - `id` (uuid, primary key)
      - `company_id` (uuid, not null) - references companies table
      - `table_key` (text, not null) - e.g. 'vendor_leads'
      - `desktop_order` (jsonb) - ordered array of column keys
      - `desktop_hidden` (jsonb) - array of hidden column keys
      - `mobile_order` (jsonb) - mobile column entries
      - `mobile_card_style` (text) - mobile card style
      - `pushed_by` (uuid) - admin who pushed the config
      - `pushed_at` (timestamptz) - when it was pushed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admin can insert/update for own company
    - Vendors can read config for own company
*/

CREATE TABLE IF NOT EXISTS company_column_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  table_key text NOT NULL DEFAULT 'vendor_leads',
  desktop_order jsonb DEFAULT '[]'::jsonb,
  desktop_hidden jsonb DEFAULT '[]'::jsonb,
  mobile_order jsonb DEFAULT '[]'::jsonb,
  mobile_card_style text DEFAULT 'comfort',
  pushed_by uuid,
  pushed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, table_key)
);

ALTER TABLE company_column_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read own company column config"
  ON company_column_config
  FOR SELECT
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  );

CREATE POLICY "Admin can insert own company column config"
  ON company_column_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    AND ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can update own company column config"
  ON company_column_config
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    AND ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    AND ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
  );
