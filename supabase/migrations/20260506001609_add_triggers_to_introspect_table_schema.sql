/*
  # Add triggers introspection to introspect_table_schema

  1. Changes
    - Replaces the existing `introspect_table_schema` function
    - Adds a new block that queries `pg_trigger` for non-internal triggers
    - Returns trigger name, timing+event, function name, and description
    - Adds the `triggers` key to the returned JSON object

  2. Why
    - Previously, dynamically discovered tables had no trigger information
    - The "Triggers" counter in the Database documentation tab always showed 0
    - This fix ensures triggers are properly introspected and returned

  3. No structural changes
    - No new tables or columns
    - No ALTER TABLE
    - Only replaces the function body
*/

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
  trigs jsonb;
  related_names jsonb;
BEGIN
  -- Columns
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

  -- Foreign keys
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

  -- Related table names (for quickUnderstanding)
  SELECT COALESCE(jsonb_agg(DISTINCT ccu.table_name), '[]'::jsonb)
  INTO related_names
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = p_table_name;

  -- Indexes
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

  -- Policies
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

  -- Triggers
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', t.tgname,
      'event', CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE ' ELSE 'AFTER ' END ||
               CASE
                 WHEN t.tgtype & 4 = 4 AND t.tgtype & 8 = 8 AND t.tgtype & 16 = 16 THEN 'INSERT OR DELETE OR UPDATE'
                 WHEN t.tgtype & 4 = 4 AND t.tgtype & 16 = 16 THEN 'INSERT OR UPDATE'
                 WHEN t.tgtype & 4 = 4 AND t.tgtype & 8 = 8 THEN 'INSERT OR DELETE'
                 WHEN t.tgtype & 8 = 8 AND t.tgtype & 16 = 16 THEN 'DELETE OR UPDATE'
                 WHEN t.tgtype & 4 = 4 THEN 'INSERT'
                 WHEN t.tgtype & 8 = 8 THEN 'DELETE'
                 WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
                 ELSE 'UNKNOWN'
               END,
      'function', t.tgfoid::regproc::text,
      'description', 'Trigger ' || t.tgname || ' appelle ' || t.tgfoid::regproc::text
    )
  ), '[]'::jsonb)
  INTO trigs
  FROM pg_trigger t
  WHERE NOT t.tgisinternal
    AND t.tgrelid = ('public.' || quote_ident(p_table_name))::regclass;

  -- Build result
  result := jsonb_build_object(
    'name', p_table_name,
    'group', 'Non classe',
    'description', 'Table decouverte automatiquement par la synchronisation.',
    'quickUnderstanding', jsonb_build_object(
      'role', 'Table ajoutee dynamiquement — documentation a completer.',
      'usedBy', 'A determiner.',
      'relatedTables', related_names
    ),
    'example', 'Aucun exemple disponible — documentation a completer.',
    'columns', cols,
    'foreignKeys', fks,
    'indexes', idxs,
    'policies', pols,
    'triggers', trigs
  );

  RETURN result;
END;
$$;
