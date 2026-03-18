import { CheckCircle, Upload, Users, AlertCircle, Copy, Download } from 'lucide-react';
import type { ImportMode } from './ImportModeSelector';

interface ImportResultProps {
  inserted: number;
  updated: number;
  ignored: number;
  errors: number;
  mode: ImportMode;
  errorCsvData: string | null;
  fileName: string;
  onNewImport: () => void;
  onGoToCrm: () => void;
}

const modeLabel: Record<ImportMode, string> = {
  ignore: 'Ignorer les doublons',
  update: 'Mettre à jour les doublons',
  force: 'Forcer l\'import',
};

export default function ImportResult({ inserted, updated, ignored, errors, mode, errorCsvData, fileName, onNewImport, onGoToCrm }: ImportResultProps) {
  const handleDownloadErrors = () => {
    if (!errorCsvData) return;
    const blob = new Blob([errorCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erreurs_${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: 'Insérés', value: inserted, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Mis à jour', value: updated, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)', icon: <Users className="w-4 h-4" /> },
    { label: 'Ignorés', value: ignored, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Erreurs', value: errors, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div
      className="rounded-2xl p-8 space-y-6"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <CheckCircle className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-base">Import terminé</p>
          <p className="text-slate-500 text-xs mt-1">
            Mode : <span className="text-slate-300">{modeLabel[mode]}</span> &nbsp;·&nbsp; Fichier : <span className="text-slate-300">{fileName}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: s.value > 0 && s.label !== 'Ignorés' ? s.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${s.value > 0 && s.label !== 'Ignorés' ? s.border : 'rgba(255,255,255,0.05)'}` }}
          >
            <p className="text-xl font-bold tabular-nums" style={{ color: s.value > 0 ? s.color : 'rgba(255,255,255,0.2)' }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {errorCsvData && errors > 0 && (
          <button
            onClick={handleDownloadErrors}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger les erreurs ({errors} lignes)
          </button>
        )}
        <button
          onClick={onGoToCrm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <Users className="w-3.5 h-3.5" />
          Voir dans le CRM
        </button>
        <button
          onClick={onNewImport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
          style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          <Upload className="w-3.5 h-3.5" />
          Importer un autre fichier
        </button>
      </div>
    </div>
  );
}
