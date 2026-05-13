import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Upload, RotateCcw, ShieldCheck, AlertTriangle, CheckCircle, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { CRM_TABLE_NAMES } from './sauvegarde/restoreConstants';
import { ImportPreview } from './sauvegarde/ImportPreview';
import { ExportPreview } from './sauvegarde/ExportPreview';
import { BackupCard } from './sauvegarde/BackupCard';
import { BackupConfigSection } from './sauvegarde/BackupConfigSection';
import { RestoreConfirmModal } from './sauvegarde/RestoreConfirmModal';
import { RestoreProgress } from './sauvegarde/RestoreProgress';
import { RestoreReportPanel } from './sauvegarde/RestoreReport';
import { SimulationPreview } from './sauvegarde/SimulationPreview';
import { OrphanCleanupSection } from './sauvegarde/OrphanCleanupSection';
import { useExportCrm } from './sauvegarde/useExportCrm';
import { useRestoreCrm } from './sauvegarde/useRestoreCrm';
import { useSimulation } from '../../../contexts/SimulationContext';
import type { SimulationData } from '../../../contexts/SimulationContext';
import type { ImportedBackup } from './sauvegarde/types';

export default function SauvegardeRestauration() {
  const t = useThemeTokens();
  const { exporting, exportResult, exportSnapshot, handleExport, clearExportResult, clearExportSnapshot } = useExportCrm();
  const { status, currentTable, progress, report, simulate, restore, reset } = useRestoreCrm();
  const { isSimulating } = useSimulation();
  const [importedBackup, setImportedBackup] = useState<ImportedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showVisualPreview, setShowVisualPreview] = useState(false);
  const [previewData, setPreviewData] = useState<SimulationData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (exportResult?.status === 'success') {
      const timer = setTimeout(clearExportResult, 5000);
      return () => clearTimeout(timer);
    }
  }, [exportResult, clearExportResult]);

  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError('Le fichier doit etre au format .json');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!raw || typeof raw !== 'object') {
          setImportError('Fichier JSON invalide : contenu non reconnu.');
          return;
        }
        if (!raw.metadata) {
          setImportError('Ce fichier ne contient pas de champ "metadata". Ce n\'est pas une sauvegarde CRM valide.');
          return;
        }
        if (!raw.data || typeof raw.data !== 'object') {
          setImportError('Ce fichier ne contient pas de champ "data". Ce n\'est pas une sauvegarde CRM valide.');
          return;
        }
        if (!raw.metadata.exported_tables || !Array.isArray(raw.metadata.exported_tables)) {
          setImportError('Le champ "metadata.exported_tables" est manquant ou invalide.');
          return;
        }
        if (!raw.metadata.counts || typeof raw.metadata.counts !== 'object') {
          setImportError('Le champ "metadata.counts" est manquant ou invalide.');
          return;
        }

        setImportedBackup({
          filename: file.name,
          metadata: {
            date_export: raw.metadata.date_export ?? '',
            version_crm: raw.metadata.version_crm ?? '',
            version_schema: raw.metadata.version_schema ?? '',
            exported_tables: raw.metadata.exported_tables,
            failed_tables: raw.metadata.failed_tables ?? [],
            counts: raw.metadata.counts,
            security_notes: raw.metadata.security_notes,
          },
          data: raw.data,
        });
        setImportError(null);
      } catch {
        setImportError('Impossible de lire le fichier : JSON invalide ou corrompu.');
      }
    };
    reader.onerror = () => {
      setImportError('Erreur lors de la lecture du fichier.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClearImport = useCallback(() => {
    setImportedBackup(null);
    setImportError(null);
    reset();
  }, [reset]);

  const handleSimulate = useCallback(() => {
    if (!importedBackup) return;
    setShowRestoreModal(false);
    simulate(importedBackup);
  }, [importedBackup, simulate]);

  const handleRestoreConfirm = useCallback(() => {
    if (!importedBackup) return;
    setShowRestoreModal(false);
    restore(importedBackup);
  }, [importedBackup, restore]);

  const handleToggleVisualPreview = useCallback(() => {
    if (showVisualPreview) {
      setShowVisualPreview(false);
      return;
    }
    if (!importedBackup) return;
    setPreviewData({
      filename: importedBackup.filename,
      exportDate: importedBackup.metadata.date_export,
      tables: importedBackup.data as Record<string, unknown[]>,
      counts: importedBackup.metadata.counts,
    });
    setShowVisualPreview(true);
  }, [importedBackup, showVisualPreview]);

  const isProcessing = status === 'simulating' || status === 'restoring';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.heading.primary }}>
          Sauvegarde & restauration
        </h1>
        <p className="mt-1 text-xs sm:text-sm break-words" style={{ color: t.text.secondary }}>
          Exporter, importer, analyser et restaurer les donnees du CRM.
        </p>
      </div>

      <div
        className="flex items-start gap-3 rounded-xl px-4 sm:px-5 py-3 sm:py-4 min-w-0"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
      >
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: t.accent.solid }} />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: t.text.primary }}>
            Donnees concernees — {CRM_TABLE_NAMES.length} tables
          </p>
          <p className="text-xs leading-relaxed break-words whitespace-normal" style={{ color: t.text.secondary }}>
            Leads, vendeurs, clients, messages, conversations, commentaires, statuts, agenda perso,
            agenda equipe, rendez-vous, propositions RDV, ameliorations, documentation, notes,
            idees, taches et toutes les relations entre ces donnees.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <BackupCard
          icon={<Download className="w-6 h-6" />}
          title="Exporter une sauvegarde"
          description={`Telecharger une sauvegarde complete du CRM au format JSON (${CRM_TABLE_NAMES.length} tables).`}
          buttonLabel="Exporter CRM"
          onClick={handleExport}
          loading={exporting}
          tokens={t}
        />
        <BackupCard
          icon={<Upload className="w-6 h-6" />}
          title="Importer une sauvegarde"
          description="Importer un fichier JSON de sauvegarde precedemment exporte."
          buttonLabel="Importer CRM"
          onClick={handleImportClick}
          disabled={isProcessing || isSimulating}
          tokens={t}
        />
        <BackupCard
          icon={<RotateCcw className="w-6 h-6" />}
          title="Restaurer les donnees"
          description="Restaurer les donnees apres apercu et confirmation manuelle."
          buttonLabel="Restaurer"
          disabled={!importedBackup || isProcessing || isSimulating}
          onClick={() => setShowRestoreModal(true)}
          variant="warning"
          tokens={t}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {exportResult && (
        <div
          className="flex items-start sm:items-center gap-3 rounded-xl px-4 sm:px-5 py-3 sm:py-4 min-w-0"
          style={{
            background: exportResult.status === 'success' ? t.success.bg : t.danger.bg,
            border: `1px solid ${exportResult.status === 'success' ? t.success.border : t.danger.border}`,
          }}
        >
          {exportResult.status === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: t.success.text }} />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: t.danger.text }} />
          )}
          <p className="text-xs sm:text-sm font-medium break-words min-w-0"
            style={{ color: exportResult.status === 'success' ? t.success.text : t.danger.text }}>
            {exportResult.message}
          </p>
        </div>
      )}

      {importError && (
        <div
          className="flex items-start sm:items-center gap-3 rounded-xl px-4 sm:px-5 py-3 sm:py-4 min-w-0"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: t.danger.text }} />
          <p className="text-xs sm:text-sm font-medium break-words min-w-0 flex-1" style={{ color: t.danger.text }}>{importError}</p>
          <button
            onClick={() => setImportError(null)}
            className="p-1 rounded-md hover:opacity-70 transition-opacity flex-shrink-0"
            style={{ color: t.danger.text }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {exportSnapshot && (
        <ExportPreview snapshot={exportSnapshot} onClear={clearExportSnapshot} tokens={t} />
      )}

      {importedBackup && (
        <ImportPreview backup={importedBackup} onClear={handleClearImport} tokens={t} />
      )}

      {isProcessing && (
        <RestoreProgress status={status} currentTable={currentTable} progress={progress} tokens={t} />
      )}

      {report && (
        <RestoreReportPanel report={report} onClose={reset} tokens={t} />
      )}

      {importedBackup && report && (
        <button
          onClick={handleToggleVisualPreview}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
          style={{ background: t.accent.bg, color: t.accent.solid }}
        >
          {showVisualPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showVisualPreview ? "Masquer l'apercu visuel" : "Voir l'apercu visuel de la sauvegarde"}
        </button>
      )}

      {showVisualPreview && previewData && (
        <SimulationPreview data={previewData} />
      )}

      <OrphanCleanupSection tokens={t} onCleanupDone={() => { clearExportSnapshot(); setShowVisualPreview(false); setPreviewData(null); }} />

      <BackupConfigSection tokens={t} />

      <div className="flex items-start gap-3 rounded-xl px-4 sm:px-5 py-3 sm:py-4 min-w-0" style={{ background: t.surface.tertiary, border: `1px dashed ${t.surface.borderLight}` }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.text.tertiary }} />
        <p className="text-xs break-words min-w-0" style={{ color: t.text.tertiary }}>
          La restauration insere/met a jour les donnees dans les tables existantes. Elle ne modifie jamais la structure (tables, colonnes, policies, triggers, migrations).
        </p>
      </div>

      {showRestoreModal && importedBackup && (
        <RestoreConfirmModal
          backup={importedBackup}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestoreConfirm}
          onSimulate={handleSimulate}
          tokens={t}
        />
      )}
    </div>
  );
}
