import { RefreshCw, Star } from 'lucide-react';
import { PRESETS, type NumProposals, type Preset } from './logoAiConstants';
import { ResultsLoadingState, ResultsEmptyState } from './LogoAiResultsGridStates';
import { PackCard, SingleCard } from './LogoAiResultsGridCards';

export interface ResultGroup { preset: Preset; urls: string[]; }

function presetLabel(id: Preset) { return PRESETS.find(p => p.id === id)?.label ?? id; }

interface Props {
  groups: ResultGroup[]; transparentBg: boolean; savedSet: Set<string>;
  savingKey: string | null; companyId: string | null;
  loading: boolean; postProcessing: boolean; postProcessStatus: string | null;
  numProposals: NumProposals; totalImages: number; genCost: number;
  progressLabel: string | null;
  onSave: (url: string, key: string) => void;
  onSavePack?: (packIndex: number) => void;
  savingPack?: number | null;
  onClear: () => void;
  onFullscreen?: (url: string) => void;
  textPrimary: string; textSecondary: string; textTertiary: string; textQuaternary: string;
  surfacePrimary: string; surfaceSecondary: string; surfaceBorder: string;
}

export default function LogoAiResultsGrid({
  groups, transparentBg, savedSet, savingKey, companyId,
  loading, postProcessing, postProcessStatus,
  totalImages, progressLabel,
  onSave, onSavePack, savingPack, onClear, onFullscreen,
  textPrimary, textSecondary, textTertiary, textQuaternary,
  surfacePrimary, surfaceSecondary, surfaceBorder,
}: Props) {

  if (loading || postProcessing) {
    return (
      <ResultsLoadingState
        postProcessing={postProcessing} postProcessStatus={postProcessStatus}
        totalImages={totalImages} progressLabel={progressLabel}
        textPrimary={textPrimary} textQuaternary={textQuaternary}
      />
    );
  }

  const allUrls = groups.flatMap(g => g.urls);

  if (allUrls.length > 0) {
    const total = allUrls.length;
    const isMultiPreset = groups.length > 1;
    const canShowPacks = isMultiPreset && groups.every(g => g.urls.length === groups[0].urls.length) && groups[0].urls.length > 0;

    return (
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.12)' }}>
              <Star className="w-3 h-3" style={{ color: '#d97706' }} />
            </div>
            <p className="text-[12px] font-bold" style={{ color: textSecondary }}>
              {canShowPacks
                ? <>{groups[0].urls.length} pack{groups[0].urls.length > 1 ? 's' : ''} cree{groups[0].urls.length > 1 ? 's' : ''}</>
                : <>{total} logo{total > 1 ? 's' : ''} cree{total > 1 ? 's' : ''}</>}
              {transparentBg && <span className="ml-1" style={{ color: '#0ea5e9' }}>(transparent)</span>}
            </p>
          </div>
          <button onClick={onClear}
            className="group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-bold transition-all hover:brightness-105 active:scale-95"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <RefreshCw className="w-3 h-3 transition-transform group-hover:rotate-90" />
            Recommencer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {canShowPacks ? (
            Array.from({ length: groups[0].urls.length }, (_, packIdx) => (
              <PackCard key={packIdx}
                packIdx={packIdx} groups={groups} savedSet={savedSet}
                savingKey={savingKey} savingPack={savingPack} companyId={companyId}
                transparentBg={transparentBg} onSavePack={onSavePack} onFullscreen={onFullscreen}
                surfacePrimary={surfacePrimary} surfaceSecondary={surfaceSecondary} surfaceBorder={surfaceBorder}
                textPrimary={textPrimary} textTertiary={textTertiary} textQuaternary={textQuaternary}
              />
            ))
          ) : (
            groups.map(group => (
              <div key={group.preset} className="space-y-3">
                {groups.length > 1 && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.06)', color: '#b45309', border: '1px solid rgba(245,158,11,0.1)' }}>{presetLabel(group.preset)}</span>
                    <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${surfaceBorder}, transparent)` }} />
                  </div>
                )}
                <div className={`grid gap-3 ${group.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {group.urls.map((url, idx) => {
                    const saveKey = `${group.preset}-${idx}`;
                    return (
                      <SingleCard key={saveKey}
                        url={url} saveKey={saveKey}
                        label={groups.length > 1 ? `${presetLabel(group.preset)} ${idx + 1}` : `Proposition ${idx + 1}`}
                        saved={savedSet.has(saveKey)} savingKey={savingKey} companyId={companyId}
                        transparentBg={transparentBg} onSave={onSave} onFullscreen={onFullscreen}
                        surfacePrimary={surfacePrimary} surfaceSecondary={surfaceSecondary} surfaceBorder={surfaceBorder}
                        textTertiary={textTertiary} textQuaternary={textQuaternary}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return <ResultsEmptyState textSecondary={textSecondary} textQuaternary={textQuaternary} />;
}
