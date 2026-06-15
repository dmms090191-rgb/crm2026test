-- Add target_user_id column for per-user hidden tab configuration
ALTER TABLE panel_hidden_tabs ADD COLUMN target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old unique constraints
ALTER TABLE panel_hidden_tabs DROP CONSTRAINT IF EXISTS panel_hidden_tabs_panel_role_company_id_key;
DROP INDEX IF EXISTS panel_hidden_tabs_role_null_company;

-- New unique: (panel_role, company_id, target_user_id) with partial indexes for nulls
CREATE UNIQUE INDEX panel_hidden_tabs_role_company_user
  ON panel_hidden_tabs (panel_role, company_id, target_user_id)
  WHERE company_id IS NOT NULL AND target_user_id IS NOT NULL;

CREATE UNIQUE INDEX panel_hidden_tabs_role_company_null_user
  ON panel_hidden_tabs (panel_role, company_id)
  WHERE company_id IS NOT NULL AND target_user_id IS NULL;

CREATE UNIQUE INDEX panel_hidden_tabs_role_null_company_user
  ON panel_hidden_tabs (panel_role, target_user_id)
  WHERE company_id IS NULL AND target_user_id IS NOT NULL;

CREATE UNIQUE INDEX panel_hidden_tabs_role_null_company_null_user
  ON panel_hidden_tabs (panel_role)
  WHERE company_id IS NULL AND target_user_id IS NULL;
