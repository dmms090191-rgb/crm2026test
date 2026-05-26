/*
  # Allow clients to read their company info

  1. Security Changes
    - Add SELECT policy on `companies` for authenticated clients
    - Client can read a company row if they have an active lead in that company
    - This allows clients to see their admin/advisor name

  2. Important Notes
    - Policy checks that the user's email matches a lead's email in the company
    - Only active leads are considered
    - Vendors also need to read their company
*/

CREATE POLICY "Client can view own company via lead"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.company_id = companies.id
        AND leads.actif = true
        AND leads.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Vendor can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.company_id = companies.id
        AND vendors.auth_user_id = auth.uid()
    )
  );
