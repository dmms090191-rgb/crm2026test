/*
  # Create crm_discovered_tables + introspect_table_schema function

  1. New Tables
    - `crm_discovered_tables`
      - `table_name` (text, primary key) - Name of the discovered table
      - `table_doc` (jsonb) - Full TableDoc JSON for the table
      - `created_at` (timestamptz) - When the table was added

  2. New Functions
    - `introspect_table_schema(p_table_name text)` - Returns columns, indexes, policies, foreign keys for a given table

  3. Security
    - Enable RLS on `crm_discovered_tables`
    - Policies for authenticated users to manage discovered tables
*/

CREATE TABLE IF NOT EXISTS crm_discovered_tables (
  table_name text PRIMARY KEY,
  table_doc jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_discovered_tables ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read discovered tables' AND tablename = 'crm_discovered_tables') THEN
  CREATE POLICY "Authenticated users can read discovered tables"
    ON crm_discovered_tables FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert discovered tables' AND tablename = 'crm_discovered_tables') THEN
  CREATE POLICY "Authenticated users can insert discovered tables"
    ON crm_discovered_tables FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update discovered tables' AND tablename = 'crm_discovered_tables') THEN
  CREATE POLICY "Authenticated users can update discovered tables"
    ON crm_discovered_tables FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete discovered tables' AND tablename = 'crm_discovered_tables') THEN
  CREATE POLICY "Authenticated users can delete discovered tables"
    ON crm_discovered_tables FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

CREATE OR REPLACE FUNCTION introspect_table_schema(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  cols jsonb;
  fks jsonb;
  idxs jsonb;
  pols jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', c.column_name,
      'type', c.data_type,
      'nullable', c.is_nullable = 'YES',
      'default', c.column_default,
      'primaryKey', EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = p_table_name
          AND kcu.column_name = c.column_name
      ),
      'isSystem', c.column_name IN ('id', 'created_at', 'updated_at')
        OR c.column_default LIKE '%gen_random_uuid%'
        OR c.column_default LIKE '%now()%'
    ) ORDER BY c.ordinal_position
  ), '[]'::jsonb)
  INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table_name;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'column', kcu.column_name,
      'referencesTable', ccu.table_name,
      'referencesColumn', ccu.column_name,
      'description', kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name,
      'direction', 'outgoing'
    )
  ), '[]'::jsonb)
  INTO fks
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = p_table_name;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', i.indexname,
      'columns', (
        SELECT jsonb_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum))
        FROM pg_index ix
        JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
        WHERE ix.indexrelid = (quote_ident('public') || '.' || quote_ident(i.indexname))::regclass
      ),
      'unique', ix2.indisunique
    )
  ), '[]'::jsonb)
  INTO idxs
  FROM pg_indexes i
  JOIN pg_class c ON c.relname = i.indexname AND c.relnamespace = 'public'::regnamespace
  JOIN pg_index ix2 ON ix2.indexrelid = c.oid
  WHERE i.schemaname = 'public' AND i.tablename = p_table_name;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', p.policyname,
      'operation', p.cmd,
      'roles', (
        SELECT jsonb_agg(r)
        FROM unnest(p.roles) AS r
      ),
      'condition', p.qual
    )
  ), '[]'::jsonb)
  INTO pols
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = p_table_name;

  result := jsonb_build_object(
    'name', p_table_name,
    'group', 'Non classe',
    'description', 'Table decouverte automatiquement par la synchronisation.',
    'quickUnderstanding', jsonb_build_object(
      'role', 'Table ajoutee dynamiquement — documentation a completer.',
      'usedBy', 'A determiner.',
      'relatedTables', fks
    ),
    'example', 'Aucun exemple disponible — documentation a completer.',
    'columns', cols,
    'foreignKeys', fks,
    'indexes', idxs,
    'policies', pols
  );

  RETURN result;
END;
$$;
