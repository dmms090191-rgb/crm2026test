/*
  # Allow anonymous users to read company names for public sites

  1. Security Changes
    - Add SELECT policy on `companies` table for `anon` role
    - Only allows reading companies that have an active, published home page
    - This enables the `companies(name)` join in public site queries

  2. Important Notes
    - Restricted to companies with active home pages only
    - Anon users can only SELECT (not insert/update/delete)
    - This is needed for public site rendering on custom domains
*/

CREATE POLICY "Anon can view companies with active sites"
  ON companies
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM company_home_pages
      WHERE company_home_pages.company_id = companies.id
      AND company_home_pages.is_active = true
    )
  );
