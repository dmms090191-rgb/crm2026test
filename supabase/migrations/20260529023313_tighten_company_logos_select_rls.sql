/*
  # Tighten company_logos SELECT RLS policy for multi-tenant isolation

  1. Security Changes
    - Replace permissive "any authenticated user can view all logos" SELECT policy
    - New policy: authenticated users can only view logos for their own company_id
    - Super Admin can view logos for any company (needed for platform management)
    - Anon/public users can view logos for company_home_pages (needed for public site logo display)

  2. Important Notes
    - This ensures Admin A cannot see Admin B's logos
    - Vendors and clients can only see logos from their assigned company
    - Super Admin retains full visibility for platform management
    - Public site pages can still display company logos
*/

-- Drop the overly permissive old policy
DROP POLICY IF EXISTS "Authenticated users can view company logos" ON public.company_logos;

-- Admins, vendors, and clients can only see logos from their own company
CREATE POLICY "Users can view own company logos"
  ON public.company_logos
  FOR SELECT
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

-- Anon users can view logos that are active (for public company site pages)
CREATE POLICY "Anon can view active logos for public display"
  ON public.company_logos
  FOR SELECT
  TO anon
  USING (is_active = true);
