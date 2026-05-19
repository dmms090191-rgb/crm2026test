/*
  # Allow Super Admin to insert messages on behalf of Admin

  1. Security Changes
    - Add INSERT policy on `super_admin_messages` allowing the super admin
      to insert messages with sender_role = 'admin' when impersonating an admin.
    - This enables the impersonation flow where auth.uid() = super_admin_id
      but the message is sent as the admin (sender_role = 'admin').

  2. Important Notes
    - Does NOT affect existing policies.
    - The existing "Admin can send messages in own conversation" policy
      still works for direct admin login (auth.uid() = admin_id).
    - This new policy covers the impersonation case only.
*/

CREATE POLICY "Super admin can send on behalf of admin"
  ON super_admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = super_admin_id AND sender_role = 'admin');
