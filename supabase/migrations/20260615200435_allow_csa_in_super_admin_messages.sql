-- Allow company_super_admin as a valid sender_role
ALTER TABLE super_admin_messages DROP CONSTRAINT IF EXISTS super_admin_messages_sender_role_check;
ALTER TABLE super_admin_messages ADD CONSTRAINT super_admin_messages_sender_role_check
  CHECK (sender_role IN ('super_admin', 'admin', 'company_super_admin'));