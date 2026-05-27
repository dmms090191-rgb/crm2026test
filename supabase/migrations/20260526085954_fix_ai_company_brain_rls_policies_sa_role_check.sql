/*
  # Fix SA RLS policies on ai_company_brain table

  1. Problem
    - The 4 Super Admin RLS policies on `ai_company_brain` check
      `(auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true`
    - But the SA user's JWT has `app_metadata: {"role": "super_admin"}` (no `is_super_admin` key)
    - This silently blocks ALL SA operations (SELECT, INSERT, UPDATE, DELETE)

  2. Fix
    - Drop the 4 broken SA policies
    - Recreate them using `(auth.jwt()->'app_metadata'->>'role') = 'super_admin'`
      which matches the actual JWT structure

  3. Policies updated
    - `SA can manage all brain configs` (SELECT)
    - `SA can insert brain configs` (INSERT)
    - `SA can update brain configs` (UPDATE)
    - `SA can delete brain configs` (DELETE)
*/

DROP POLICY IF EXISTS "SA can manage all brain configs" ON ai_company_brain;
DROP POLICY IF EXISTS "SA can insert brain configs" ON ai_company_brain;
DROP POLICY IF EXISTS "SA can update brain configs" ON ai_company_brain;
DROP POLICY IF EXISTS "SA can delete brain configs" ON ai_company_brain;

CREATE POLICY "SA can manage all brain configs"
  ON ai_company_brain
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can insert brain configs"
  ON ai_company_brain
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can update brain configs"
  ON ai_company_brain
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can delete brain configs"
  ON ai_company_brain
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
