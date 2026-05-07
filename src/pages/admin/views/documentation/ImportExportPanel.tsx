import { useState, useRef, useCallback } from 'react';
import { Download, Upload, CheckCircle, AlertTriangle, Loader2, X, FileJson, Shield } from 'lucide-react';
import { exportDocumentation, downloadJson } from '../../../../lib/exportDocumentation';
import { importDocumentation, validateExportFile, type ImportResult } from '../../../../lib/importDocumentation';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  onImportComplete: () => void;
}

type Step = 'idle' | 'exporting' | 'importing' | 'result' | 'error';

const SECTION_LABELS: Record<string, string> = {
  crm_documentation: 'Documentation',
  doc_tab_labels: 'Noms d\'onglets',
  sidebar_order: 'Ordre de la sidebar',
  crm_notes: 'Notes',
  crm_ideas: 'Idees',
  crm_context_cards: 'Cartes de contexte',
  crm_amelioration_categories: 'Categories d\'ameliorations',
  crm_ameliorations: 'Ameliorations',
};

export default function ImportExportPanel({ onImportComplete }: Props) {
  const tokens = useThemeTokens();
  const [step, setStep] = useState<Step>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    setStep('exporting');
    try {
      const data = await exportDocumentation();
      downloadJson(data);
      setStep('idle');
    } catch {
      setErrorMsg('Erreur lors de l\'export.');
      setStep('error');
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    setStep('importing');
    setErrorMsg('');

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorMsg('Le fichier n\'est pas un JSON valide.');
        setStep('error');
        return;
      }

      if (!validateExportFile(parsed)) {
        setErrorMsg('Le fichier ne correspond pas au format d\'export attendu (version 1).');
        setStep('error');
        return;
      }

      const result = await importDocumentation(parsed);
      setImportResult(result);
      setStep('result');
    } catch {
      setErrorMsg('Erreur inattendue lors de l\'import.');
      setStep('error');
    }
  }, []);

  const handleCloseResult = useCallback(() => {
    setStep('idle');
    setImportResult(null);
    onImportComplete();
  }, [onImportComplete]);

  const handleCloseError = useCallback(() => {
    setStep('idle');
    setErrorMsg('');
  }, []);

  const totalImported = importResult
    ? Object.values(importResult).reduce((s, v) => s + v.imported, 0)
    : 0;
  const totalSkipped = importResult
    ? Object.values(importResult).reduce((s, v) => s + v.skipped, 0)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={step === 'exporting' || step === 'importing'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{
            background: tokens.success.bg,
            border: `1px solid ${tokens.success.border}`,
            color: tokens.success.text,
            opacity: step === 'exporting' || step === 'importing' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = tokens.success.bg; e.currentTarget.style.borderColor = tokens.success.border; }}
        >
          {step === 'exporting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Exporter JSON
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={step === 'exporting' || step === 'importing'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{
            background: tokens.accent.bg,
            border: `1px solid ${tokens.accent.border}`,
            color: tokens.accent.text,
            opacity: step === 'exporting' || step === 'importing' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bgHover; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.borderColor = tokens.accent.border; }}
        >
          {step === 'importing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Importer JSON
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {step === 'importing' && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Import en cours...
        </div>
      )}

      {step === 'result' && importResult && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: tokens.success.bg,
            border: `1px solid ${tokens.success.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: tokens.success.text }} />
              <span className="text-sm font-semibold" style={{ color: tokens.success.text }}>
                Import termine
              </span>
            </div>
            <button
              onClick={handleCloseResult}
              className="p-1 rounded-lg transition-all duration-150"
              style={{ color: tokens.text.quaternary }}
              onMouseEnter={(e) => { e.currentTarget.style.color = tokens.text.secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.quaternary; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs" style={{ color: tokens.text.tertiary }}>
            <div className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5" style={{ color: tokens.success.text }} />
              <span className="font-medium" style={{ color: tokens.success.text }}>{totalImported}</span> importes
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
              <span className="font-medium" style={{ color: tokens.text.quaternary }}>{totalSkipped}</span> ignores (deja existants)
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {(Object.keys(importResult) as (keyof ImportResult)[]).map((key) => {
              const { imported, skipped } = importResult[key];
              if (imported === 0 && skipped === 0) return null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: tokens.surface.secondary }}
                >
                  <span style={{ color: tokens.text.tertiary }}>{SECTION_LABELS[key] ?? key}</span>
                  <div className="flex items-center gap-3">
                    {imported > 0 && (
                      <span style={{ color: tokens.success.text }}>+{imported}</span>
                    )}
                    {skipped > 0 && (
                      <span style={{ color: tokens.text.quaternary }}>{skipped} ignores</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 'error' && (
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs"
          style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={handleCloseError}
            className="p-0.5 rounded transition-all duration-150 flex-shrink-0 ml-2"
            style={{ color: tokens.danger.text }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.danger.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = tokens.danger.text; }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
