import { useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { MAX_FILE_SIZE_MB, MAX_ROWS } from '../../../../lib/csvImportPipeline';

interface UploadZoneProps {
  dragOver: boolean;
  parseError: string;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFile: (f: File) => void;
}

export default function UploadZone({ dragOver, parseError, onDragOver, onDragLeave, onDrop, onFile }: UploadZoneProps) {
  const tokens = useThemeTokens();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
        onClick={() => fileRef.current?.click()}
        className="rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all"
        style={{ background: dragOver ? tokens.accent.bg : tokens.card.bg, border: dragOver ? tokens.accent.border : `1px dashed ${tokens.surface.borderLight}` }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all" style={{ background: dragOver ? tokens.accent.bgHover : tokens.surface.tertiary, border: dragOver ? tokens.accent.border : tokens.surface.border }}>
          <Upload className="w-7 h-7" style={{ color: dragOver ? tokens.accent.text : tokens.text.tertiary }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Glissez-deposez votre fichier</p>
          <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>ou cliquez pour selectionner depuis votre appareil</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {[`CSV, XLSX`, `Max ${MAX_FILE_SIZE_MB} Mo`, `Max ${MAX_ROWS.toLocaleString('fr-FR')} lignes`].map(lbl => (
            <span key={lbl} className="px-3 py-1 rounded-lg text-[11px] font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: tokens.card.border }}>{lbl}</span>
          ))}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {parseError && (
        <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl" style={{ background: tokens.danger.bg, border: tokens.danger.border }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: tokens.danger.text }} />
          <p className="text-xs" style={{ color: tokens.danger.text }}>{parseError}</p>
        </div>
      )}
    </div>
  );
}
