import { CheckCircle, Upload, Users, AlertCircle, Copy, Download, FolderOpen, RefreshCw, Link2, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { LIBELLES_MODE } from '../../../../lib/importOnglet';
import type { ImportResultState } from './importLeadsTypes';
import { LIBELLES_SYSTEME, type CleSystemeOnglet } from '../../../../lib/ongletsLeads';

const libelleColonne = (c: string) => (c in LIBELLES_SYSTEME ? LIBELLES_SYSTEME[c as CleSystemeOnglet] : c);

interface ImportResultProps extends ImportResultState {
  onNewImport: () => void;
  onGoToCrm: () => void;
}

export default function ImportResult({
  inserted, updated, ignored, errors, lies, conflits, reaffichees, interrompu,
  mode, errorCsvData, fileName, ongletNom, onNewImport, onGoToCrm,
}: ImportResultProps) {
  const tokens = useThemeTokens();

  const handleDownloadErrors = () => {
    if (!errorCsvData) return;
    /* Le BOM : sans lui, Excel ouvre le fichier en Windows-1252 et casse tous les accents. */
    const blob = new Blob(['\uFEFF' + errorCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erreurs_${fileName.replace(/\.[^.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: 'Créés', value: inserted, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: <CheckCircle className="w-4 h-4" /> },
    { label: mode === 'completer' ? 'Complétés' : 'Mis à jour', value: updated, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)', icon: <RefreshCw className="w-4 h-4" /> },
    { label: 'Déjà présents, inchangés', value: ignored, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', icon: <Copy className="w-4 h-4" /> },
    { label: 'Ajoutés à l\'onglet', value: lies, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', icon: <Link2 className="w-4 h-4" /> },
    { label: 'Erreurs', value: errors, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="rounded-2xl p-5 sm:p-8 space-y-5 sm:space-y-6" style={{ background: tokens.card.bg, border: tokens.card.border }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={interrompu ? { background: tokens.danger.bg, border: tokens.danger.border } : { background: tokens.success.bg, border: tokens.success.border }}>
          {interrompu ? <AlertTriangle className="w-7 h-7" style={{ color: tokens.danger.text }} /> : <CheckCircle className="w-7 h-7" style={{ color: tokens.success.text }} />}
        </div>
        <div className="text-center">
          <p className="font-bold text-base" style={{ color: tokens.text.primary }}>{interrompu ? 'Import incomplet' : 'Import terminé'}</p>
          <p className="text-xs mt-1" style={{ color: tokens.text.tertiary }}>
            Onglet : <span style={{ color: tokens.text.secondary, fontWeight: 600 }}>{ongletNom}</span> &nbsp;·&nbsp; {LIBELLES_MODE[mode]} &nbsp;·&nbsp; <span style={{ color: tokens.text.secondary }}>{fileName}</span>
          </p>
        </div>
      </div>

      {interrompu && (
        <p className="text-xs px-3 py-2 rounded-xl text-center" role="alert" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}>{interrompu}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.value > 0 ? s.bg : tokens.surface.tertiary, border: `1px solid ${s.value > 0 ? s.border : tokens.surface.borderLight}` }}>
            <p className="text-xl font-bold tabular-nums" style={{ color: s.value > 0 ? s.color : tokens.text.tertiary }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: tokens.text.tertiary }}>{s.label}</p>
          </div>
        ))}
      </div>

      {(conflits > 0 || reaffichees.length > 0) && (
        <div className="space-y-1 text-[11px] px-3 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: tokens.text.secondary }}>
          {conflits > 0 && <p>{conflits} lead{conflits > 1 ? 's' : ''} déjà présent{conflits > 1 ? 's' : ''} avec le même téléphone mais un autre email : {conflits > 1 ? 'ils ont été ajoutés' : 'il a été ajouté'} à l'onglet SANS être modifié{conflits > 1 ? 's' : ''}. Les lignes concernées sont dans le fichier à télécharger.</p>}
          {reaffichees.length > 0 && <p>Colonne{reaffichees.length > 1 ? 's' : ''} réaffichée{reaffichees.length > 1 ? 's' : ''} dans l'onglet : {reaffichees.map(libelleColonne).join(', ')}.</p>}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {errorCsvData && (errors > 0 || conflits > 0) && (
          <button onClick={handleDownloadErrors} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}>
            <Download className="w-3.5 h-3.5" />Télécharger les lignes à vérifier ({errors + conflits} ligne{errors + conflits > 1 ? 's' : ''})
          </button>
        )}
        <button onClick={onGoToCrm} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110" style={{ background: tokens.success.bg, color: tokens.success.text, border: tokens.success.border }}>
          <FolderOpen className="w-3.5 h-3.5" />Voir l'onglet « {ongletNom} »
        </button>
        <button onClick={onNewImport} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: tokens.accent.border }}>
          <Upload className="w-3.5 h-3.5" />Importer un autre fichier
        </button>
      </div>
      <p className="text-[10px] text-center" style={{ color: tokens.text.quaternary }}>
        <Users className="w-3 h-3 inline mr-1" />Tous les leads restent aussi visibles dans l'onglet « Principal » du CRM.
      </p>
    </div>
  );
}
