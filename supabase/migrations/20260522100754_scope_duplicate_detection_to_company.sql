/*
  # Scope duplicate lead detection to company_id

  1. Modified Functions
    - `find_duplicate_leads` now accepts a `p_company_id` (uuid) parameter
    - Only returns leads matching the given company_id
    - If p_company_id is NULL, falls back to matching all leads (backward compat)

  2. Modified Indexes
    - Drop global unique indexes `leads_email_unique` and `leads_telephone_unique`
    - Replace with compound unique indexes scoped to company_id:
      - `leads_email_company_unique` on (email, company_id)
      - `leads_telephone_company_unique` on (telephone, company_id)
    - Same email/phone can now exist in different companies

  3. Important Notes
    - No data is deleted or modified
    - Existing leads are unaffected
    - The function signature changes: callers must pass p_company_id
*/

-- Replace the function with company_id scoping
CREATE OR REPLACE FUNCTION find_duplicate_leads(
  p_emails      text[],
  p_telephones  text[],
  p_company_id  uuid DEFAULT NULL
)
RETURNS TABLE (
  lead_id        uuid,
  lead_email     text,
  lead_telephone text,
  lead_nom       text,
  lead_prenom    text,
  match_type     text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    l.id                AS lead_id,
    l.email             AS lead_email,
    l.telephone         AS lead_telephone,
    l.nom               AS lead_nom,
    l.prenom            AS lead_prenom,
    CASE
      WHEN l.email     = ANY(p_emails)
       AND l.telephone = ANY(p_telephones) THEN 'both'
      WHEN l.email     = ANY(p_emails)     THEN 'email'
      ELSE 'telephone'
    END AS match_type
  FROM leads l
  WHERE
    (
      (l.email     = ANY(p_emails)     AND l.email     IS NOT NULL AND l.email     != '')
      OR
      (l.telephone = ANY(p_telephones) AND l.telephone IS NOT NULL AND l.telephone != '')
    )
    AND (p_company_id IS NULL OR l.company_id = p_company_id);
$$;

-- Drop old global unique indexes
DROP INDEX IF EXISTS leads_email_unique;
DROP INDEX IF EXISTS leads_telephone_unique;

-- Create new compound unique indexes scoped to company_id
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_company_unique
  ON leads (email, company_id)
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_telephone_company_unique
  ON leads (telephone, company_id)
  WHERE telephone IS NOT NULL AND telephone != '';
