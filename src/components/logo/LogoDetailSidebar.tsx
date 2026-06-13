import { useRef } from 'react';
import {
  Shield, Check, Palette, Layers,
  Download, Maximize2, SlidersHorizontal, Loader2,
  RotateCcw, X,
} from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import type { SavedLogo } from './logoAiTypes';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../contexts/editorModeHelpers';
import { PREVIEW_BG_PRESETS } from './logoAiTypes';
import { isCustomUnsaved, downloadLogo, formatLogoDate } from './logoDetailHelpers';

interface Props {
  logo: SavedLogo;
  family: SavedLogo[];
  displayedLogos: SavedLogo[];
  t: ReturnType<typeof useThemeTokens>;
  previewBg: string | null;
  applyBg: (color: string | null) => void;
  customColors: string[];
  saveCurrentColor: () => void;
  removeCustomColor: (color: string) => void;
  onFullscreen: (url: string) => void;
  onSelectAsActive: (id: string) => void;
  selectingActive: boolean;
  showScaleSlider: boolean;
  setShowScaleSlider: (v: boolean) => void;
  sidebarScale: number;
  handleScaleInput: (value: number) => void;
  validateScale: () => void;
  cancelScale: () => void;
}

export default function LogoDetailSidebar({
  logo, family, displayedLogos, t,
  previewBg, applyBg, customColors, saveCurrentColor, removeCustomColor,
  onFullscreen, onSelectAsActive, selectingActive,
  showScaleSlider, setShowScaleSlider, sidebarScale, handleScaleInput, validateScale, cancelScale,
}: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isFamily = family.length > 1;
  const dateStr = formatLogoDate(logo.created_at);
  const displayName = logo.file_name || dateStr;
  const hasBgOverride = previewBg !== null;
  const showSaveBtn = isCustomUnsaved(previewBg, customColors);

  const editorCtx = useEditorModeSafe();
  const btnAll = editorCtx?.getButtonOverridesWithPreview() ?? {};
  const dlOvr = btnAll['btn_download_logo'];
  const dlBg = dlOvr?.bg ? resolveZoneBg(dlOvr.bg) : undefined;
  const dlText = dlOvr?.textColor ?? undefined;
  const dlTransparent = dlOvr?.opacityMode === 'transparent';
  const szOvr = btnAll['btn_resize_logo'];
  const szBg = szOvr?.bg ? resolveZoneBg(szOvr.bg) : undefined;
  const szText = szOvr?.textColor ?? undefined;
  const szTransparent = szOvr?.opacityMode === 'transparent';
  const actOvr = btnAll['btn_select_logo_active'];
  const actBg = actOvr?.bg ? resolveZoneBg(actOvr.bg) : undefined;
  const actText = actOvr?.textColor ?? undefined;
  const actTransparent = actOvr?.opacityMode === 'transparent';

  return (
    <div className="lg:w-[240px] flex-shrink-0 flex flex-col p-3.5 gap-3">
      <div className="flex-shrink-0">
        <h4 className="text-[12px] font-bold leading-tight mb-1" style={{ color: t.text.primary }}>{displayName}</h4>
        <p className="text-[9px] font-medium" style={{ color: t.text.quaternary }}>{dateStr}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {logo.is_active && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(22,163,106,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,106,0.2)' }}>
              <Shield className="w-2.5 h-2.5" /> Actif
            </span>
          )}
          {isFamily && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(245,158,11,0.06)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
              <Layers className="w-2.5 h-2.5" /> {family.length} elements
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] lg:text-[8px] font-bold uppercase tracking-widest" style={{ color: t.text.quaternary }}>Fond apercu</span>
          {hasBgOverride && (
            <button onClick={() => applyBg(null)} className="text-[9px] lg:text-[8px] font-bold transition-colors hover:brightness-110 active:scale-95"
              style={{ color: t.text.quaternary }}>Reset</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-1.5">
          {PREVIEW_BG_PRESETS.map(p => {
            const active = previewBg?.toUpperCase() === p.value.toUpperCase();
            return (
              <button key={p.value} onClick={() => applyBg(p.value)} title={p.label}
                className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 transition-all active:scale-95 hover:scale-110"
                style={{
                  background: p.value,
                  border: active ? '2px solid #f59e0b' : (p.border ?? `1px solid ${t.surface.border}`),
                  boxShadow: active ? '0 0 0 2px rgba(245,158,11,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                }} />
            );
          })}
          {customColors.map(c => {
            const active = previewBg?.toUpperCase() === c.toUpperCase();
            return (
              <div key={c} className="relative group/swatch">
                <button onClick={() => applyBg(c)} title={c}
                  className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 transition-all active:scale-95 hover:scale-110"
                  style={{
                    background: c,
                    border: active ? '2px solid #f59e0b' : `1px solid ${t.surface.border}`,
                    boxShadow: active ? '0 0 0 2px rgba(245,158,11,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }} />
                <button onClick={() => removeCustomColor(c)}
                  className="absolute -top-1 -right-1 w-4 h-4 lg:w-3 lg:h-3 rounded-full items-center justify-center text-white hidden group-hover/swatch:flex"
                  style={{ background: '#ef4444', fontSize: 7, lineHeight: 1 }}>
                  <X className="w-2.5 h-2.5 lg:w-2 lg:h-2" />
                </button>
              </div>
            );
          })}
          <button onClick={() => colorInputRef.current?.click()} title="Couleur personnalisee"
            className="w-8 h-8 lg:w-6 lg:h-6 rounded-lg lg:rounded-md flex-shrink-0 flex items-center justify-center transition-all active:scale-95 hover:scale-110"
            style={{ border: `1px dashed ${t.surface.border}` }}>
            <Palette className="w-3.5 h-3.5 lg:w-3 lg:h-3" style={{ color: t.text.quaternary }} />
          </button>
          <input ref={colorInputRef} type="color" value={previewBg ?? '#FFFFFF'}
            onChange={e => applyBg(e.target.value)}
            className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />
        </div>
        {showSaveBtn && (
          <button onClick={saveCurrentColor}
            className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-bold transition-all hover:brightness-110"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
            <Check className="w-2.5 h-2.5" /> Enregistrer cette couleur
          </button>
        )}
      </div>

      <div className="flex-1 min-h-1" />

      <div className="flex-shrink-0 space-y-2.5">
        <div className="grid grid-cols-2 gap-2 lg:gap-2">
          <button onClick={() => onFullscreen(displayedLogos[0].url)}
            className="flex items-center justify-center gap-1.5 py-2.5 lg:py-2 rounded-xl text-[11px] lg:text-[10px] font-bold transition-all active:scale-95 hover:brightness-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <Maximize2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" /> Plein ecran
          </button>
          <button data-editor-btn-id="btn_resize_logo" onClick={() => setShowScaleSlider(!showScaleSlider)}
            className={`flex items-center justify-center gap-1.5 py-2.5 lg:py-2 rounded-xl text-[11px] lg:text-[10px] font-bold transition-all active:scale-95 hover:brightness-105${editorCtx?.highlightedButtonId === 'btn_resize_logo' ? ' editor-target-highlight' : ''}`}
            style={showScaleSlider ? {
              background: szBg || 'rgba(245,158,11,0.08)', border: `1px solid ${szBg ? 'transparent' : 'rgba(245,158,11,0.20)'}`, color: szText || '#d97706', boxShadow: '0 2px 8px rgba(245,158,11,0.06)', ...(szTransparent && szBg ? { opacity: 0.55 } : {}),
            } : {
              background: szBg || 'rgba(245,158,11,0.04)', border: `1px solid ${szBg ? 'transparent' : 'rgba(245,158,11,0.12)'}`, color: szText || '#d97706', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', ...(szTransparent && szBg ? { opacity: 0.55 } : {}),
            }}>
            <SlidersHorizontal className="w-3.5 h-3.5 lg:w-3 lg:h-3" /> Taille
          </button>
        </div>
        {showScaleSlider && (
          <div className="rounded-lg p-2.5 space-y-2"
            style={{ background: t.surface.primary, border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} />
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: t.text.quaternary }}>Taille sidebar</span>
              <span className="ml-auto text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>
                {Math.round(sidebarScale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>30%</span>
              <input type="range" min={0.3} max={4} step={0.05} value={sidebarScale}
                onChange={e => handleScaleInput(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((sidebarScale - 0.3) / 3.7) * 100}%, ${t.surface.border} ${((sidebarScale - 0.3) / 3.7) * 100}%, ${t.surface.border} 100%)`,
                  accentColor: '#f59e0b',
                }} />
              <span className="text-[8px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>400%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={validateScale}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,106,0.2)' }}>
                <Check className="w-3 h-3" /> Valider
              </button>
              {sidebarScale !== 1 && (
                <button onClick={() => handleScaleInput(1)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-bold transition-all"
                  style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              )}
              <button onClick={cancelScale}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-bold transition-all"
                style={{ border: `1px solid ${t.surface.border}`, color: t.text.quaternary }}>
                <X className="w-2.5 h-2.5" /> Annuler
              </button>
            </div>
          </div>
        )}
        <button data-editor-btn-id="btn_download_logo" onClick={() => displayedLogos.forEach(l => downloadLogo(l))}
          className={`group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl text-[13px] lg:text-[11px] font-bold transition-all active:scale-[0.98]${editorCtx?.highlightedButtonId === 'btn_download_logo' ? ' editor-target-highlight' : ''}`}
          style={{ background: dlBg || 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #0369a1 100%)', color: dlText || '#fff', boxShadow: '0 4px 16px rgba(14,165,233,0.22), inset 0 1px 0 rgba(255,255,255,0.12)', ...(dlTransparent && dlBg ? { opacity: 0.55 } : {}) }}>
          {!dlBg && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9, #0284c7)' }} />}
          <span className="relative flex items-center gap-2">
            <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Telecharger{displayedLogos.length > 1 ? ` (${displayedLogos.length})` : ''}
          </span>
        </button>
        {!logo.is_active && (
          <button data-editor-btn-id="btn_select_logo_active" onClick={() => onSelectAsActive(logo.id)}
            disabled={selectingActive}
            className={`group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl text-[13px] lg:text-[11px] font-bold transition-all disabled:opacity-50 active:scale-[0.98]${editorCtx?.highlightedButtonId === 'btn_select_logo_active' ? ' editor-target-highlight' : ''}`}
            style={{
              background: actBg || 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
              color: actText || '#fff',
              boxShadow: '0 4px 16px rgba(22,163,106,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
              ...(actTransparent && actBg ? { opacity: 0.55 } : {}),
            }}>
            {!actBg && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a, #15803d)' }} />}
            <span className="relative flex items-center gap-2">
              {selectingActive ? <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 animate-spin" /> : <Shield className="w-4 h-4 lg:w-3.5 lg:h-3.5" />}
              {selectingActive ? 'Selection...' : 'Selectionner comme actif'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
