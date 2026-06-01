import { Star, AlertTriangle } from 'lucide-react';
import type { NumProposals } from './logoAiConstants';
import LogoAiResultsGrid from './LogoAiResultsGrid';
import type useLogoAiGenerate from './useLogoAiGenerate';

interface Props {
  gen: ReturnType<typeof useLogoAiGenerate>;
  transparentBg: boolean;
  numProposals: NumProposals;
  companyId: string | null;
  onFullscreen: (url: string) => void;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceBorder: string;
  surfaceBorderLight: string;
}

export default function LogoAiResultsPreview({
  gen, transparentBg, numProposals, companyId, onFullscreen,
  textPrimary, textSecondary, textTertiary, textQuaternary,
  surfacePrimary, surfaceSecondary, surfaceBorder, surfaceBorderLight,
}: Props) {
  return (
    <div className="flex-shrink flex flex-col min-h-0" style={{ borderBottom: `1px solid ${surfaceBorderLight}` }}>
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2 flex-shrink-0">
        <div className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.10)' }}>
          <Star className="w-2.5 h-2.5" style={{ color: '#d97706' }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textTertiary }}>Apercu du logo cree</span>
      </div>
      <div className="px-4 pb-3 flex-1 min-h-0 overflow-y-auto">
        <div className="rounded-xl overflow-hidden" style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="min-h-[160px]">
            <LogoAiResultsGrid
              groups={gen.resultGroups} transparentBg={transparentBg}
              savedSet={gen.savedSet} savingKey={gen.savingKey} companyId={companyId}
              loading={gen.loading} postProcessing={gen.postProcessing} postProcessStatus={gen.postProcessStatus}
              numProposals={numProposals} totalImages={gen.totalImages} genCost={gen.genCost}
              progressLabel={gen.progressLabel}
              onSave={gen.handleSave} onSavePack={gen.handleSavePack} savingPack={gen.savingPack}
              onClear={gen.clearResults}
              onFullscreen={onFullscreen}
              textPrimary={textPrimary} textSecondary={textSecondary}
              textTertiary={textTertiary} textQuaternary={textQuaternary}
              surfacePrimary={surfacePrimary} surfaceSecondary={surfaceSecondary} surfaceBorder={surfaceBorder}
            />
          </div>
        </div>
        {gen.error && (
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {gen.error}
          </div>
        )}
      </div>
    </div>
  );
}
