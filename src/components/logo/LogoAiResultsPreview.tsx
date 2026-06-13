import { AlertTriangle, Wand2 } from 'lucide-react';
import type { NumProposals } from './logoAiConstants';
import LogoAiResultsGrid from './LogoAiResultsGrid';
import type useLogoAiGenerate from './useLogoAiGenerate';
import { useVCElement } from '../visualCustomize/useVCElement';

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
  const vcApercu = useVCElement<HTMLDivElement>('logo-card-apercu', 'card', 'Carte Apercu du logo cree');
  return (
    <div className="flex-shrink flex flex-col min-h-0 px-4 pt-3 pb-3" style={{ borderBottom: `1px solid ${surfaceBorderLight}` }}>
      <div ref={vcApercu.ref} className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden"
        style={{
          ...(vcApercu.style?.background ? {} : {
            background: `linear-gradient(135deg, ${surfaceSecondary}, ${surfacePrimary}80)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }),
          border: `1px solid ${surfaceBorder}`,
          ...vcApercu.style,
        }}>
        <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
          style={{
            borderBottom: `1px solid ${surfaceBorder}`,
            background: 'linear-gradient(180deg, rgba(245,158,11,0.04), transparent)',
          }}>
          <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
            7
          </span>
          <Wand2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#d97706' }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: textTertiary }}>
            Apercu du logo cree
          </span>
        </div>
        <div className="flex-1 min-h-[160px] overflow-y-auto">
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
  );
}
