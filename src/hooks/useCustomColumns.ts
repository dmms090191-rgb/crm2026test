import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ColumnDef } from '../components/table/useColumnOrder';
import type { CustomColumnInput } from '../components/table/columnModalTypes';

interface CustomColumnRow {
  id: string;
  table_key: string;
  owner_id: string;
  column_key: string;
  label: string;
  field_type: string;
  visible_desktop: boolean;
  position: number;
}

interface CustomColumnValueRow {
  custom_column_id: string;
  row_id: string;
  value: string;
}

export function useCustomColumns(tableKey: string) {
  const [customDefs, setCustomDefs] = useState<ColumnDef[]>([]);
  const [customValues, setCustomValues] = useState<Map<string, Map<string, string>>>(new Map());
  const [rawColumns, setRawColumns] = useState<CustomColumnRow[]>([]);

  const loadColumns = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data } = await supabase
      .from('custom_columns')
      .select('*')
      .eq('table_key', tableKey)
      .eq('owner_id', userData.user.id)
      .order('position', { ascending: true });

    if (!data) return;
    setRawColumns(data);

    const defs: ColumnDef[] = data.map(c => ({
      key: c.column_key,
      label: c.label,
      isCustom: true,
      fieldType: c.field_type,
    }));
    setCustomDefs(defs);

    if (data.length > 0) {
      const colIds = data.map(c => c.id);
      const { data: vals } = await supabase
        .from('custom_column_values')
        .select('custom_column_id, row_id, value')
        .in('custom_column_id', colIds);

      if (vals) {
        const colIdToKey = new Map(data.map(c => [c.id, c.column_key]));
        const map = new Map<string, Map<string, string>>();
        for (const v of vals as CustomColumnValueRow[]) {
          const colKey = colIdToKey.get(v.custom_column_id);
          if (!colKey) continue;
          if (!map.has(v.row_id)) map.set(v.row_id, new Map());
          map.get(v.row_id)!.set(colKey, v.value);
        }
        setCustomValues(map);
      }
    }
  }, [tableKey]);

  useEffect(() => { loadColumns(); }, [loadColumns]);

  const createColumn = useCallback(async (input: CustomColumnInput) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const key = `custom_${input.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const { error } = await supabase.from('custom_columns').insert({
      table_key: tableKey,
      owner_id: userData.user.id,
      column_key: key,
      label: input.label,
      field_type: input.fieldType,
      visible_desktop: input.visibleDesktop,
      position: rawColumns.length,
    });
    if (error) throw error;
    await loadColumns();
  }, [tableKey, rawColumns.length, loadColumns]);

  const deleteColumn = useCallback(async (columnKey: string) => {
    const col = rawColumns.find(c => c.column_key === columnKey);
    if (!col) return;
    const { error } = await supabase.from('custom_columns').delete().eq('id', col.id);
    if (error) throw error;
    await loadColumns();
  }, [rawColumns, loadColumns]);

  const renameColumn = useCallback(async (columnKey: string, newLabel: string) => {
    const col = rawColumns.find(c => c.column_key === columnKey);
    if (!col) return;
    const { error } = await supabase.from('custom_columns').update({ label: newLabel }).eq('id', col.id);
    if (error) throw error;
    await loadColumns();
  }, [rawColumns, loadColumns]);

  const getValuesForRow = useCallback((rowId: string): Record<string, string> => {
    const rowMap = customValues.get(rowId);
    if (!rowMap) return {};
    return Object.fromEntries(rowMap);
  }, [customValues]);

  return {
    customDefs,
    customValues,
    getValuesForRow,
    createColumn,
    deleteColumn,
    renameColumn,
  };
}
