import { useState } from 'react';
import { Upload, Clock, Download, Loader2 } from 'lucide-react';
import { MAX_FILE_SIZE_MB, MAX_ROWS } from '../../../lib/csvImportPipeline';
import ImportResult from './import/ImportResult';
import HistoryPreview from './import/HistoryPreview';
import HistoryTab from './import/HistoryTab';
import PreviewPhase from './import/PreviewPhase';
import UploadZone from './import/UploadZone';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useImportLeads } from './import/useImportLeads';

interface ImportLeadsProps {
  onNavigateToCrm?: () => void;
}

export default function ImportLeads({ onNavigateToCrm }: ImportLeadsProps) {
  const tokens = useThemeTokens();
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

  const {
    phase, dragOver, parseError, file, allColumns, mapping,
    processedRows, setProcessedRows, analyzeProgress, importMode, importResult,
    history, historyLoading, previewRecord, counts, importableCount,
    setDragOver, setImportMode, setPreviewRecord,
    resetImport, handleFile, handleDrop, handleImport,
  } = useImportLeads(activeTab);

  const tabs = [
    { key: 'import', label: 'Import', icon: <Upload className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'Historique des imports', icon: <Clock className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <>
      {previewRecord && <HistoryPreview record={previewRecord} onClose={() => setPreviewRecord(null)} />}

      <div className="space-y-5">
        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl p-3 sm:p-4" style={{ background: tokens.card.bg, border: tokens.card.border }}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', boxShadow: '0 0 16px rgba(34,211,238,0.3)' }}>
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Import de leads</h2>
            <p className="text-[11px] sm:text-xs truncate" style={{ color: tokens.text.quaternary }}>Importez vos contacts depuis un fichier CSV — max {MAX_FILE_SIZE_MB} Mo · {MAX_ROWS.toLocaleString('fr-FR')} lignes</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: tokens.surface.tertiary, border: tokens.card.border }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={activeTab === t.key ? { background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', color: '#050a10', boxShadow: '0 0 12px rgba(34,211,238,0.25)' } : { color: tokens.text.tertiary }}
            >{t.icon}{t.label}</button>
          ))}
        </div>

        {activeTab === 'import' && (
          <div className="space-y-4">
            {phase === 'done' && importResult && (
              <ImportResult {...importResult} onNewImport={resetImport} onGoToCrm={() => { resetImport(); onNavigateToCrm?.(); }} />
            )}

            {phase === 'upload' && (
              <UploadZone
                dragOver={dragOver} parseError={parseError}
                onDragOver={() => setDragOver(true)} onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop} onFile={handleFile}
              />
            )}

            {phase === 'analyzing' && (
              <div className="rounded-2xl p-10 flex flex-col items-center gap-5" style={{ background: tokens.card.bg, border: tokens.card.border }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: tokens.accent.bg, border: tokens.accent.border }}>
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: tokens.accent.text }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: tokens.text.primary }}>Analyse en cours...</p>
                  <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>Validation, normalisation et detection des doublons</p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px]" style={{ color: tokens.text.quaternary }}>Progression</span>
                    <span className="text-[10px] tabular-nums" style={{ color: tokens.text.tertiary }}>{analyzeProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: tokens.surface.borderLight }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${analyzeProgress}%`, background: 'linear-gradient(90deg, #22d3ee, #0ea5e9)' }} />
                  </div>
                </div>
              </div>
            )}

            {phase === 'preview' && (
              <PreviewPhase
                file={file} counts={counts} allColumns={allColumns} mapping={mapping}
                processedRows={processedRows} onProcessedRowsChange={setProcessedRows}
                importMode={importMode}
                onImportModeChange={setImportMode} importableCount={importableCount}
                onReset={resetImport} onImport={handleImport}
              />
            )}

            {phase === 'importing' && (
              <div className="rounded-2xl p-10 flex flex-col items-center gap-4" style={{ background: tokens.card.bg, border: tokens.card.border }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: tokens.accent.bg, border: tokens.accent.border }}>
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: tokens.accent.text }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: tokens.text.primary }}>Import en cours...</p>
                  <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>Envoi des donnees vers le CRM</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab history={history} historyLoading={historyLoading} onPreview={setPreviewRecord} />
        )}
      </div>
    </>
  );
}
