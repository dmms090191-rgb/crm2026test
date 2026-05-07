import { supabase } from './supabase';
import type { TableDoc } from '../pages/admin/views/documentation/databaseDocumentation';

export async function fetchTableSchema(tableName: string): Promise<TableDoc> {
  const { data, error } = await supabase.rpc('introspect_table_schema', {
    p_table_name: tableName,
  });

  if (error) throw error;

  const raw = data as Record<string, unknown>;

  const qu = raw.quickUnderstanding as { role: string; usedBy: string; relatedTables: string[] };

  return {
    name: raw.name as string,
    group: 'Non classe' as TableDoc['group'],
    description: raw.description as string,
    quickUnderstanding: {
      role: qu.role,
      usedBy: qu.usedBy,
      relatedTables: Array.isArray(qu.relatedTables) ? qu.relatedTables : [],
    },
    example: raw.example as string,
    columns: (raw.columns as TableDoc['columns']) ?? [],
    foreignKeys: (raw.foreignKeys as TableDoc['foreignKeys']) ?? [],
    indexes: (raw.indexes as TableDoc['indexes']) ?? [],
    policies: (raw.policies as TableDoc['policies']) ?? [],
    triggers: (raw.triggers as TableDoc['triggers']) ?? [],
  };
}

export async function saveDiscoveredTable(tableDoc: TableDoc): Promise<void> {
  const { error } = await supabase
    .from('crm_discovered_tables')
    .upsert(
      { table_name: tableDoc.name, table_doc: tableDoc },
      { onConflict: 'table_name' }
    );

  if (error) throw error;
}

export async function removeDiscoveredTable(tableName: string): Promise<void> {
  const { error } = await supabase
    .from('crm_discovered_tables')
    .delete()
    .eq('table_name', tableName);

  if (error) throw error;
}

export async function loadDiscoveredTables(): Promise<TableDoc[]> {
  const { data, error } = await supabase
    .from('crm_discovered_tables')
    .select('table_doc');

  if (error) throw error;

  return (data ?? []).map((row) => row.table_doc as TableDoc);
}
