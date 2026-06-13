import { Bookmark, SquareStack } from 'lucide-react';
import type { RefObject } from 'react';
import type { ZoneBackground } from '../../contexts/EditorModeContext';
import { CARD_TARGETS } from '../../contexts/editorModeTypes';
import { BUTTON_TARGETS } from './EditorBoutonsContent';
import SolidColorPanel from './SolidColorPanel';
import GradientColorPanel from './GradientColorPanel';
import {
  ButtonSubTabs, ButtonTargetBanner, ButtonApplyButton, ButtonTextColorPicker,
  ModeBtn, ButtonOpacityToggle, ButtonModeEmptyState,
} from './EditorColorModalParts';

type Pt = ReturnType<typeof import('./editorPanelTheme').getEditorPanelTokens>;

export function CardModeEmptyState({ pt }: { pt: Pt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <SquareStack className="w-5 h-5" style={{ color: pt.label.muted }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold" style={{ color: pt.text.secondary }}>
          Aucune carte selectionnee
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: pt.label.muted }}>
          Selectionne une carte dans le panneau Contenu pour modifier son fond.
        </p>
      </div>
    </div>
  );
}

interface CommonRefs {
  pickerRef: RefObject<HTMLInputElement>;
  gradPicker1Ref: RefObject<HTMLInputElement>;
  gradPicker2Ref: RefObject<HTMLInputElement>;
}

interface ColorState {
  solidColor: string; setSolidColor: (c: string) => void;
  solidOpacity: number; setSolidOpacity: (o: number) => void;
  gradColor1: string; setGradColor1: (c: string) => void;
  gradColor2: string; setGradColor2: (c: string) => void;
  gradDirection: number; setGradDirection: (d: number) => void;
  invertGradient: () => void;
}

interface ButtonBodyProps extends CommonRefs, ColorState {
  pt: Pt;
  activeButtonTarget: string | null;
  buttonSubTarget: 'fond' | 'texte';
  setButtonSubTarget: (sub: 'fond' | 'texte') => void;
  btnBgMode: 'solid' | 'gradient';
  setBtnBgMode: (m: 'solid' | 'gradient') => void;
  btnOpacityMode: 'transparent' | 'opaque';
  setBtnOpacityMode: (m: 'transparent' | 'opaque') => void;
  btnTextColor: string;
  setBtnTextColor: (c: string) => void;
  btnTextPickerRef: RefObject<HTMLInputElement>;
  gradOpacity: number;
  saveColor: () => void;
  saveConfirmed: boolean;
  onApplyFond: (bg: ZoneBackground) => void;
  onApplyText: () => void;
}

export function ButtonModeBody(props: ButtonBodyProps) {
  const {
    pt, activeButtonTarget, buttonSubTarget, setButtonSubTarget,
    btnBgMode, setBtnBgMode, btnOpacityMode, setBtnOpacityMode,
    btnTextColor, setBtnTextColor, btnTextPickerRef,
    solidColor, setSolidColor, solidOpacity, setSolidOpacity,
    gradColor1, setGradColor1, gradColor2, setGradColor2,
    gradDirection, setGradDirection, gradOpacity, invertGradient,
    pickerRef, gradPicker1Ref, gradPicker2Ref,
    saveColor, saveConfirmed, onApplyFond, onApplyText,
  } = props;

  if (!activeButtonTarget) return <ButtonModeEmptyState pt={pt} />;
  const targetLabel = `Bouton ${BUTTON_TARGETS.find(b => b.id === activeButtonTarget)?.label ?? ''}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ButtonTargetBanner targetLabel={targetLabel} pt={pt} />
      <ButtonSubTabs subTarget={buttonSubTarget} onSubTargetChange={setButtonSubTarget} pt={pt} />
      <div className="flex-1 overflow-y-auto">
        {buttonSubTarget === 'fond' ? (
          <>
            <div className="px-3 pt-1.5 pb-2 flex gap-1.5">
              <ModeBtn label="Couleur unie" active={btnBgMode === 'solid'} onClick={() => setBtnBgMode('solid')} pt={pt} />
              <ModeBtn label="Degrade" active={btnBgMode === 'gradient'} onClick={() => setBtnBgMode('gradient')} pt={pt} />
            </div>
            {btnBgMode === 'solid' ? (
              <SolidColorPanel color={solidColor} opacity={solidOpacity} onColorChange={setSolidColor} onOpacityChange={setSolidOpacity} pickerRef={pickerRef} pt={pt} />
            ) : (
              <GradientColorPanel color1={gradColor1} color2={gradColor2} direction={gradDirection} onColor1Change={setGradColor1} onColor2Change={setGradColor2} onDirectionChange={setGradDirection} onInvert={invertGradient} picker1Ref={gradPicker1Ref} picker2Ref={gradPicker2Ref} pt={pt} />
            )}
            <ButtonOpacityToggle value={btnOpacityMode} onChange={setBtnOpacityMode} pt={pt} />
          </>
        ) : (
          <ButtonTextColorPicker color={btnTextColor} onColorChange={setBtnTextColor} pickerRef={btnTextPickerRef} pt={pt} />
        )}
      </div>
      <div className="px-3.5 pb-2 pt-2 flex flex-col gap-2">
        <ButtonApplyButton
          label={buttonSubTarget === 'fond' ? 'Appliquer au fond du bouton' : 'Appliquer au texte du bouton'}
          onApply={() => {
            if (buttonSubTarget === 'fond') {
              const bg: ZoneBackground = btnBgMode === 'solid'
                ? { type: 'solid', color: solidColor, opacity: solidOpacity / 100 }
                : { type: 'gradient', opacity: gradOpacity / 100, gradient: { color1: gradColor1, color2: gradColor2, direction: gradDirection } };
              onApplyFond(bg);
            } else {
              onApplyText();
            }
          }}
          pt={pt}
        />
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
          {saveConfirmed ? 'Sauvegardee !' : (buttonSubTarget === 'fond' && btnBgMode === 'gradient' ? 'Sauvegarder ce degrade' : 'Sauvegarder cette couleur')}
        </button>
      </div>
    </div>
  );
}

interface CardBodyProps extends CommonRefs, ColorState {
  pt: Pt;
  activeCardTarget: string | null;
  mode: 'solid' | 'gradient';
  setMode: (m: 'solid' | 'gradient') => void;
  solidOpacity: number;
  gradOpacity: number;
  saveColor: () => void;
  saveConfirmed: boolean;
  onApply: (bg: ZoneBackground) => void;
}

export function CardModeBody(props: CardBodyProps) {
  const {
    pt, activeCardTarget, mode, setMode,
    solidColor, setSolidColor, solidOpacity, setSolidOpacity,
    gradColor1, setGradColor1, gradColor2, setGradColor2,
    gradDirection, setGradDirection, gradOpacity, invertGradient,
    pickerRef, gradPicker1Ref, gradPicker2Ref,
    saveColor, saveConfirmed, onApply,
  } = props;

  if (!activeCardTarget) return <CardModeEmptyState pt={pt} />;
  const targetLabel = `Carte ${CARD_TARGETS.find(c => c.id === activeCardTarget)?.label.replace(/^Carte /, '') ?? ''}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ButtonTargetBanner targetLabel={targetLabel} pt={pt} />
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
      <div className="px-3.5 pb-2 pt-2 flex flex-col gap-2">
        <ButtonApplyButton
          label="Appliquer a la carte"
          onApply={() => {
            const bg: ZoneBackground = mode === 'solid'
              ? { type: 'solid', color: solidColor, opacity: solidOpacity / 100 }
              : { type: 'gradient', opacity: gradOpacity / 100, gradient: { color1: gradColor1, color2: gradColor2, direction: gradDirection } };
            onApply(bg);
          }}
          pt={pt}
        />
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
          {saveConfirmed ? 'Sauvegardee !' : (mode === 'gradient' ? 'Sauvegarder ce degrade' : 'Sauvegarder cette couleur')}
        </button>
      </div>
    </div>
  );
}
