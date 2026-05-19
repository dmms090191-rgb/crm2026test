import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import {
  RESTORE_ORDER,
  TABLE_PRIMARY_KEYS,
  FK_RULES,
  BATCH_SIZE,
} from './restoreConstants';
import type { ImportedBackup } from './types';

const TABLES_WITH_COMPANY_ID = new Set([
  'leads', 'vendors', 'import_history', 'statuts', 'registrations',
  'rdv_proposals', 'client_messages', 'vendor_admin_messages', 'conversations',
  'crm_notes', 'crm_tasks', 'crm_documentation', 'doc_tab_labels',
  'crm_custom_pages', 'crm_page_checklist_items', 'sidebar_order', 'vendor_comments',
]);

export type RestoreStatus = 'idle' | 'simulating' | 'restoring' | 'done' | 'error';

export interface TableResult {
  table: string;
  rows: number;
  inserted: number;
  errors: string[];
  skipped: boolean;
}

export interface FkWarning {
  table: string;
  column: string;
  referencedTable: string;
  missingCount: number;
  sampleValues: string[];
}

export interface RestoreReport {
  mode: 'simulation' | 'live';
  startedAt: string;
  finishedAt: string;
  tablesInFile: number;
  tablesWithData: number;
  tablesEmpty: string[];
  tablesAbsent: string[];
  totalTables: number;
  totalRows: number;
  totalInserted: number;
  totalErrors: number;
  tables: TableResult[];
  fkWarnings: FkWarning[];
}

export function useRestoreCrm() {
  const companyId = useCompanyId();
  const [status, setStatus] = useState<RestoreStatus>('idle');
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const abortRef = useRef(false);

  const validateFkCoherence = useCallback((backup: ImportedBackup): FkWarning[] => {
    const warnings: FkWarning[] = [];

    for (const [table, rules] of Object.entries(FK_RULES)) {
      const rows = backup.data[table] as Record<string, unknown>[] | undefined;
      if (!rows || rows.length === 0) continue;

      for (const rule of rules) {
        const refRows = backup.data[rule.referencedTable] as Record<string, unknown>[] | undefined;
        if (!refRows) {
          if (!rule.optional) {
            warnings.push({
              table,
              column: rule.column,
              referencedTable: rule.referencedTable,
              missingCount: rows.length,
              sampleValues: [],
            });
          }
          continue;
        }

        const refIds = new Set(refRows.map((r) => String(r[rule.referencedColumn])));
        const missing: string[] = [];

        for (const row of rows) {
          const val = row[rule.column];
          if (val == null && rule.optional) continue;
          if (val == null) continue;
          if (!refIds.has(String(val))) {
            missing.push(String(val));
          }
        }

        if (missing.length > 0) {
          const uniqueMissing = [...new Set(missing)];
          warnings.push({
            table,
            column: rule.column,
            referencedTable: rule.referencedTable,
            missingCount: missing.length,
            sampleValues: uniqueMissing.slice(0, 5),
          });
        }
      }
    }

    return warnings;
  }, []);

  const simulate = useCallback(async (backup: ImportedBackup) => {
    setStatus('simulating');
    setReport(null);
    setProgress(0);
    abortRef.current = false;

    await new Promise((r) => setTimeout(r, 0));

    const startedAt = new Date().toISOString();
    const tableResults: TableResult[] = [];
    const tablesToRestore = RESTORE_ORDER.filter(
      (t) => backup.data[t] && (backup.data[t] as unknown[]).length > 0
    );
    const totalTables = tablesToRestore.length;

    for (let i = 0; i < tablesToRestore.length; i++) {
      if (abortRef.current) break;
      const table = tablesToRestore[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / totalTables) * 100));

      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));

      const rows = backup.data[table] as unknown[];
      tableResults.push({
        table,
        rows: rows.length,
        inserted: rows.length,
        errors: [],
        skipped: false,
      });
    }

    const tablesEmpty: string[] = [];
    const tablesAbsent: string[] = [];

    for (const table of RESTORE_ORDER) {
      if (tablesToRestore.includes(table)) continue;
      const fileData = backup.data[table];
      if (fileData && Array.isArray(fileData) && fileData.length === 0) {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      } else if (!fileData) {
        tablesAbsent.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: true });
      } else {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      }
    }

    const fkWarnings = validateFkCoherence(backup);
    const totalRows = tableResults.reduce((s, r) => s + r.rows, 0);
    const tablesInFile = RESTORE_ORDER.filter((t) => backup.data[t] !== undefined).length;

    const finalReport: RestoreReport = {
      mode: 'simulation',
      startedAt,
      finishedAt: new Date().toISOString(),
      tablesInFile,
      tablesWithData: totalTables,
      tablesEmpty,
      tablesAbsent,
      totalTables: totalTables,
      totalRows,
      totalInserted: totalRows,
      totalErrors: 0,
      tables: tableResults,
      fkWarnings,
    };

    setReport(finalReport);
    setCurrentTable(null);
    setStatus('done');
    return finalReport;
  }, [validateFkCoherence]);

  const restore = useCallback(async (backup: ImportedBackup) => {
    setStatus('restoring');
    setReport(null);
    setProgress(0);
    abortRef.current = false;

    const startedAt = new Date().toISOString();
    const tableResults: TableResult[] = [];
    const tablesToRestore = RESTORE_ORDER.filter(
      (t) => backup.data[t] && (backup.data[t] as unknown[]).length > 0
    );
    const totalTables = tablesToRestore.length;

    for (let i = 0; i < tablesToRestore.length; i++) {
      if (abortRef.current) break;
      const table = tablesToRestore[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / totalTables) * 100));

      const rows = backup.data[table] as Record<string, unknown>[];
      const pk = TABLE_PRIMARY_KEYS[table] ?? 'id';
      const result: TableResult = { table, rows: rows.length, inserted: 0, errors: [], skipped: false };

      for (let batch = 0; batch < rows.length; batch += BATCH_SIZE) {
        if (abortRef.current) break;
        const rawChunk = rows.slice(batch, batch + BATCH_SIZE);
        const chunk = (companyId && TABLES_WITH_COMPANY_ID.has(table))
          ? rawChunk.map(row => ({ ...row, company_id: companyId }))
          : rawChunk;

        const { error, data } = await supabase
          .from(table)
          .upsert(chunk as never[], { onConflict: pk, ignoreDuplicates: false })
          .select('*');

        if (error) {
          result.errors.push(`Batch ${Math.floor(batch / BATCH_SIZE) + 1}: ${error.message}`);
        } else {
          result.inserted += data?.length ?? chunk.length;
        }
      }

      tableResults.push(result);
    }

    const tablesEmpty: string[] = [];
    const tablesAbsent: string[] = [];

    for (const table of RESTORE_ORDER) {
      if (tablesToRestore.includes(table)) continue;
      const fileData = backup.data[table];
      if (fileData && Array.isArray(fileData) && fileData.length === 0) {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      } else if (!fileData) {
        tablesAbsent.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: true });
      } else {
        tablesEmpty.push(table);
        tableResults.push({ table, rows: 0, inserted: 0, errors: [], skipped: false });
      }
    }

    const fkWarnings = validateFkCoherence(backup);
    const totalRows = tableResults.reduce((s, r) => s + r.rows, 0);
    const totalInserted = tableResults.reduce((s, r) => s + r.inserted, 0);
    const totalErrors = tableResults.reduce((s, r) => s + r.errors.length, 0);
    const tablesInFile = RESTORE_ORDER.filter((t) => backup.data[t] !== undefined).length;

    const finalReport: RestoreReport = {
      mode: 'live',
      startedAt,
      finishedAt: new Date().toISOString(),
      tablesInFile,
      tablesWithData: totalTables,
      tablesEmpty,
      tablesAbsent,
      totalTables,
      totalRows,
      totalInserted,
      totalErrors,
      tables: tableResults,
      fkWarnings,
    };

    setReport(finalReport);
    setCurrentTable(null);
    setStatus(totalErrors > 0 ? 'error' : 'done');
    return finalReport;
  }, [validateFkCoherence]);

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentTable(null);
    setProgress(0);
    setReport(null);
    abortRef.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { status, currentTable, progress, report, simulate, restore, reset, abort };
}
