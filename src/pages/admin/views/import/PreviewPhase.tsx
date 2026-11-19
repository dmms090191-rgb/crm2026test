import { useState } from 'react';
import { FileText, CheckCircle, Eye, X, Users, Hash, PenLine, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ProcessedRow, ColumnMapping } from '../../../../lib/csvImportPipeline';
import ImportStats from './ImportStats';
import ImportModeSelector, { type ImportMode } from './ImportModeSelector';
import PreviewTable from './PreviewTable';
import PhoneCleanModal from './PhoneCleanModal';
import OngletImportChoix from './OngletImportChoix';
import ColonnesApercu from './ColonnesApercu';
import type { ApercuColonne, ChoixOngletUi } from './useImportLeads';
import type { Onglet } from '../../../../lib/ongletsLeads';
import type { AvertissementCsv } from '../../../../lib/csvLecture';

interface PreviewPhaseProps {
  file: File | null;
  counts: { total: number; valid: number; dup_file: number; dup_crm: number; error: number };
  allColumns: string[];
  mapping: ColumnMapping;
  processedRows: ProcessedRow[];
  onProcessedRowsChange: (rows: ProcessedRow[]) => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  importableCount: number;
  onReset: () => void;
  onImport: () => void;
  colonnes: ApercuColonne[];
  propositionsRefusees: Set<string>;
  onBasculerProposition: (entete: string) => void;
  avertissements: { lignes: AvertissementCsv[]; guillemet: boolean; colonnesAjoutees: number; entetesCoupes: number };
  onglets: Onglet[];
  structureErreur: string;
  choixOnglet: ChoixOngletUi;
  onChoixOnglet: (c: ChoixOngletUi) => void;
  nomNouvelOnglet: string;
  onNomNouvelOnglet: (v: string) => void;
  erreurNomOnglet: string | null;
  choixValide: boolean;
  erreur: string;
}

export default function PreviewPhase({
  file, counts, allColumns, mapping, processedRows, onProcessedRowsChange,
  importMode, onImportModeChange, importableCount, onReset, onImport,
  colonnes, propositionsRefusees, onBasculerProposition, avertissements,
  onglets, structureErreur, choixOnglet, onChoixOnglet, nomNouvelOnglet, onNomNouvelOnglet, erreurNomOnglet, choixValide, erreur,
}: PreviewPhaseProps) {
  const tokens = useThemeTokens();
  const [showPhoneClean, setShowPhoneClean] = useState(false);

  const [phoneColOverride, setPhoneColOverride] = useState<string | null>(null);
  const resolvedPhoneCol = phoneColOverride || mapping.telephone || null;

  const handlePhoneApply = (changes: Map<number, string>, usedCol: string) => {
    setPhoneColOverride(usedCol);
    const updated = processedRows.map(row => {
      const newVal = changes.get(row.index);
      if (newVal === undefined) return row;
      return { ...row, raw: { ...row.raw, [usedCol]: newVal }, telephone: newVal };
    });
    onProcessedRowsChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* File info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Fichier', value: file?.name ?? '', icon: <FileText className="w-4 h-4" />, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)' },
          { label: 'Lignes totales', value: String(counts.total), icon: <Users className="w-4 h-4" />, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
          { label: 'Colonnes', value: String(allColumns.length), icon: <Hash className="w-4 h-4" />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 sm:p-4" style={{ background: tokens.card.bg, border: tokens.card.border }}>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs" style={{ color: tokens.text.tertiary }}>{s.label}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.icon}</div>
            </div>
            <p className="text-sm font-bold truncate" style={{ color: tokens.text.primary }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Les ecarts de structure du fichier : signales, jamais corriges en silence. */}
      {(avertissements.lignes.length > 0 || avertissements.guillemet || avertissements.colonnesAjoutees > 0 || avertissements.entetesCoupes > 0) && (
        <div className="flex items-start gap-2 px-3 sm:px-4 py-3 rounded-xl text-[11px]" role="status" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: tokens.text.secondary }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div className="space-y-0.5">
            {avertissements.lignes.length > 0 && (
              <p>{avertissements.lignes.length} ligne{avertissements.lignes.length > 1 ? 's' : ''} n'{avertissements.lignes.length > 1 ? 'ont' : 'a'} pas le même nombre de cellules que l'en-tête (ex. ligne {avertissements.lignes[0].ligne} : {avertissements.lignes[0].trouve} au lieu de {avertissements.lignes[0].attendu}). Les cellules manquantes sont lues comme vides.</p>
            )}
            {avertissements.colonnesAjoutees > 0 && (
              <p>{avertissements.colonnesAjoutees} colonne{avertissements.colonnesAjoutees > 1 ? 's' : ''} sans en-tête {avertissements.colonnesAjoutees > 1 ? 'ont été ajoutées' : 'a été ajoutée'} (« Colonne N ») pour ne perdre aucune valeur.</p>
            )}
            {avertissements.entetesCoupes > 0 && (
              <p>{avertissements.entetesCoupes} en-tête{avertissements.entetesCoupes > 1 ? 's' : ''} de plus de 190 caractères {avertissements.entetesCoupes > 1 ? 'ont été raccourcis' : 'a été raccourci'} ; les valeurs de ces colonnes sont toutes conservées.</p>
            )}
          </div>
        </div>
      )}

      {/* DECISION DE DAVID (19/11) : un client qui a son espace lit, par l'API, toutes les
          informations de SA fiche. Tant que le chantier securite n'a pas cloisonne ces
          donnees, on le dit avant l'import. */}
      <p className="flex items-start gap-2 px-3 sm:px-4 py-3 rounded-xl text-[11px]" role="note" style={{ background: tokens.surface.tertiary, border: tokens.card.border, color: tokens.text.secondary }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
        <span>Toutes les colonnes de ce fichier seront enregistrées dans la fiche de chaque lead. Un lead qui a un accès client peut voir les informations de sa propre fiche : n'importez pas de notes internes ou de données confidentielles.</span>
      </p>

      <OngletImportChoix
        onglets={onglets} choix={choixOnglet} onChoix={onChoixOnglet}
        nomNouvel={nomNouvelOnglet} onNomNouvel={onNomNouvelOnglet} erreurNom={erreurNomOnglet}
        erreurChargement={structureErreur}
      />

      <ColonnesApercu
        colonnes={colonnes} ongletExistant={choixOnglet?.type === 'existant'}
        propositionsRefusees={propositionsRefusees} onBasculerProposition={onBasculerProposition}
      />

      {/* Stats */}
      <ImportStats total={counts.total} valid={counts.valid} dupFile={counts.dup_file} dupCrm={counts.dup_crm} errors={counts.error} />

      {/* Import mode */}
      <ImportModeSelector value={importMode} onChange={onImportModeChange} dupCrmCount={counts.dup_crm} />

      {/* Preview table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: tokens.card.border }}>
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5" style={{ borderBottom: tokens.table.headerBorder }}>
          <Eye className="w-4 h-4 flex-shrink-0" style={{ color: tokens.accent.text }} />
          <h3 className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Previsualisation</h3>
          <button
            onClick={() => setShowPhoneClean(true)}
            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
            style={{ background: 'rgba(34,211,238,0.1)', color: tokens.accent.text, border: '1px solid rgba(34,211,238,0.25)' }}
          >
            <PenLine className="w-3.5 h-3.5" />
            Corriger les leads
          </button>
        </div>
        <PreviewTable rows={processedRows} allColumns={allColumns} mappedColumns={mapping} />
      </div>

      {showPhoneClean && (
        <PhoneCleanModal
          allColumns={allColumns}
          processedRows={processedRows}
          detectedPhoneCol={resolvedPhoneCol}
          onApply={handlePhoneApply}
          onClose={() => setShowPhoneClean(false)}
        />
      )}

      {erreur && (
        <p className="text-xs px-3 py-2 rounded-xl" role="alert" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}>{erreur}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button onClick={onReset} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ color: tokens.text.tertiary, background: tokens.surface.tertiary, border: tokens.card.border }}>
          <X className="w-3.5 h-3.5" />Annuler
        </button>
        <button onClick={onImport} disabled={importableCount === 0 || !choixValide}
          title={!choixValide ? "Choisissez d'abord l'onglet de colonnes" : undefined}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:brightness-110 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', color: '#050a10', boxShadow: importableCount > 0 && choixValide ? '0 0 20px rgba(34,211,238,0.3)' : 'none' }}
        >
          <CheckCircle className="w-4 h-4" />Valider l'importation ({importableCount} lead{importableCount !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
