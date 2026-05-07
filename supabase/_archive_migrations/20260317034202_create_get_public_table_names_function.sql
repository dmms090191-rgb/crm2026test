/*
  # Create helper function: get_public_table_names

  ## Purpose
  Provides a secure, read-only RPC endpoint to list all BASE TABLE names
  in the public schema. Used by the Database documentation tab to verify
  synchronization between the real schema and the documented tables.

  ## Security
  - SECURITY DEFINER so authenticated users can read information_schema
  - Restricted to authenticated role only
  - Returns only table names (no sensitive schema info)
*/

CREATE OR REPLACE FUNCTION get_public_table_names()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

REVOKE ALL ON FUNCTION get_public_table_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_table_names() TO authenticated;
