import {
  Save, Download, Loader2, Sparkles, RefreshCw, Wand2,
  Layers, Palette, Star, Maximize2, Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import { PRESETS, type NumProposals, type Preset } from './logoAiConstants';

export interface ResultGroup { preset: Preset; urls: string[]; }

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

const CHECKER = `linear-gradient(45deg,rgba(0,0,0,0.04) 25%,transparent 25%),linear-gradient(-45deg,rgba(0,0,0,0.04) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(0,0,0,0.04) 75%),linear-gradient(-45deg,transparent 75%,rgba(0,0,0,0.04) 75%)`;

function presetLabel(id: Preset) { return PRESETS.find(p => p.id === id)?.label ?? id; }

export default function LogoAiResultsGrid({
  groups, transparentBg, savedSet, savingKey, companyId,
  loading, postProcessing, postProcessStatus,
  totalImages, progressLabel,
  onSave, onSavePack, savingPack, onClear, onFullscreen,
  textPrimary, textSecondary, textTertiary, textQuaternary,
  surfacePrimary, surfaceSecondary, surfaceBorder,
}: Props) {

  if (loading || postProcessing) {
    const blue = postProcessing;
    const accent = blue ? '#0ea5e9' : '#f59e0b';
    const accentDark = blue ? '#0369a1' : '#b45309';
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
              border: `1px solid ${accent}18`,
              boxShadow: `0 8px 32px ${accent}10`,
            }}>
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: accent }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})`, boxShadow: `0 2px 8px ${accent}40` }}>
            <Wand2 className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold mb-0.5" style={{ color: textPrimary }}>
            {blue ? 'Suppression du fond...' : 'Creation en cours...'}
          </p>
          <p className="text-[10px] font-medium max-w-[260px] mx-auto" style={{ color: textQuaternary }}>
            {blue ? (postProcessStatus || 'Conversion transparente...') : progressLabel || `${totalImages} logo${totalImages > 1 ? 's' : ''} vectoriel${totalImages > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: `${accent}10` }}>
          <div className="h-full rounded-full" style={{
            width: '60%',
            background: `linear-gradient(90deg, ${accent}, ${blue ? '#38bdf8' : '#fbbf24'})`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </div>
      </div>
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
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            <p className="text-[12px] font-bold" style={{ color: textSecondary }}>
              {canShowPacks
                ? <>{groups[0].urls.length} pack{groups[0].urls.length > 1 ? 's' : ''} cree{groups[0].urls.length > 1 ? 's' : ''}</>
                : <>{total} logo{total > 1 ? 's' : ''} cree{total > 1 ? 's' : ''}</>}
              {transparentBg && <span style={{ color: '#38bdf8' }}> (transparent)</span>}
            </p>
          </div>
          <button onClick={onClear}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ border: `1px solid ${surfaceBorder}`, color: textTertiary }}>
            <RefreshCw className="w-3 h-3 transition-transform group-hover:rotate-90" />
            Recommencer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {canShowPacks ? (
            Array.from({ length: groups[0].urls.length }, (_, packIdx) => {
              const packKeys = groups.map(g => `${g.preset}-${packIdx}`);
              const allSaved = packKeys.every(k => savedSet.has(k));
              const isSaving = savingPack === packIdx;
              return (
                <div key={packIdx} className="rounded-xl overflow-hidden transition-all"
                  style={{
                    border: allSaved ? '1px solid rgba(16,185,129,0.25)' : `1px solid ${surfaceBorder}`,
                    boxShadow: allSaved ? '0 4px 20px rgba(16,185,129,0.06)' : '0 2px 12px rgba(0,0,0,0.06)',
                  }}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-3.5 py-2"
                    style={{ background: 'rgba(245,158,11,0.03)', borderBottom: `1px solid ${surfaceBorder}` }}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
                      <span className="text-[11px] font-bold" style={{ color: textPrimary }}>
                        Pack {packIdx + 1}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(245,158,11,0.06)', color: '#d97706', border: '1px solid rgba(245,158,11,0.1)' }}>
                        {groups.map(g => presetLabel(g.preset)).join(' + ')}
                      </span>
                    </div>
                    {allSaved ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#10b981' }}>
                        <Save className="w-3 h-3" /> Sauvegarde
                      </span>
                    ) : (
                      <button
                        onClick={() => onSavePack?.(packIdx)}
                        disabled={savingKey !== null || isSaving || !companyId}
                        className="flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 active:scale-95 hover:brightness-110 w-full sm:w-auto justify-center sm:justify-start"
                        style={{
                          background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                          color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.2)',
                        }}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder le pack'}
                      </button>
                    )}
                  </div>
                  <div className={`grid gap-0 ${groups.length === 2 ? 'grid-cols-2' : `grid-cols-${groups.length}`}`}>
                    {groups.map((group) => {
                      const url = group.urls[packIdx];
                      if (!url) return null;
                      return (
                        <div key={group.preset} className="group/card flex flex-col"
                          style={{ borderRight: `1px solid ${surfaceBorder}` }}>
                          <div className="flex items-center justify-center p-3" style={{
                            background: transparentBg ? CHECKER : `linear-gradient(160deg, ${surfaceSecondary}, ${surfacePrimary})`,
                            backgroundSize: transparentBg ? '16px 16px' : undefined,
                            backgroundPosition: transparentBg ? '0 0,0 8px,8px -8px,-8px 0px' : undefined,
                            minHeight: 120,
                          }}>
                            <img src={url} alt={`${presetLabel(group.preset)} ${packIdx + 1}`}
                              className="max-h-[120px] max-w-full object-contain transition-transform group-hover/card:scale-[1.02]" />
                          </div>
                          <div className="px-2.5 py-2 flex items-center justify-between" style={{ borderTop: `1px solid ${surfaceBorder}` }}>
                            <span className="text-[9px] font-bold" style={{ color: textQuaternary }}>
                              {presetLabel(group.preset)}
                            </span>
                            <div className="flex items-center gap-1">
                              <a href={url} download target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[8px] font-bold transition-all hover:brightness-110"
                                style={{ border: `1px solid ${surfaceBorder}`, color: textTertiary }}>
                                <Download className="w-2.5 h-2.5" />
                              </a>
                              {onFullscreen && (
                                <button onClick={() => onFullscreen(url)}
                                  className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[8px] font-bold transition-all hover:brightness-110"
                                  style={{ border: `1px solid ${surfaceBorder}`, color: textTertiary }}>
                                  <Maximize2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            groups.map(group => (
              <div key={group.preset} className="space-y-3">
                {groups.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>{presetLabel(group.preset)}</span>
                    <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${surfaceBorder}, transparent)` }} />
                  </div>
                )}
                <div className={`grid gap-3 ${group.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {group.urls.map((url, idx) => {
                    const saveKey = `${group.preset}-${idx}`;
                    const saved = savedSet.has(saveKey);
                    return (
                      <div key={saveKey} className="group/card rounded-xl overflow-hidden transition-all"
                        style={{
                          background: surfaceSecondary,
                          border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : surfaceBorder}`,
                          boxShadow: saved ? '0 4px 20px rgba(16,185,129,0.06)' : '0 2px 12px rgba(0,0,0,0.06)',
                        }}>
                        <div className="flex items-center justify-center p-4" style={{
                          background: transparentBg ? CHECKER : `linear-gradient(160deg, ${surfaceSecondary}, ${surfacePrimary})`,
                          backgroundSize: transparentBg ? '16px 16px' : undefined,
                          backgroundPosition: transparentBg ? '0 0,0 8px,8px -8px,-8px 0px' : undefined,
                          minHeight: 140,
                        }}>
                          <img src={url} alt={`${presetLabel(group.preset)} ${idx + 1}`}
                            className="max-h-[160px] max-w-full object-contain transition-transform group-hover/card:scale-[1.02]" />
                        </div>
                        <div className="px-3.5 py-2.5 space-y-2" style={{ borderTop: `1px solid ${surfaceBorder}` }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold" style={{ color: textQuaternary }}>
                              {groups.length > 1 ? `${presetLabel(group.preset)} ${idx + 1}` : `Proposition ${idx + 1}`}
                            </span>
                            {saved ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#10b981' }}>
                                <Save className="w-3 h-3" />Sauvegarde
                              </span>
                            ) : (
                              <button onClick={() => onSave(url, saveKey)} disabled={savingKey !== null || !companyId}
                                className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 active:scale-95"
                                style={{
                                  background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                                  color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.2)',
                                }}>
                                {savingKey === saveKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {savingKey === saveKey ? '...' : 'Sauvegarder'}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a href={url} download target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-110"
                              style={{ border: `1px solid ${surfaceBorder}`, color: textTertiary }}>
                              <Download className="w-3 h-3" /> PNG
                            </a>
                            {onFullscreen && (
                              <button onClick={() => onFullscreen(url)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-110"
                                style={{ border: `1px solid ${surfaceBorder}`, color: textTertiary }}>
                                <Maximize2 className="w-3 h-3" /> Plein ecran
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))',
            border: '1px solid rgba(245,158,11,0.1)',
            boxShadow: '0 8px 32px rgba(245,158,11,0.06)',
          }}>
          <Wand2 className="w-7 h-7" style={{ color: '#d97706', opacity: 0.5 }} />
        </div>
        <div className="absolute -top-2 -right-3 w-6 h-6 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))',
            border: '1px solid rgba(245,158,11,0.12)',
          }}>
          <Sparkles className="w-3 h-3" style={{ color: '#f59e0b', opacity: 0.5 }} />
        </div>
        <div className="absolute -bottom-1 -left-3 w-5 h-5 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
            border: '1px solid rgba(245,158,11,0.1)',
          }}>
          <Palette className="w-2.5 h-2.5" style={{ color: '#d97706', opacity: 0.4 }} />
        </div>
      </div>

      <h3 className="text-[14px] font-bold mb-1" style={{ color: textSecondary }}>
        Votre espace de creation
      </h3>
      <p className="text-[10px] max-w-[280px] leading-relaxed font-medium mb-4" style={{ color: textQuaternary }}>
        Configurez a gauche, puis laissez l'IA creer des logos pour votre marque.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {[
          { icon: <Layers className="w-3 h-3" />, text: 'SVG' },
          { icon: <Sparkles className="w-3 h-3" />, text: 'Recraft V4.1' },
          { icon: <ImageIcon className="w-3 h-3" />, text: 'Multi-styles' },
        ].map((pill, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-bold"
            style={{
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.1)',
              color: textQuaternary,
            }}>
            <span style={{ color: '#d97706' }}>{pill.icon}</span>
            {pill.text}
          </span>
        ))}
      </div>
    </div>
  );
}
