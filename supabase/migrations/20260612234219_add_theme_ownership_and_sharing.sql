/*
  Add ownership and sharing columns to theme_config.
  - owner_user_id: auth user who created the theme (NULL = system/legacy theme)
  - owner_company_id: company context when theme was created
  - is_shared: when true, theme is visible to all users as "shared"

  Existing themes (owner_user_id IS NULL) are treated as shared/system themes.

  Updated RLS:
  - Authenticated users can see: system themes (owner NULL) + their own + shared themes
  - Authenticated users can insert/update/delete their own custom themes
  - Super admin retains full access
*/

-- Add columns
ALTER TABLE theme_config
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_company_id uuid,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_theme_config_owner_user_id ON theme_config(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_theme_config_owner_company_id ON theme_config(owner_company_id);

-- Drop old non-SA select policy and replace with a richer one
DROP POLICY IF EXISTS "Authenticated users can read visible theme configs" ON theme_config;

CREATE POLICY "Authenticated users can read own and shared themes"
  ON theme_config
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (
      (status = 'visible' OR status = 'premium')
      AND (
        owner_user_id IS NULL
        OR owner_user_id = auth.uid()
        OR is_shared = true
      )
    )
  );

-- Drop the old SA-only select policy (now merged above)
DROP POLICY IF EXISTS "SA can read all theme configs" ON theme_config;

-- Allow authenticated users to insert their own custom themes
CREATE POLICY "Users can insert own custom themes"
  ON theme_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR owner_user_id = auth.uid()
  );

-- Allow authenticated users to update their own custom themes
CREATE POLICY "Users can update own custom themes"
  ON theme_config
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR owner_user_id = auth.uid()
  );

-- Allow authenticated users to delete their own custom themes
CREATE POLICY "Users can delete own custom themes"
  ON theme_config
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR owner_user_id = auth.uid()
  );

-- Drop old SA-only insert/update/delete policies (now covered by the new ones)
DROP POLICY IF EXISTS "SA can insert theme configs" ON theme_config;
DROP POLICY IF EXISTS "SA can update theme configs" ON theme_config;
DROP POLICY IF EXISTS "SA can delete theme configs" ON theme_config;
