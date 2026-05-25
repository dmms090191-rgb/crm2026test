/*
  # Allow anonymous users to view pages with active templates

  1. Security Changes
    - Add SELECT policy for anon role on `company_home_pages`
    - Allows viewing active pages that have an active template set
    - Required for landing page template rendering before user login

  2. Notes
    - Only SELECT access for rows where is_active = true AND active_template_id IS NOT NULL
    - Complements existing anon policy that requires slug IS NOT NULL
*/

CREATE POLICY "Anon can view active template pages"
  ON company_home_pages
  FOR SELECT
  TO anon
  USING (is_active = true AND active_template_id IS NOT NULL);
