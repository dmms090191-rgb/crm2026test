-- Allow company_super_admin to UPDATE (mark read) messages in their conversations
CREATE POLICY "CSA can update own conversation messages"
  ON super_admin_messages FOR UPDATE TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());
