import { Upload, ArrowUpDown, Check, Loader2, Maximize2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  logoCount: number;
  hasActive: boolean;
  uploading: boolean;
  companyId: string | null;
  reordering: boolean;
  showScale: boolean;
  onUploadClick: () => void;
  onToggleReorder: () => void;
  onToggleScale: () => void;
}

export default function LogoListToolbar({
  logoCount, hasActive, uploading, companyId,
  reordering, showScale,
  onUploadClick, onToggleReorder, onToggleScale,
}: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <button
        onClick={onUploadClick}
        disabled={uploading || !companyId}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          color: '#fff',
          boxShadow: '0 2px 10px rgba(14,165,233,0.2)',
        }}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Ajouter un logo
      </button>

      {logoCount > 1 && (
        reordering ? (
          <button
            onClick={onToggleReorder}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(22,163,106,0.2)',
            }}
          >
            <Check className="w-4 h-4" />
            Terminer
          </button>
        ) : (
          <button
            onClick={onToggleReorder}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: t.surface.secondary,
              border: `1px solid ${t.surface.border}`,
              color: t.text.tertiary,
            }}
          >
            <ArrowUpDown className="w-4 h-4" />
            Reorganiser
          </button>
        )
      )}

      {hasActive && (
        <button
          onClick={onToggleScale}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: showScale ? 'rgba(14,165,233,0.06)' : t.surface.secondary,
            border: `1px solid ${showScale ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
            color: showScale ? '#0284c7' : t.text.tertiary,
          }}
        >
          <Maximize2 className="w-4 h-4" />
          Taille
        </button>
      )}

      {logoCount > 0 && (
        <span className="ml-auto text-[11px] font-medium" style={{ color: t.text.quaternary }}>
          {logoCount} logo{logoCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
