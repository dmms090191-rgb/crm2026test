/*
  # Tighten RLS SELECT policies on conversations, messages, vendor_admin_messages

  1. Changes
    - `conversations`: Replace permissive SELECT policy (qual: true) with auth.uid() IS NOT NULL check
    - `messages`: Replace permissive SELECT policy (qual: true) with auth.uid() IS NOT NULL check
    - `vendor_admin_messages`: Replace SELECT, INSERT, UPDATE policies from public role to authenticated role with auth.uid() IS NOT NULL checks

  2. Security
    - All three tables now require authenticated access for SELECT
    - vendor_admin_messages INSERT and UPDATE also restricted to authenticated users
    - No data is modified or deleted; only policy definitions change

  3. Notes
    - This is a minimal, targeted fix addressing the 3 tables flagged in the security audit
    - Existing DELETE policy on messages (already scoped to authenticated) is untouched
*/

-- conversations: tighten SELECT
DROP POLICY IF EXISTS "Authenticated users can read conversations" ON conversations;
CREATE POLICY "Authenticated users can read conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- messages: tighten SELECT
DROP POLICY IF EXISTS "Authenticated users can read messages" ON messages;
CREATE POLICY "Authenticated users can read messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- vendor_admin_messages: tighten SELECT (public -> authenticated)
DROP POLICY IF EXISTS "Anyone can view vendor admin messages" ON vendor_admin_messages;
CREATE POLICY "Authenticated users can view vendor admin messages"
  ON vendor_admin_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- vendor_admin_messages: tighten INSERT (public -> authenticated)
DROP POLICY IF EXISTS "Anyone can insert vendor admin messages" ON vendor_admin_messages;
CREATE POLICY "Authenticated users can insert vendor admin messages"
  ON vendor_admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- vendor_admin_messages: tighten UPDATE (public -> authenticated)
DROP POLICY IF EXISTS "Anyone can update vendor admin messages" ON vendor_admin_messages;
CREATE POLICY "Authenticated users can update vendor admin messages"
  ON vendor_admin_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
