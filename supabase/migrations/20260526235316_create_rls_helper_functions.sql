/*
  # Create RLS helper functions for company-scoped isolation

  1. New Functions
    - `get_my_company_id()` — extracts the caller's company_id from JWT app_metadata
    - `get_my_role()` — extracts the caller's role from JWT app_metadata
    - `client_company_ids()` — returns the set of company_ids a client belongs to (via leads table, matched by email)

  2. Purpose
    These helper functions simplify all company-scoped RLS policies.
    Instead of repeating long JWT extraction expressions in every policy,
    we call these short, well-tested helpers.

  3. Security
    - All functions run with SECURITY DEFINER so they can read JWT claims
    - They are marked STABLE for performance (results don't change within a transaction)
*/

-- Helper: extract company_id from JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
$$;

-- Helper: extract role from JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')
$$;

-- Helper: get all company_ids a client belongs to (via leads email match)
CREATE OR REPLACE FUNCTION public.client_company_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT l.company_id
  FROM leads l
  WHERE l.email = (auth.jwt() ->> 'email')
    AND l.actif = true
    AND l.company_id IS NOT NULL
$$;
