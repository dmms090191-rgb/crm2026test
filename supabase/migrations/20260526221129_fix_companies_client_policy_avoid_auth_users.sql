/*
  # Fix "permission denied for table users" error on companies table

  1. Problem
    - The "Client can view own company via lead" RLS policy on `companies`
      contains a subquery: `SELECT email FROM auth.users WHERE id = auth.uid()`
    - The `authenticated` role does NOT have SELECT on `auth.users`
    - PostgreSQL evaluates ALL RLS policies for the table, even ones that
      won't ultimately match the current user's role
    - This causes a 403 "permission denied for table users" error for
      admins and vendors when querying `companies` (e.g. via a join)

  2. Fix
    - Replace the `auth.users` subquery with `auth.jwt() ->> 'email'`
    - The JWT always contains the user's email, so this is equivalent
    - No table access required, avoiding the permission issue

  3. Security
    - Policy logic is identical: still checks leads.email = current user email
    - Only the method of obtaining the email changes (JWT claim vs table query)
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.companies'::regclass
      AND polname = 'Client can view own company via lead'
  ) THEN
    DROP POLICY "Client can view own company via lead" ON public.companies;
  END IF;
END $$;

CREATE POLICY "Client can view own company via lead"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM leads
      WHERE leads.company_id = companies.id
        AND leads.actif = true
        AND leads.email = (auth.jwt() ->> 'email')
    )
  );
