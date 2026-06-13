import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useEditorMode, type ZoneBackground } from '../../contexts/EditorModeContext';
import { SA_SIDEBAR_CATEGORIES } from './EditorBackgroundsModal';

export const DEFAULT_SOLID = '#1a1a2e';
export const DEFAULT_GRAD1 = '#0f3460';
export const DEFAULT_GRAD2 = '#16213e';

interface Params {
  visible: boolean;
  mode: 'solid' | 'gradient';
  setMode: (m: 'solid' | 'gradient') => void;
  solidColor: string;
  setSolidColor: (c: string) => void;
  solidOpacity: number;
  setSolidOpacity: (o: number) => void;
  gradColor1: string;
  setGradColor1: (c: string) => void;
  gradColor2: string;
  setGradColor2: (c: string) => void;
  gradDirection: number;
  setGradDirection: (d: number) => void;
  gradOpacity: number;
  setGradOpacity: (o: number) => void;
  btnTextColor: string;
  setBtnTextColor: (c: string) => void;
  btnBgMode: 'solid' | 'gradient';
  setBtnBgMode: (m: 'solid' | 'gradient') => void;
  btnOpacityMode: 'transparent' | 'opaque';
  setBtnOpacityMode: (m: 'transparent' | 'opaque') => void;
  suppressPreviewRef: MutableRefObject<boolean>;
  selfPreviewRef: MutableRefObject<boolean>;
}

export function useEditorColorModalEffects(p: Params) {
  const ctx = useEditorMode();
  const isTextMode = ctx.editorTab === 'texte';
  const isButtonMode = ctx.editorTab === 'boutons';
  const isCardMode = ctx.editorTab === 'cartes';

  const textTargetKeys = useCallback((): string[] => {
    const target = ctx.textTarget;
    if (!target) return [];
    if (target.kind === 'item') return [`item:${target.itemId}`];
    if (target.kind === 'category') return [`cat:${target.categoryTitle}`];
    if (target.kind === 'all-categories') return SA_SIDEBAR_CATEGORIES.map((c) => `cat:${c.title}`);
    if (target.kind === 'all-items') return SA_SIDEBAR_CATEGORIES.flatMap((c) => c.items.map((i) => `item:${i.id}`));
    return [];
  }, [ctx.textTarget]);

  const restoreFromZoneBg = useCallback((bg: ZoneBackground | null) => {
    if (!bg) {
      p.setMode('solid');
      p.setSolidColor(DEFAULT_SOLID);
      p.setSolidOpacity(100);
      p.setGradColor1(DEFAULT_GRAD1);
      p.setGradColor2(DEFAULT_GRAD2);
      p.setGradDirection(180);
      p.setGradOpacity(100);
      return;
    }
    if (bg.type === 'gradient' && bg.gradient) {
      p.setMode('gradient');
      p.setGradColor1(bg.gradient.color1);
      p.setGradColor2(bg.gradient.color2);
      p.setGradDirection(bg.gradient.direction);
      p.setGradOpacity(Math.round((bg.opacity ?? 1) * 100));
    } else {
      p.setMode('solid');
      p.setSolidColor(bg.color || DEFAULT_SOLID);
      p.setSolidOpacity(Math.round((bg.opacity ?? 1) * 100));
    }
  }, [p]);

  const activeZoneOverride = ctx.activeZone ? ctx.zoneOverrides[ctx.activeZone] : null;

  useEffect(() => {
    if (isTextMode || !p.visible) return;
    p.suppressPreviewRef.current = true;
    restoreFromZoneBg(activeZoneOverride);
  }, [ctx.activeZone, activeZoneOverride]);

  useEffect(() => {
    if (isTextMode || !p.visible || !ctx.preview) return;
    if (p.selfPreviewRef.current) { p.selfPreviewRef.current = false; return; }
    p.suppressPreviewRef.current = true;
    restoreFromZoneBg(ctx.preview.bg);
  }, [ctx.preview]);

  const prevTextKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const newKey = ctx.textTarget
      ? ctx.textTarget.kind === 'category' ? `cat:${ctx.textTarget.categoryTitle}`
        : ctx.textTarget.kind === 'item' ? `item:${ctx.textTarget.itemId}`
          : ctx.textTarget.kind === 'all-categories' ? 'all-cats' : 'all-items'
      : null;
    if (newKey === prevTextKeyRef.current) return;
    prevTextKeyRef.current = newKey;
    if (!isTextMode || !p.visible) return;
    p.suppressPreviewRef.current = true;
    if (ctx.textTarget && ctx.textTarget.kind === 'item') {
      p.setSolidColor(ctx.textOverrides[`item:${ctx.textTarget.itemId}`] || DEFAULT_SOLID);
    } else if (ctx.textTarget && ctx.textTarget.kind === 'category') {
      p.setSolidColor(ctx.textOverrides[`cat:${ctx.textTarget.categoryTitle}`] || DEFAULT_SOLID);
    } else {
      p.setSolidColor(DEFAULT_SOLID);
    }
  }, [ctx.textTarget, isTextMode, p.visible, ctx.textOverrides]);

  useEffect(() => {
    if (isTextMode || !ctx.activeZone || !p.visible) return;
    if (p.suppressPreviewRef.current) { p.suppressPreviewRef.current = false; return; }
    p.selfPreviewRef.current = true;
    if (p.mode === 'solid') {
      ctx.setPreview(ctx.activeZone, { type: 'solid', color: p.solidColor, opacity: p.solidOpacity / 100 });
    } else {
      ctx.setPreview(ctx.activeZone, { type: 'gradient', opacity: p.gradOpacity / 100, gradient: { color1: p.gradColor1, color2: p.gradColor2, direction: p.gradDirection } });
    }
  }, [isTextMode, ctx.activeZone, p.visible, p.mode, p.solidColor, p.solidOpacity, p.gradColor1, p.gradColor2, p.gradDirection, p.gradOpacity]);

  useEffect(() => {
    if (!isTextMode || !p.visible) { ctx.clearTextPreview(); return; }
    if (p.suppressPreviewRef.current) { p.suppressPreviewRef.current = false; return; }
    const keys = textTargetKeys();
    if (keys.length === 0) return;
    ctx.setTextPreview(keys, p.solidColor);
  }, [isTextMode, p.visible, p.solidColor, ctx.textTarget]);

  const prevBtnTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (ctx.activeButtonTarget === prevBtnTargetRef.current) return;
    prevBtnTargetRef.current = ctx.activeButtonTarget;
    if (!isButtonMode || !p.visible || !ctx.activeButtonTarget) return;
    p.suppressPreviewRef.current = true;
    const ovr = ctx.buttonOverrides[ctx.activeButtonTarget];
    if (ovr?.bg) {
      restoreFromZoneBg(ovr.bg);
    } else {
      p.setBtnBgMode('solid');
      p.setSolidColor(DEFAULT_SOLID);
      p.setSolidOpacity(100);
    }
    p.setBtnOpacityMode(ovr?.opacityMode || 'opaque');
    p.setBtnTextColor(ovr?.textColor || DEFAULT_SOLID);
  }, [ctx.activeButtonTarget, isButtonMode, p.visible, ctx.buttonOverrides]);

  const prevSyncSeqRef = useRef(0);
  useEffect(() => {
    if (!ctx.buttonBgSyncSignal) return;
    if (ctx.buttonBgSyncSignal.seq === prevSyncSeqRef.current) return;
    prevSyncSeqRef.current = ctx.buttonBgSyncSignal.seq;
    if (!isButtonMode || !p.visible || !ctx.activeButtonTarget) return;
    p.suppressPreviewRef.current = true;
    const bg = ctx.buttonBgSyncSignal.bg;
    if (bg.type === 'gradient' && bg.gradient) {
      p.setBtnBgMode('gradient');
      p.setGradColor1(bg.gradient.color1);
      p.setGradColor2(bg.gradient.color2);
      p.setGradDirection(bg.gradient.direction);
      p.setGradOpacity(Math.round((bg.opacity ?? 1) * 100));
    } else {
      p.setBtnBgMode('solid');
      p.setSolidColor(bg.color || DEFAULT_SOLID);
      p.setSolidOpacity(Math.round((bg.opacity ?? 1) * 100));
    }
  }, [ctx.buttonBgSyncSignal, isButtonMode, p.visible, ctx.activeButtonTarget]);

  useEffect(() => {
    if (!isButtonMode || !p.visible || !ctx.activeButtonTarget) { ctx.clearButtonPreview(); return; }
    if (p.suppressPreviewRef.current) { p.suppressPreviewRef.current = false; return; }
    if (ctx.buttonSubTarget === 'fond') {
      const bg: ZoneBackground = p.btnBgMode === 'solid'
        ? { type: 'solid', color: p.solidColor, opacity: p.solidOpacity / 100 }
        : { type: 'gradient', opacity: p.gradOpacity / 100, gradient: { color1: p.gradColor1, color2: p.gradColor2, direction: p.gradDirection } };
      ctx.setButtonBgPreview(ctx.activeButtonTarget, bg, p.btnOpacityMode);
    } else {
      ctx.setButtonTextPreview(ctx.activeButtonTarget, p.btnTextColor);
    }
  }, [isButtonMode, p.visible, ctx.activeButtonTarget, ctx.buttonSubTarget, p.btnBgMode, p.solidColor, p.solidOpacity, p.gradColor1, p.gradColor2, p.gradDirection, p.gradOpacity, p.btnTextColor, p.btnOpacityMode]);

  const prevCardTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (ctx.activeCardTarget === prevCardTargetRef.current) return;
    prevCardTargetRef.current = ctx.activeCardTarget;
    if (!isCardMode || !p.visible || !ctx.activeCardTarget) return;
    p.suppressPreviewRef.current = true;
    const ovr = ctx.cardOverrides[ctx.activeCardTarget];
    if (ovr?.bg) {
      restoreFromZoneBg(ovr.bg);
    } else {
      p.setMode('solid');
      p.setSolidColor(DEFAULT_SOLID);
      p.setSolidOpacity(100);
      p.setGradColor1(DEFAULT_GRAD1);
      p.setGradColor2(DEFAULT_GRAD2);
      p.setGradDirection(180);
      p.setGradOpacity(100);
    }
  }, [ctx.activeCardTarget, isCardMode, p.visible, ctx.cardOverrides, restoreFromZoneBg]);

  useEffect(() => {
    if (!isCardMode || !p.visible || !ctx.activeCardTarget) { ctx.clearCardPreview(); return; }
    if (p.suppressPreviewRef.current) { p.suppressPreviewRef.current = false; return; }
    const bg: ZoneBackground = p.mode === 'solid'
      ? { type: 'solid', color: p.solidColor, opacity: p.solidOpacity / 100 }
      : { type: 'gradient', opacity: p.gradOpacity / 100, gradient: { color1: p.gradColor1, color2: p.gradColor2, direction: p.gradDirection } };
    ctx.setCardBgPreview(ctx.activeCardTarget, bg);
  }, [isCardMode, p.visible, ctx.activeCardTarget, p.mode, p.solidColor, p.solidOpacity, p.gradColor1, p.gradColor2, p.gradDirection, p.gradOpacity]);

  useEffect(() => {
    if (!p.visible) { ctx.clearPreview(); ctx.clearTextPreview(); ctx.clearButtonPreview(); ctx.clearCardPreview(); }
  }, [p.visible]);

  return { isTextMode, isButtonMode, isCardMode };
}
