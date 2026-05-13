import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { CRM_TABLE_NAMES, SCHEMA_VERSION } from './restoreConstants';

type ExportResult = { status: 'success' | 'error'; message: string } | null;

export interface ExportSnapshot {
  date: string;
  counts: Record<string, number>;
  exportedTables: string[];
  failedTables: { table: string; error: string }[];
  totalRows: number;
}

const TABLES_WITH_DELETED_COLUMN = ['client_messages', 'vendor_admin_messages'];

export function useExportCrm() {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult>(null);
  const [exportSnapshot, setExportSnapshot] = useState<ExportSnapshot | null>(null);

  const clearExportResult = useCallback(() => setExportResult(null), []);
  const clearExportSnapshot = useCallback(() => setExportSnapshot(null), []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportResult(null);

    const data: Record<string, unknown[]> = {};
    const exportedTables: string[] = [];
    const failedTables: { table: string; error: string }[] = [];
    const counts: Record<string, number> = {};

    const results = await Promise.allSettled(
      CRM_TABLE_NAMES.map(async (table) => {
        let query = supabase.from(table).select('*');
        if (TABLES_WITH_DELETED_COLUMN.includes(table)) {
          query = query.or('deleted.is.null,deleted.eq.false');
        }
        const { data: rows, error } = await query;
        return { table, rows, error };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { table, rows, error } = result.value;
        if (error) {
          failedTables.push({ table, error: error.message });
        } else {
          data[table] = rows ?? [];
          exportedTables.push(table);
          counts[table] = (rows ?? []).length;
        }
      } else {
        const reason = result.reason as { table?: string; message?: string };
        failedTables.push({
          table: reason?.table ?? 'unknown',
          error: reason?.message ?? 'Erreur inconnue',
        });
      }
    }

    if (exportedTables.length === 0) {
      setExporting(false);
      setExportSnapshot(null);
      setExportResult({ status: 'error', message: 'Echec total : aucune table exportee.' });
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;

    const exportObj = {
      metadata: {
        date_export: now.toISOString(),
        version_crm: '1.0.0',
        version_schema: SCHEMA_VERSION,
        exported_tables: exportedTables,
        failed_tables: failedTables,
        counts,
        security_notes:
          "Les champs 'password' dans vendors, registrations et registration_requests sont presents car ils existent en base. Ces valeurs ne sont PAS des mots de passe Supabase Auth en clair mais des hash ou valeurs applicatives stockees par le CRM.",
      },
      data,
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `crm-backup-${dateStr}.json` }).click();
    URL.revokeObjectURL(url);

    const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);
    setExportSnapshot({
      date: now.toISOString(),
      counts,
      exportedTables,
      failedTables,
      totalRows,
    });

    setExporting(false);
    const failedMsg = failedTables.length > 0
      ? ` (${failedTables.length} table(s) en echec)`
      : '';
    setExportResult({
      status: 'success',
      message: `Export reussi - ${exportedTables.length} tables exportees${failedMsg}`,
    });
  }, []);

  return { exporting, exportResult, exportSnapshot, handleExport, clearExportResult, clearExportSnapshot };
}
