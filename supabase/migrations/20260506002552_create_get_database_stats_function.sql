/*
  # Create get_database_stats function

  1. New Function
    - `get_database_stats` returns a JSON object with live counts from the database:
      - tables: count of public base tables
      - colonnes: count of public columns
      - fk: count of foreign key constraints in public schema
      - policies: count of RLS policies in public schema
      - triggers: count of non-internal triggers in public schema

  2. Purpose
    - The Resume Global section of the documentation page needs real-time stats
    - Previously it was summing static documentation data which became stale
    - This function queries pg_catalog / information_schema for accurate live numbers
*/

CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  t_count integer;
  c_count integer;
  fk_count integer;
  p_count integer;
  tr_count integer;
BEGIN
  SELECT count(*) INTO t_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT count(*) INTO c_count
  FROM information_schema.columns
  WHERE table_schema = 'public';

  SELECT count(*) INTO fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace);

  SELECT count(*) INTO p_count
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT count(*) INTO tr_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE NOT t.tgisinternal AND n.nspname = 'public';

  RETURN jsonb_build_object(
    'tables', t_count,
    'colonnes', c_count,
    'fk', fk_count,
    'policies', p_count,
    'triggers', tr_count
  );
END;
$$;
