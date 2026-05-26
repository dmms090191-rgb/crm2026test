/*
  # Add ai_scope and business_context_text to ai_company_brain

  1. Modified Tables
    - `ai_company_brain`
      - `ai_scope` (text, NOT NULL, default 'company') — 'platform' or 'company'
      - `business_context_text` (text, NOT NULL, default '') — free-form context for simple mode
      - `company_id` changed from NOT NULL to nullable (platform brain has NULL company_id)

  2. Constraints
    - CHECK: platform scope requires NULL company_id, company scope requires non-NULL company_id
    - Unique partial index: only one platform brain allowed
    - Existing unique constraint on company_id preserved for company-scoped brains

  3. Security
    - New RLS policies for admin INSERT and UPDATE (scoped to own company_id, company scope only)
    - New RLS policy for vendor SELECT (read-only, own company_id)

  4. Notes
    - No data is dropped or lost
    - Existing rows (all company-scoped) remain valid with the new default ai_scope='company'
*/

-- Add ai_scope column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'ai_scope'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN ai_scope text NOT NULL DEFAULT 'company';
  END IF;
END $$;

-- Add business_context_text column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'business_context_text'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN business_context_text text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Make company_id nullable for platform-scope brains
ALTER TABLE ai_company_brain ALTER COLUMN company_id DROP NOT NULL;

-- Add CHECK constraint: platform => company_id IS NULL, company => company_id IS NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ai_company_brain_scope_company_check'
  ) THEN
    ALTER TABLE ai_company_brain ADD CONSTRAINT ai_company_brain_scope_company_check
      CHECK (
        (ai_scope = 'platform' AND company_id IS NULL)
        OR
        (ai_scope = 'company' AND company_id IS NOT NULL)
      );
  END IF;
END $$;

-- Unique partial index: only one platform brain
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_company_brain_platform_unique
  ON ai_company_brain (ai_scope) WHERE ai_scope = 'platform';

-- RLS: Admin can insert brain for own company (company scope only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_company_brain' AND policyname = 'Admins can insert own company brain'
  ) THEN
    CREATE POLICY "Admins can insert own company brain"
      ON ai_company_brain FOR INSERT
      TO authenticated
      WITH CHECK (
        ai_scope = 'company'
        AND company_id IS NOT NULL
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')
      );
  END IF;
END $$;

-- RLS: Admin can update brain for own company (company scope only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_company_brain' AND policyname = 'Admins can update own company brain'
  ) THEN
    CREATE POLICY "Admins can update own company brain"
      ON ai_company_brain FOR UPDATE
      TO authenticated
      USING (
        ai_scope = 'company'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')
      )
      WITH CHECK (
        ai_scope = 'company'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')
      );
  END IF;
END $$;

-- RLS: Vendors can read brain of own company (read-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_company_brain' AND policyname = 'Vendors can read own company brain'
  ) THEN
    CREATE POLICY "Vendors can read own company brain"
      ON ai_company_brain FOR SELECT
      TO authenticated
      USING (
        ai_scope = 'company'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'vendor'
      );
  END IF;
END $$;
