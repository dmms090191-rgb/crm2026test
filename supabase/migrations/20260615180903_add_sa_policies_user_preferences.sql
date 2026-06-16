CREATE POLICY "sa_read_any_preferences" ON user_preferences
  FOR SELECT TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

CREATE POLICY "sa_insert_any_preferences" ON user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

CREATE POLICY "sa_update_any_preferences" ON user_preferences
  FOR UPDATE TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );