/*
  # Allow anonymous users to view site templates

  1. Security Changes
    - Add SELECT policy for anon role on `site_templates` table
    - Templates are public catalog data, safe for unauthenticated viewing
    - Required for landing page template rendering before user login

  2. Notes
    - Only SELECT access; INSERT/UPDATE/DELETE remain super_admin only
*/

CREATE POLICY "Anon users can view templates"
  ON site_templates
  FOR SELECT
  TO anon
  USING (true);
