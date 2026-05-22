import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
  parseCSVText, detectColumnMapping, refineTelephoneMapping,
  processRows, applyDuplicateMatches, countByStatus, generateErrorCSV,
  MAX_FILE_SIZE_MB, MAX_ROWS, BATCH_SIZE,
  type ProcessedRow, type ColumnMapping,
} from '../../../../lib/csvImportPipeline';
import { decodeCsvFile } from '../../../../lib/csvEncoding';
import { parseExcelFile } from '../../../../lib/excelImport';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { ImportMode } from './ImportModeSelector';
import type { ImportRecord, Phase, ImportResultState } from './importLeadsTypes';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export function useImportLeads(activeTab: 'import' | 'history') {
  const { isSimulating } = useSimulation();
  const companyId = useCompanyId();
  const [phase, setPhase] = useState<Phase>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [importMode, setImportMode] = useState<ImportMode>('ignore');
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ImportRecord | null>(null);

  const loadHistory = useCallback(async () => {
    if (!companyId) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('import_history')
      .select('*')
      .eq('company_id', companyId)
      .order('imported_at', { ascending: false });
    setHistory((data ?? []).map((d: ImportRecord & { columns: unknown }) => ({
      ...d,
      columns: Array.isArray(d.columns) ? d.columns : [],
      new_leads_count: d.new_leads_count ?? 0,
      duplicates_count: d.duplicates_count ?? 0,
      errors_count: d.errors_count ?? 0,
      import_mode: d.import_mode ?? '',
    })));
    setHistoryLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  const resetImport = () => {
    setPhase('upload');
    setFile(null);
    setParseError('');
    setProcessedRows([]);
    setAllColumns([]);
    setMapping({});
    setAnalyzeProgress(0);
    setImportMode('ignore');
    setImportResult(null);
  };

  const handleFile = async (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) { setParseError('Format non supporte. Utilisez un fichier CSV, XLSX ou XLS.'); return; }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setParseError(`Le fichier depasse la limite de ${MAX_FILE_SIZE_MB} Mo.`); return; }
    setParseError('');
    setFile(f);
    setPhase('analyzing');
    setAnalyzeProgress(0);

    let parsed: { columns: string[]; rows: Record<string, string>[] };
    if (ext === '.xlsx' || ext === '.xls') {
      parsed = await parseExcelFile(f);
    } else {
      const text = await decodeCsvFile(f);
      parsed = parseCSVText(text);
    }

    if (parsed.columns.length === 0) { setParseError('Le fichier est vide ou invalide.'); setPhase('upload'); return; }
    if (parsed.rows.length > MAX_ROWS) { setParseError(`Le fichier contient ${parsed.rows.length} lignes, la limite est de ${MAX_ROWS} lignes par import.`); setPhase('upload'); return; }

    const rawMapping = detectColumnMapping(parsed.columns);
    const detectedMapping = refineTelephoneMapping(rawMapping, parsed.rows);
    setAllColumns(parsed.columns);
    setMapping(detectedMapping);

    const allRows: ProcessedRow[] = [];
    const total = parsed.rows.length;
    const emailMap = new Map<string, number>();
    const telMap = new Map<string, number>();

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = parsed.rows.slice(i, Math.min(i + BATCH_SIZE, total));
      const processed = processRows(batch, detectedMapping, emailMap, telMap);
      processed.forEach((r, j) => { r.index = i + j; });
      allRows.push(...processed);
      setAnalyzeProgress(Math.round(((i + batch.length) / total) * 70));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const validEmails = allRows.filter(r => r.status === 'valid' && r.email).map(r => r.email as string);
    const validTels = allRows.filter(r => r.status === 'valid' && r.telephone).map(r => r.telephone as string);
    let finalRows = allRows;

    if (validEmails.length > 0 || validTels.length > 0) {
      setAnalyzeProgress(80);
      const { data: matches } = await supabase.rpc('find_duplicate_leads', {
        p_emails: validEmails.length > 0 ? validEmails : ['__no_match__'],
        p_telephones: validTels.length > 0 ? validTels : ['__no_match__'],
        p_company_id: companyId,
      });
      if (matches && matches.length > 0) finalRows = applyDuplicateMatches(allRows, matches);
    }

    setAnalyzeProgress(100);
    setProcessedRows(finalRows);
    await new Promise(resolve => setTimeout(resolve, 200));
    setPhase('preview');
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const handleImport = async () => {
    if (isSimulating) return;
    if (!file || processedRows.length === 0) return;
    setPhase('importing');

    const counts = countByStatus(processedRows);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id ?? null;

    const rowsToInsert = processedRows.filter(r => {
      if (r.status === 'error') return false;
      if (importMode === 'ignore') return r.status === 'valid';
      if (importMode === 'update') return r.status === 'valid';
      if (importMode === 'force') return r.status !== ('error' as string);
      return false;
    });

    const rowsToUpdate = importMode === 'update' ? processedRows.filter(r => r.status === 'dup_crm') : [];

    const newLeadsCount = rowsToInsert.length;
    const updatedCount = rowsToUpdate.length;
    const ignoredCount = importMode === 'ignore' ? counts.dup_file + counts.dup_crm : importMode === 'update' ? counts.dup_file : 0;

    const { data: importRow, error: importError } = await supabase
      .from('import_history')
      .insert({
        file_name: file.name, lead_count: processedRows.length, columns: allColumns,
        new_leads_count: newLeadsCount, duplicates_count: counts.dup_file + counts.dup_crm,
        errors_count: counts.error, import_mode: importMode, source_file: file.name, imported_by: userId,
        ...(companyId ? { company_id: companyId } : {}),
      })
      .select()
      .single();

    if (importError || !importRow) { setParseError("Erreur lors de la creation de l'entree d'import."); setPhase('preview'); return; }

    let insertErrors = 0;
    const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();
    const isValidPin = (v: string | undefined | null) => typeof v === 'string' && /^\d{6}$/.test(v);
    const leadsToInsert = rowsToInsert.map(r => {
      const data = { ...r.raw };
      if (!isValidPin(data['MotDePasse'])) data['MotDePasse'] = generatePin();
      return {
        import_id: importRow.id, prenom: r.prenom || null, nom: r.nom || null,
        email: r.email, telephone: r.telephone, statut: 'Nouveau', source: 'csv_import',
        source_file: file.name, data,
        ...(companyId ? { company_id: companyId } : {}),
      };
    });

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const chunk = leadsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('leads').insert(chunk);
      if (error) insertErrors += chunk.length;
    }

    for (const row of rowsToUpdate) {
      if (!row.dupLeadId) continue;
      const updData = { ...row.raw };
      if (!isValidPin(updData['MotDePasse'])) {
        const { data: existing } = await supabase.from('leads').select('data').eq('id', row.dupLeadId).maybeSingle();
        const existingPin = existing?.data?.MotDePasse;
        updData['MotDePasse'] = isValidPin(existingPin) ? existingPin : generatePin();
      }
      const { error } = await supabase.from('leads').update({
        prenom: row.prenom || null, nom: row.nom || null, email: row.email,
        telephone: row.telephone, source_file: file.name, data: updData,
      }).eq('id', row.dupLeadId);
      if (error) insertErrors++;
    }

    const errorCsvData = counts.error > 0 ? generateErrorCSV(processedRows, mapping, allColumns) : null;

    setImportResult({
      inserted: newLeadsCount - insertErrors, updated: updatedCount,
      ignored: ignoredCount, errors: counts.error + insertErrors,
      mode: importMode, errorCsvData, fileName: file.name,
    });
    setPhase('done');
    if (activeTab === 'history') loadHistory();
  };

  const counts = countByStatus(processedRows);
  const importableCount = (() => {
    if (importMode === 'ignore') return counts.valid;
    if (importMode === 'update') return counts.valid + counts.dup_crm;
    if (importMode === 'force') return counts.valid + counts.dup_file + counts.dup_crm;
    return 0;
  })();

  return {
    phase, dragOver, parseError, file, allColumns, mapping,
    processedRows, setProcessedRows, analyzeProgress, importMode, importResult,
    history, historyLoading, previewRecord, counts, importableCount,
    setDragOver, setImportMode, setPreviewRecord,
    resetImport, handleFile, handleDrop, handleImport,
  };
}
