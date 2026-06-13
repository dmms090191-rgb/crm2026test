import { useState, useRef, useCallback } from 'react';
import { Palette, Bookmark } from 'lucide-react';
import { useEditorMode, type ZoneBackground } from '../../contexts/EditorModeContext';
import { getEditorPanelTokens } from './editorPanelTheme';
import DraggablePanel from './DraggablePanel';
import {
  loadSavedSolids,
  loadSavedGradients,
  persistSolids,
  persistGradients,
  type SavedColor,
} from './editorSavedStore';
import SolidColorPanel from './SolidColorPanel';
import GradientColorPanel from './GradientColorPanel';
import { ImageModeNotice, Zone4ImageInfoBanner, TextModeEmptyState, TextModeContent, ModeBtn } from './EditorColorModalParts';
import { ButtonModeBody, CardModeBody } from './EditorColorModalBodies';
import { useEditorColorModalEffects, DEFAULT_SOLID, DEFAULT_GRAD1, DEFAULT_GRAD2 } from './useEditorColorModalEffects';

interface Props {
  visible: boolean;
  onClose: () => void;
  onColorSaved: () => void;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

export default function EditorColorModal({
  visible,
  onClose,
  onColorSaved,
  initialPos,
  onPositionChange,
}: Props) {
  const ctx = useEditorMode();
  const pt = getEditorPanelTokens(ctx.panelTheme, ctx.panelPalettePreview || ctx.customPanelPalette);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<'solid' | 'gradient'>('solid');

  const [solidColor, setSolidColor] = useState(DEFAULT_SOLID);
  const [solidOpacity, setSolidOpacity] = useState(100);

  const [gradColor1, setGradColor1] = useState(DEFAULT_GRAD1);
  const [gradColor2, setGradColor2] = useState(DEFAULT_GRAD2);
  const [gradDirection, setGradDirection] = useState(180);
  const [gradOpacity, setGradOpacity] = useState(100);

  const [saveConfirmed, setSaveConfirmed] = useState(false);

  const [btnTextColor, setBtnTextColor] = useState(DEFAULT_SOLID);
  const [btnBgMode, setBtnBgMode] = useState<'solid' | 'gradient'>('solid');
  const [btnOpacityMode, setBtnOpacityMode] = useState<'transparent' | 'opaque'>('opaque');

  const pickerRef = useRef<HTMLInputElement>(null);
  const gradPicker1Ref = useRef<HTMLInputElement>(null);
  const gradPicker2Ref = useRef<HTMLInputElement>(null);
  const btnTextPickerRef = useRef<HTMLInputElement>(null);

  const suppressPreviewRef = useRef(false);
  const selfPreviewRef = useRef(false);

  const isZone4WithImage = ctx.activeZone === 'zone4' && !!ctx.backgroundImage;

  const { isTextMode, isButtonMode, isCardMode } = useEditorColorModalEffects({
    visible, mode, setMode,
    solidColor, setSolidColor, solidOpacity, setSolidOpacity,
    gradColor1, setGradColor1, gradColor2, setGradColor2,
    gradDirection, setGradDirection, gradOpacity, setGradOpacity,
    btnTextColor, setBtnTextColor, btnBgMode, setBtnBgMode,
    btnOpacityMode, setBtnOpacityMode,
    suppressPreviewRef, selfPreviewRef,
  });
  const isImageMode = ctx.editorTab === 'image';

  const saveColor = useCallback(() => {
    const isBtnTextSub = isButtonMode && ctx.buttonSubTarget === 'texte';
    const isBtnFondGrad = isButtonMode && ctx.buttonSubTarget === 'fond' && btnBgMode === 'gradient';

    if (isBtnTextSub || isTextMode) {
      const color = isBtnTextSub ? btnTextColor : solidColor;
      const entry: SavedColor = { id: crypto.randomUUID(), bg: { type: 'solid', color, opacity: 1 } };
      persistSolids([entry, ...loadSavedSolids()].slice(0, 20));
    } else if (isBtnFondGrad || (!isButtonMode && mode === 'gradient')) {
      const entry: SavedColor = { id: crypto.randomUUID(), bg: { type: 'gradient', opacity: gradOpacity / 100, gradient: { color1: gradColor1, color2: gradColor2, direction: gradDirection } } };
      persistGradients([entry, ...loadSavedGradients()].slice(0, 20));
    } else {
      const entry: SavedColor = { id: crypto.randomUUID(), bg: { type: 'solid', color: solidColor, opacity: isButtonMode ? solidOpacity / 100 : solidOpacity / 100 } };
      persistSolids([entry, ...loadSavedSolids()].slice(0, 20));
    }
    onColorSaved();
    setSaveConfirmed(true);
    setTimeout(() => setSaveConfirmed(false), 1800);
  }, [isTextMode, isButtonMode, ctx.buttonSubTarget, btnBgMode, mode, solidColor, btnTextColor, solidOpacity, gradColor1, gradColor2, gradDirection, gradOpacity, onColorSaved]);

  const invertGradient = useCallback(() => { setGradColor1(gradColor2); setGradColor2(gradColor1); }, [gradColor1, gradColor2]);

  const saveLabel = mode === 'gradient' && !isTextMode ? 'Sauvegarder ce degrade' : 'Sauvegarder cette couleur';

  const hasTextTarget = !!ctx.textTarget;
  const textTargetLabel = ctx.textTarget?.kind === 'all-categories'
    ? 'Toutes les categories'
    : ctx.textTarget?.kind === 'all-items'
      ? 'Tous les onglets'
      : null;

  if (!visible) return null;

  return (
    <DraggablePanel
      title="Couleur"
      icon={<Palette className="w-3.5 h-3.5" style={{ color: pt.accent.solid }} />}
      defaultX={Math.min(window.innerWidth - 300, 240)}
      defaultY={80}
      width={272}
      minimized={minimized}
      onMinimize={() => setMinimized((m) => !m)}
      onClose={onClose}
      initialPos={initialPos}
      onPositionChange={onPositionChange}
    >
      <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 160px)', minHeight: 420 }}>
        {isImageMode ? (
          <ImageModeNotice pt={pt} />
        ) : isButtonMode ? (
          <ButtonModeBody
            pt={pt}
            activeButtonTarget={ctx.activeButtonTarget}
            buttonSubTarget={ctx.buttonSubTarget}
            setButtonSubTarget={ctx.setButtonSubTarget}
            btnBgMode={btnBgMode}
            setBtnBgMode={setBtnBgMode}
            btnOpacityMode={btnOpacityMode}
            setBtnOpacityMode={setBtnOpacityMode}
            btnTextColor={btnTextColor}
            setBtnTextColor={setBtnTextColor}
            btnTextPickerRef={btnTextPickerRef}
            solidColor={solidColor}
            setSolidColor={setSolidColor}
            solidOpacity={solidOpacity}
            setSolidOpacity={setSolidOpacity}
            gradColor1={gradColor1}
            setGradColor1={setGradColor1}
            gradColor2={gradColor2}
            setGradColor2={setGradColor2}
            gradDirection={gradDirection}
            setGradDirection={setGradDirection}
            gradOpacity={gradOpacity}
            invertGradient={invertGradient}
            pickerRef={pickerRef}
            gradPicker1Ref={gradPicker1Ref}
            gradPicker2Ref={gradPicker2Ref}
            saveColor={saveColor}
            saveConfirmed={saveConfirmed}
            onApplyFond={(bg) => { if (ctx.activeButtonTarget) ctx.applyButtonBg(ctx.activeButtonTarget, bg, btnOpacityMode); }}
            onApplyText={() => { if (ctx.activeButtonTarget) ctx.applyButtonTextColor(ctx.activeButtonTarget, btnTextColor); }}
          />
        ) : isCardMode ? (
          <CardModeBody
            pt={pt}
            activeCardTarget={ctx.activeCardTarget}
            mode={mode}
            setMode={setMode}
            solidColor={solidColor}
            setSolidColor={setSolidColor}
            solidOpacity={solidOpacity}
            setSolidOpacity={setSolidOpacity}
            gradColor1={gradColor1}
            setGradColor1={setGradColor1}
            gradColor2={gradColor2}
            setGradColor2={setGradColor2}
            gradDirection={gradDirection}
            setGradDirection={setGradDirection}
            gradOpacity={gradOpacity}
            invertGradient={invertGradient}
            pickerRef={pickerRef}
            gradPicker1Ref={gradPicker1Ref}
            gradPicker2Ref={gradPicker2Ref}
            saveColor={saveColor}
            saveConfirmed={saveConfirmed}
            onApply={(bg) => { if (ctx.activeCardTarget) ctx.applyCardBg(ctx.activeCardTarget, bg); }}
          />
        ) : isTextMode ? (
          <div className="flex-1 flex flex-col">
            {!hasTextTarget ? (
              <TextModeEmptyState pt={pt} />
            ) : (
              <TextModeContent
                targetLabel={textTargetLabel}
                color={solidColor}
                onColorChange={setSolidColor}
                pickerRef={pickerRef}
                pt={pt}
              />
            )}
            <div className="px-3.5 pb-3 pt-2 mt-auto">
              <button
                onClick={saveColor}
                disabled={!hasTextTarget}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                style={{
                  background: saveConfirmed ? pt.success.bg : pt.surface.secondary,
                  color: saveConfirmed ? pt.success.text : pt.text.primary,
                  border: `1px solid ${saveConfirmed ? pt.success.border : pt.surface.border}`,
                }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {saveConfirmed ? 'Sauvegardee !' : 'Sauvegarder cette couleur'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {isZone4WithImage && <Zone4ImageInfoBanner pt={pt} />}
            <div className="px-3 pt-2.5 pb-2 flex gap-1.5">
              <ModeBtn label="Couleur unie" active={mode === 'solid'} onClick={() => setMode('solid')} pt={pt} />
              <ModeBtn label="Degrade" active={mode === 'gradient'} onClick={() => setMode('gradient')} pt={pt} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {mode === 'solid' ? (
                <SolidColorPanel color={solidColor} opacity={solidOpacity} onColorChange={setSolidColor} onOpacityChange={setSolidOpacity} pickerRef={pickerRef} pt={pt} />
              ) : (
                <GradientColorPanel color1={gradColor1} color2={gradColor2} direction={gradDirection} onColor1Change={setGradColor1} onColor2Change={setGradColor2} onDirectionChange={setGradDirection} onInvert={invertGradient} picker1Ref={gradPicker1Ref} picker2Ref={gradPicker2Ref} pt={pt} />
              )}
            </div>
            <div className="px-3.5 pb-3 pt-2">
              <button
                onClick={saveColor}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-1.5"
                style={{
                  background: saveConfirmed ? pt.success.bg : pt.surface.secondary,
                  color: saveConfirmed ? pt.success.text : pt.text.primary,
                  border: `1px solid ${saveConfirmed ? pt.success.border : pt.surface.border}`,
                }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {saveConfirmed ? 'Sauvegardee !' : saveLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </DraggablePanel>
  );
}
