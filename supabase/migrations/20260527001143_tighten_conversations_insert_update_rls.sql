/*
  # Fix conversations INSERT and UPDATE policies

  1. Changes
    - Drop the INSERT policy that uses `true` (no restriction)
    - Drop the UPDATE policy that uses `true` (no restriction)
    - Replace with company-scoped INSERT and UPDATE policies per role

  2. Access Rules
    - Super Admin: can insert/update all conversations
    - Admin: can insert/update conversations in own company
    - Vendor: can insert/update conversations in own company
    - Client: can insert/update conversations in their company (via lead email)

  3. Security
    - No user can create or modify conversations in another company
*/

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON conversations;

-- INSERT policies
CREATE POLICY "SA can insert conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can insert own company conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can insert own company conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

-- UPDATE policies
CREATE POLICY "SA can update all conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can update own company conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can update own company conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()))
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));
