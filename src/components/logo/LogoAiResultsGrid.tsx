import {
  Image as ImageIcon, Save, X, Download, Upload, Loader2,
} from 'lucide-react';
import type { Engine, NumProposals } from './logoAiConstants';
import { UNIT_COST_PER_IMAGE } from './logoAiConstants';

interface Props {
  generatedUrls: string[];
  transparentBg: boolean;
  savedSet: Set<number>;
  savingIdx: number | null;
  companyId: string | null;
  loading: boolean;
  postProcessing: boolean;
  postProcessStatus: string | null;
  engine: Engine;
  numProposals: NumProposals;
  genCost: number;
  onSave: (url: string, idx: number) => void;
  onClear: () => void;
  onSwitchToUpload?: () => void;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceBorder: string;
}

const CHECKER_BG = `
  linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%),
  linear-gradient(-45deg, rgba(0,0,0,0.06) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.06) 75%),
  linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.06) 75%)
`;

export default function LogoAiResultsGrid({
  generatedUrls, transparentBg, savedSet, savingIdx, companyId,
  loading, postProcessing, postProcessStatus, engine, numProposals, genCost,
  onSave, onClear, onSwitchToUpload,
  textPrimary, textSecondary, textTertiary, textQuaternary,
  surfacePrimary, surfaceSecondary, surfaceBorder,
}: Props) {
  if (loading || postProcessing) {
    return (
      <div className="rounded-xl p-8" style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}>
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: postProcessing
                ? 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(2,132,199,0.1))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))',
              border: postProcessing
                ? '1px solid rgba(14,165,233,0.2)'
                : '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: postProcessing ? '#0ea5e9' : '#d97706' }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              {postProcessing ? 'Suppression du fond en cours...' : 'Generation en cours...'}
            </p>
            <p className="text-xs" style={{ color: textTertiary }}>
              {postProcessing
                ? (postProcessStatus || 'Conversion des logos en transparent...')
                : `Creation de ${numProposals} logo${numProposals > 1 ? 's' : ''} vectoriel${numProposals > 1 ? 's' : ''} avec ${engine === 'v4_1' ? 'Recraft V4.1' : 'Recraft V3'} (${genCost} unites API)`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (generatedUrls.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: textSecondary }}>
            {generatedUrls.length} logo{generatedUrls.length > 1 ? 's' : ''} genere{generatedUrls.length > 1 ? 's' : ''}
            {transparentBg && <span style={{ color: '#0ea5e9' }}> (transparent)</span>}
          </p>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary }}
          >
            <X className="w-3 h-3" />
            Nouvelle generation
          </button>
        </div>
        <div className={`grid gap-3 ${generatedUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {generatedUrls.map((url, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden" style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}>
              <div
                className="flex items-center justify-center p-5"
                style={{
                  background: transparentBg ? CHECKER_BG : surfaceSecondary,
                  backgroundSize: transparentBg ? '16px 16px' : undefined,
                  backgroundPosition: transparentBg ? '0 0, 0 8px, 8px -8px, -8px 0px' : undefined,
                  minHeight: 180,
                }}
              >
                <img
                  src={url}
                  alt={`Logo ${idx + 1}`}
                  className="max-h-[200px] max-w-full object-contain rounded-lg"
                  style={{ boxShadow: transparentBg ? 'none' : '0 4px 24px rgba(0,0,0,0.1)' }}
                />
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${surfaceBorder}` }}>
                <span className="text-[10px] font-semibold" style={{ color: textQuaternary }}>Proposition {idx + 1}</span>
                {savedSet.has(idx) ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(22,163,106,0.08)', color: '#16a34a' }}>
                    <Save className="w-3 h-3" />Sauvegarde
                  </div>
                ) : (
                  <button
                    onClick={() => onSave(url, idx)}
                    disabled={savingIdx !== null || !companyId}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff' }}
                  >
                    {savingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {savingIdx === idx ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {onSwitchToUpload && (
          <button
            onClick={onSwitchToUpload}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary }}
          >
            <Upload className="w-3.5 h-3.5" />
            Uploader mon propre logo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: surfacePrimary, border: `1px solid ${surfaceBorder}` }}>
      <div className="flex flex-col items-center text-center py-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}` }}
        >
          <ImageIcon className="w-6 h-6" style={{ color: textQuaternary }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: textSecondary }}>Aucun logo genere pour le moment</p>
        <p className="text-xs max-w-sm mb-4" style={{ color: textTertiary }}>
          Choisissez un type de logo ci-dessus et cliquez sur "Generer" pour creer votre logo vectoriel avec l'IA.
        </p>
        {onSwitchToUpload && (
          <button
            onClick={onSwitchToUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary }}
          >
            <Upload className="w-3.5 h-3.5" />
            Uploader mon propre logo
          </button>
        )}
      </div>
    </div>
  );
}
