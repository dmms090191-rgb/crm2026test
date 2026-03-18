import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle, Clock, Eye, X,
  ChevronRight, Download, Users, Calendar, Hash, AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  parseCSVText,
  detectColumnMapping,
  processRows,
  applyDuplicateMatches,
  countByStatus,
  generateErrorCSV,
  MAX_FILE_SIZE_MB,
  MAX_ROWS,
  BATCH_SIZE,
  type ProcessedRow,
  type ColumnMapping,
} from '../../../lib/csvImportPipeline';
import ImportStats from './import/ImportStats';
import ImportModeSelector, { type ImportMode } from './import/ImportModeSelector';
import PreviewTable from './import/PreviewTable';
import ImportResult from './import/ImportResult';

const card = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
};

interface ImportRecord {
  id: string;
  file_name: string;
  lead_count: number;
  new_leads_count: number;
  duplicates_count: number;
  errors_count: number;
  import_mode: string;
  columns: string[];
  imported_at: string;
  source_file: string | null;
}

interface HistoryPreviewProps {
  record: ImportRecord;
  onClose: () => void;
}

function HistoryPreview({ record, onClose }: HistoryPreviewProps) {
  const [leads, setLeads] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('leads')
        .select('data, prenom, nom, email, telephone')
        .eq('import_id', record.id)
        .order('imported_at', { ascending: true });

      setLeads((data ?? []).map((d: { data: Record<string, string>; prenom: string | null; nom: string | null; email: string | null; telephone: string | null }) => {
        const row = { ...d.data };
        if (d.prenom) row['Prenom'] = d.prenom;
        if (d.nom) row['Nom'] = d.nom;
        if (d.email) row['Email'] = d.email;
        if (d.telephone) row['Telephone'] = d.telephone;
        return row;
      }));
      setLoading(false);
    })();
  }, [record.id]);

  const cols = record.columns.length > 0 ? record.columns : ['Prenom', 'Nom', 'Email', 'Telephone'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white text-sm font-bold">{record.file_name}</h3>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-slate-600 text-xs">{record.lead_count} leads · {new Date(record.imported_at).toLocaleDateString('fr-FR')} {new Date(record.imported_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                {record.import_mode && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}>
                    {record.import_mode}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {record.new_leads_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                +{record.new_leads_count} nouveaux
              </span>
            )}
            {record.duplicates_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                {record.duplicates_count} doublons
              </span>
            )}
            {record.errors_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)' }}>
                {record.errors_count} erreurs
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all ml-2">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase text-slate-600 w-10">#</th>
                  {cols.map(col => (
                    <th key={col} className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase text-slate-600 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-slate-700">{i + 1}</td>
                    {cols.map(col => (
                      <td key={col} className="px-4 py-2.5 text-slate-400 max-w-[200px] truncate">{row[col] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type Phase = 'upload' | 'analyzing' | 'preview' | 'importing' | 'done';

interface ImportResultState {
  inserted: number;
  updated: number;
  ignored: number;
  errors: number;
  mode: ImportMode;
  errorCsvData: string | null;
  fileName: string;
}

interface ImportLeadsProps {
  onNavigateToCrm?: () => void;
}

export default function ImportLeads({ onNavigateToCrm }: ImportLeadsProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

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

  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('import_history')
      .select('*')
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
  }, []);

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

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setParseError('Veuillez sélectionner un fichier .csv');
      return;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setParseError(`Le fichier dépasse la limite de ${MAX_FILE_SIZE_MB} Mo.`);
      return;
    }
    setParseError('');
    setFile(f);
    setPhase('analyzing');
    setAnalyzeProgress(0);

    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target?.result as string;
      const parsed = parseCSVText(text);

      if (parsed.columns.length === 0) {
        setParseError('Le fichier CSV est vide ou invalide.');
        setPhase('upload');
        return;
      }

      if (parsed.rows.length > MAX_ROWS) {
        setParseError(`Le fichier contient ${parsed.rows.length} lignes, la limite est de ${MAX_ROWS} lignes par import.`);
        setPhase('upload');
        return;
      }

      const detectedMapping = detectColumnMapping(parsed.columns);
      setAllColumns(parsed.columns);
      setMapping(detectedMapping);

      const allRows: ProcessedRow[] = [];
      const total = parsed.rows.length;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = parsed.rows.slice(i, Math.min(i + BATCH_SIZE, total));
        const processed = processRows(batch, detectedMapping);
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
        });

        if (matches && matches.length > 0) {
          finalRows = applyDuplicateMatches(allRows, matches);
        }
      }

      setAnalyzeProgress(100);
      setProcessedRows(finalRows);

      await new Promise(resolve => setTimeout(resolve, 200));
      setPhase('preview');
    };
    reader.readAsText(f, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file || processedRows.length === 0) return;
    setPhase('importing');

    const counts = countByStatus(processedRows);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id ?? null;

    const rowsToInsert = processedRows.filter(r => {
      if (r.status === 'error') return false;
      if (importMode === 'ignore') return r.status === 'valid';
      if (importMode === 'update') return r.status === 'valid';
      if (importMode === 'force') return r.status !== 'error';
      return false;
    });

    const rowsToUpdate = importMode === 'update'
      ? processedRows.filter(r => r.status === 'dup_crm')
      : [];

    const newLeadsCount = rowsToInsert.length;
    const updatedCount = rowsToUpdate.length;
    const ignoredCount = importMode === 'ignore'
      ? counts.dup_file + counts.dup_crm
      : importMode === 'update'
      ? counts.dup_file
      : 0;

    const { data: importRow, error: importError } = await supabase
      .from('import_history')
      .insert({
        file_name: file.name,
        lead_count: processedRows.length,
        columns: allColumns,
        new_leads_count: newLeadsCount,
        duplicates_count: counts.dup_file + counts.dup_crm,
        errors_count: counts.error,
        import_mode: importMode,
        source_file: file.name,
        imported_by: userId,
      })
      .select()
      .single();

    if (importError || !importRow) {
      setParseError("Erreur lors de la création de l'entrée d'import.");
      setPhase('preview');
      return;
    }

    let insertErrors = 0;

    const leadsToInsert = rowsToInsert.map(r => ({
      import_id: importRow.id,
      prenom: r.prenom || null,
      nom: r.nom || null,
      email: r.email,
      telephone: r.telephone,
      source: 'csv_import',
      source_file: file.name,
      data: r.raw,
    }));

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const chunk = leadsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('leads').insert(chunk);
      if (error) insertErrors += chunk.length;
    }

    for (const row of rowsToUpdate) {
      if (!row.dupLeadId) continue;
      const { error } = await supabase
        .from('leads')
        .update({
          prenom: row.prenom || null,
          nom: row.nom || null,
          email: row.email,
          telephone: row.telephone,
          source_file: file.name,
          data: row.raw,
        })
        .eq('id', row.dupLeadId);
      if (error) insertErrors++;
    }

    const errorCsvData = counts.error > 0
      ? generateErrorCSV(processedRows, mapping, allColumns)
      : null;

    setImportResult({
      inserted: newLeadsCount - insertErrors,
      updated: updatedCount,
      ignored: ignoredCount,
      errors: counts.error + insertErrors,
      mode: importMode,
      errorCsvData,
      fileName: file.name,
    });

    setPhase('done');

    if (activeTab === 'history') loadHistory();
  };

  const counts = countByStatus(processedRows);

  const tabs = [
    { key: 'import', label: 'Import', icon: <Upload className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'Historique des imports', icon: <Clock className="w-3.5 h-3.5" /> },
  ] as const;

  const importableCount = (() => {
    if (importMode === 'ignore') return counts.valid;
    if (importMode === 'update') return counts.valid + counts.dup_crm;
    if (importMode === 'force') return counts.valid + counts.dup_file + counts.dup_crm;
    return 0;
  })();

  return (
    <>
      {previewRecord && <HistoryPreview record={previewRecord} onClose={() => setPreviewRecord(null)} />}

      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl p-4" style={card}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', boxShadow: '0 0 16px rgba(34,211,238,0.3)' }}
          >
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-sm font-bold">Import de leads</h2>
            <p className="text-slate-600 text-xs">
              Importez vos contacts depuis un fichier CSV — max {MAX_FILE_SIZE_MB} Mo · {MAX_ROWS.toLocaleString('fr-FR')} lignes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={
                activeTab === t.key
                  ? { background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', color: '#050a10', boxShadow: '0 0 12px rgba(34,211,238,0.25)' }
                  : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'import' && (
          <div className="space-y-4">

            {phase === 'done' && importResult && (
              <ImportResult
                {...importResult}
                onNewImport={resetImport}
                onGoToCrm={() => { resetImport(); onNavigateToCrm?.(); }}
              />
            )}

            {phase === 'upload' && (
              <div>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all"
                  style={{
                    ...card,
                    border: dragOver ? '1px dashed rgba(34,211,238,0.5)' : '1px dashed rgba(255,255,255,0.1)',
                    background: dragOver ? 'rgba(34,211,238,0.04)' : card.background,
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
                    style={{
                      background: dragOver ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${dragOver ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Upload className="w-7 h-7" style={{ color: dragOver ? '#22d3ee' : 'rgba(255,255,255,0.25)' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-semibold">Glissez-déposez votre fichier CSV</p>
                    <p className="text-slate-600 text-xs mt-1">ou cliquez pour sélectionner depuis votre ordinateur</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="px-3 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      .csv uniquement
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      Max {MAX_FILE_SIZE_MB} Mo
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      Max {MAX_ROWS.toLocaleString('fr-FR')} lignes
                    </span>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                {parseError && (
                  <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{parseError}</p>
                  </div>
                )}
              </div>
            )}

            {phase === 'analyzing' && (
              <div className="rounded-2xl p-10 flex flex-col items-center gap-5" style={card}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Analyse en cours...</p>
                  <p className="text-slate-600 text-xs mt-1">Validation, normalisation et détection des doublons</p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-600 text-[10px]">Progression</span>
                    <span className="text-slate-400 text-[10px] tabular-nums">{analyzeProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${analyzeProgress}%`, background: 'linear-gradient(90deg, #22d3ee, #0ea5e9)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {phase === 'preview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Fichier', value: file?.name ?? '', icon: <FileText className="w-4 h-4" />, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)' },
                    { label: 'Lignes totales', value: String(counts.total), icon: <Users className="w-4 h-4" />, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
                    { label: 'Colonnes', value: String(allColumns.length), icon: <Hash className="w-4 h-4" />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4" style={card}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-xs">{s.label}</span>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {s.icon}
                        </div>
                      </div>
                      <p className="text-white text-sm font-bold truncate">{s.value}</p>
                    </div>
                  ))}
                </div>

                {Object.values(mapping).some(Boolean) && (
                  <div
                    className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}
                  >
                    <span className="text-cyan-400 text-[10px] font-bold tracking-widest uppercase">Colonnes détectées</span>
                    {Object.entries(mapping).filter(([, v]) => v).map(([k, v]) => (
                      <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-600">→</span>
                        <span>{v}</span>
                      </span>
                    ))}
                  </div>
                )}

                <ImportStats
                  total={counts.total}
                  valid={counts.valid}
                  dupFile={counts.dup_file}
                  dupCrm={counts.dup_crm}
                  errors={counts.error}
                />

                <ImportModeSelector
                  value={importMode}
                  onChange={setImportMode}
                  dupCrmCount={counts.dup_crm}
                />

                <div
                  className="rounded-2xl overflow-hidden"
                  style={card}
                >
                  <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-white text-sm font-semibold">Prévisualisation</h3>
                    <span className="text-slate-600 text-xs ml-auto">Survolez le badge de statut pour voir le détail</span>
                  </div>
                  <PreviewTable
                    rows={processedRows}
                    allColumns={allColumns}
                    mappedColumns={mapping}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={resetImport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Annuler
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importableCount === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:brightness-110 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
                      color: '#050a10',
                      boxShadow: importableCount > 0 ? '0 0 20px rgba(34,211,238,0.3)' : 'none',
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Valider l'importation ({importableCount} lead{importableCount !== 1 ? 's' : ''})
                  </button>
                </div>
              </div>
            )}

            {phase === 'importing' && (
              <div className="rounded-2xl p-10 flex flex-col items-center gap-4" style={card}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Import en cours...</p>
                  <p className="text-slate-600 text-xs mt-1">Envoi des données vers le CRM</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl overflow-hidden" style={card}>
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white text-sm font-semibold">Historique des imports</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                {history.length}
              </span>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Download className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-slate-600 text-sm">Aucun import effectué</p>
              </div>
            ) : (
              <div>
                {history.map((record, idx) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors cursor-pointer group"
                    style={{ borderBottom: idx < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onClick={() => setPreviewRecord(record)}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                      <FileText className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm font-semibold truncate">{record.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Calendar className="w-3 h-3" />
                          {new Date(record.imported_at).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Clock className="w-3 h-3" />
                          {new Date(record.imported_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {record.import_mode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {record.import_mode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {record.new_leads_count > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                          <Users className="w-2.5 h-2.5" />
                          +{record.new_leads_count}
                        </span>
                      )}
                      {record.duplicates_count > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                          {record.duplicates_count} doublons
                        </span>
                      )}
                      {record.errors_count > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)' }}>
                          {record.errors_count} erreurs
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
