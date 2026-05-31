import {
  Save, Download, Loader2, Layers, Maximize2,
} from 'lucide-react';
import { PRESETS, type Preset } from './logoAiConstants';

const CHECKER = `linear-gradient(45deg,rgba(0,0,0,0.04) 25%,transparent 25%),linear-gradient(-45deg,rgba(0,0,0,0.04) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(0,0,0,0.04) 75%),linear-gradient(-45deg,transparent 75%,rgba(0,0,0,0.04) 75%)`;

function presetLabel(id: Preset) { return PRESETS.find(p => p.id === id)?.label ?? id; }

interface PackCardProps {
  packIdx: number;
  groups: { preset: Preset; urls: string[] }[];
  savedSet: Set<string>;
  savingKey: string | null;
  savingPack?: number | null;
  companyId: string | null;
  transparentBg: boolean;
  onSavePack?: (packIndex: number) => void;
  onFullscreen?: (url: string) => void;
  surfacePrimary: string; surfaceSecondary: string; surfaceBorder: string;
  textPrimary: string; textTertiary: string; textQuaternary: string;
}

export function PackCard({
  packIdx, groups, savedSet, savingKey, savingPack, companyId,
  transparentBg, onSavePack, onFullscreen,
  surfacePrimary, surfaceSecondary, surfaceBorder,
  textPrimary, textTertiary, textQuaternary,
}: PackCardProps) {
  const packKeys = groups.map(g => `${g.preset}-${packIdx}`);
  const allSaved = packKeys.every(k => savedSet.has(k));
  const isSaving = savingPack === packIdx;
  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        border: allSaved ? '1.5px solid rgba(16,185,129,0.25)' : `1px solid ${surfaceBorder}`,
        boxShadow: allSaved ? '0 4px 24px rgba(16,185,129,0.06)' : '0 2px 16px rgba(0,0,0,0.04)',
      }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-4 py-2.5"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.02), rgba(217,119,6,0.04))', borderBottom: `1px solid ${surfaceBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 2px 8px rgba(245,158,11,0.2)' }}>
            <Layers className="w-3 h-3 text-white" />
          </div>
          <span className="text-[12px] font-bold" style={{ color: textPrimary }}>
            Pack {packIdx + 1}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(245,158,11,0.06)', color: '#b45309', border: '1px solid rgba(245,158,11,0.1)' }}>
            {groups.map(g => presetLabel(g.preset)).join(' + ')}
          </span>
        </div>
        {allSaved ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#10b981' }}>
            <Save className="w-3.5 h-3.5" /> Sauvegarde
          </span>
        ) : (
          <button
            onClick={() => onSavePack?.(packIdx)}
            disabled={savingKey !== null || isSaving || !companyId}
            className="flex items-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 active:scale-95 hover:brightness-110 w-full sm:w-auto justify-center sm:justify-start"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
              color: '#fff',
              boxShadow: '0 3px 12px rgba(14,165,233,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
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
              <div className="flex items-center justify-center p-4" style={{
                background: transparentBg ? CHECKER : `linear-gradient(160deg, ${surfaceSecondary}, ${surfacePrimary})`,
                backgroundSize: transparentBg ? '16px 16px' : undefined,
                backgroundPosition: transparentBg ? '0 0,0 8px,8px -8px,-8px 0px' : undefined,
                minHeight: 130,
              }}>
                <img src={url} alt={`${presetLabel(group.preset)} ${packIdx + 1}`}
                  className="max-h-[130px] max-w-full object-contain transition-transform group-hover/card:scale-[1.03]" />
              </div>
              <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: `1px solid ${surfaceBorder}`, background: `${surfaceSecondary}60` }}>
                <span className="text-[10px] font-bold" style={{ color: textQuaternary }}>
                  {presetLabel(group.preset)}
                </span>
                <div className="flex items-center gap-1.5">
                  <a href={url} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all hover:brightness-110"
                    style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <Download className="w-2.5 h-2.5" />
                  </a>
                  {onFullscreen && (
                    <button onClick={() => onFullscreen(url)}
                      className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all hover:brightness-110"
                      style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
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
}

interface SingleCardProps {
  url: string;
  saveKey: string;
  label: string;
  saved: boolean;
  savingKey: string | null;
  companyId: string | null;
  transparentBg: boolean;
  onSave: (url: string, key: string) => void;
  onFullscreen?: (url: string) => void;
  surfacePrimary: string; surfaceSecondary: string; surfaceBorder: string;
  textTertiary: string; textQuaternary: string;
}

export function SingleCard({
  url, saveKey, label, saved, savingKey, companyId,
  transparentBg, onSave, onFullscreen,
  surfacePrimary, surfaceSecondary, surfaceBorder,
  textTertiary, textQuaternary,
}: SingleCardProps) {
  return (
    <div className="group/card rounded-xl overflow-hidden transition-all"
      style={{
        background: surfaceSecondary,
        border: `1.5px solid ${saved ? 'rgba(16,185,129,0.25)' : surfaceBorder}`,
        boxShadow: saved ? '0 4px 24px rgba(16,185,129,0.06)' : '0 2px 16px rgba(0,0,0,0.04)',
      }}>
      <div className="flex items-center justify-center p-5" style={{
        background: transparentBg ? CHECKER : `linear-gradient(160deg, ${surfaceSecondary}, ${surfacePrimary})`,
        backgroundSize: transparentBg ? '16px 16px' : undefined,
        backgroundPosition: transparentBg ? '0 0,0 8px,8px -8px,-8px 0px' : undefined,
        minHeight: 150,
      }}>
        <img src={url} alt={label}
          className="max-h-[160px] max-w-full object-contain transition-transform group-hover/card:scale-[1.03]" />
      </div>
      <div className="px-4 py-3 space-y-2.5" style={{ borderTop: `1px solid ${surfaceBorder}`, background: `${surfaceSecondary}60` }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: textQuaternary }}>
            {label}
          </span>
          {saved ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#10b981' }}>
              <Save className="w-3.5 h-3.5" />Sauvegarde
            </span>
          ) : (
            <button onClick={() => onSave(url, saveKey)} disabled={savingKey !== null || !companyId}
              className="flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 active:scale-95 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                color: '#fff',
                boxShadow: '0 3px 12px rgba(14,165,233,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}>
              {savingKey === saveKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {savingKey === saveKey ? '...' : 'Sauvegarder'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={url} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-105 active:scale-95"
            style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Download className="w-3 h-3" /> PNG
          </a>
          {onFullscreen && (
            <button onClick={() => onFullscreen(url)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-105 active:scale-95"
              style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textTertiary, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <Maximize2 className="w-3 h-3" /> Plein ecran
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
