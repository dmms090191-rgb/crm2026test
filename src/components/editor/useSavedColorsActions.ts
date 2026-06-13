import { useCallback, useRef, useState } from 'react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { SA_SIDEBAR_CATEGORIES } from './EditorBackgroundsModal';
import {
  loadSavedSolids,
  loadSavedGradients,
  persistSolids,
  persistGradients,
  type SavedColor,
} from './editorSavedStore';

export function textTargetKeysFromCtx(
  textTarget: ReturnType<typeof useEditorMode>['textTarget'],
): string[] {
  if (!textTarget) return [];
  if (textTarget.kind === 'item')
    return [`item:${textTarget.itemId}`];
  if (textTarget.kind === 'category')
    return [`cat:${textTarget.categoryTitle}`];
  if (textTarget.kind === 'all-categories')
    return SA_SIDEBAR_CATEGORIES.map((c) => `cat:${c.title}`);
  if (textTarget.kind === 'all-items')
    return SA_SIDEBAR_CATEGORIES.flatMap((c) =>
      c.items.map((i) => `item:${i.id}`),
    );
  return [];
}

export function useSavedColorsActions(ctx: ReturnType<typeof useEditorMode>) {
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const selectedRef = useRef<SavedColor | null>(null);
  const [, forceRender] = useState(0);
  const [gradientBlockMsg, setGradientBlockMsg] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<'solids' | 'gradients' | null>(null);

  const isTextMode = ctx.editorTab === 'texte';
  const isImageMode = ctx.editorTab === 'image';
  const isButtonMode = ctx.editorTab === 'boutons';
  const isBtnFond = isButtonMode && ctx.buttonSubTarget === 'fond';
  const isBtnTexte = isButtonMode && ctx.buttonSubTarget === 'texte';

  const previewSaved = useCallback(
    (saved: SavedColor) => {
      selectedRef.current = saved;
      setGradientBlockMsg(null);

      if (isButtonMode && ctx.activeButtonTarget) {
        if (isBtnTexte) {
          if (saved.bg.type === 'gradient') {
            setGradientBlockMsg('Le texte du bouton accepte uniquement une couleur unie.');
            return;
          }
          const color = saved.bg.color || '#000';
          ctx.setButtonTextPreview(ctx.activeButtonTarget, color);
        } else {
          ctx.setButtonBgPreview(ctx.activeButtonTarget, saved.bg);
          ctx.syncButtonBgFromSaved(saved.bg);
        }
        return;
      }

      if (isTextMode) {
        const keys = textTargetKeysFromCtx(ctx.textTarget);
        if (keys.length === 0) return;
        const color =
          saved.bg.type === 'solid'
            ? saved.bg.color || '#000'
            : saved.bg.gradient?.color1 || '#000';
        ctx.setTextPreview(keys, color);
      } else {
        if (!ctx.activeZone) return;
        ctx.setPreview(ctx.activeZone, saved.bg);
      }
    },
    [
      ctx.activeZone,
      ctx.activeButtonTarget,
      ctx.editorTab,
      ctx.textTarget,
      ctx.buttonSubTarget,
      ctx.setPreview,
      ctx.setTextPreview,
      ctx.setButtonBgPreview,
      ctx.setButtonTextPreview,
      ctx.syncButtonBgFromSaved,
      isTextMode,
      isButtonMode,
      isBtnTexte,
    ],
  );

  const applySelected = useCallback(() => {
    const saved = selectedRef.current;
    if (!saved) return;

    if (isButtonMode && ctx.activeButtonTarget) {
      if (isBtnTexte) {
        if (saved.bg.type === 'gradient') return;
        const color = saved.bg.color || '#000';
        ctx.applyButtonTextColor(ctx.activeButtonTarget, color);
        setConfirmed('Texte du bouton applique');
      } else {
        ctx.applyButtonBg(ctx.activeButtonTarget, saved.bg);
        setConfirmed('Fond du bouton applique');
      }
      setTimeout(() => setConfirmed(null), 1800);
      return;
    }

    if (isTextMode) {
      const keys = textTargetKeysFromCtx(ctx.textTarget);
      if (keys.length === 0) return;
      const color =
        saved.bg.type === 'solid'
          ? saved.bg.color || '#000'
          : saved.bg.gradient?.color1 || '#000';
      keys.forEach((key) => ctx.applyTextColor(key, color));
      const target = ctx.textTarget;
      const label = target
        ? target.kind === 'category' ? target.categoryTitle
          : target.kind === 'item' ? target.itemId
            : target.kind === 'all-categories' ? 'Toutes categories' : 'Tous onglets'
        : '';
      setConfirmed(`Texte ${label} applique`);
    } else {
      if (!ctx.activeZone) return;
      ctx.applyZoneBackground(ctx.activeZone, saved.bg);
      setConfirmed(`Zone ${ctx.activeZone.replace('zone', '')} appliquee`);
    }
    setTimeout(() => setConfirmed(null), 1800);
  }, [ctx.activeZone, ctx.activeButtonTarget, ctx.textTarget, ctx.applyZoneBackground, ctx.applyTextColor, ctx.applyButtonBg, ctx.applyButtonTextColor, isTextMode, isButtonMode, isBtnTexte]);

  const removeSolid = useCallback((id: string) => {
    const next = loadSavedSolids().filter((s) => s.id !== id);
    persistSolids(next);
    if (selectedRef.current?.id === id) selectedRef.current = null;
    forceRender(n => n + 1);
  }, []);

  const removeGradient = useCallback((id: string) => {
    const next = loadSavedGradients().filter((s) => s.id !== id);
    persistGradients(next);
    if (selectedRef.current?.id === id) selectedRef.current = null;
    forceRender(n => n + 1);
  }, []);

  const resetSolids = useCallback(() => {
    persistSolids([]);
    selectedRef.current = null;
    setResetConfirm(null);
    forceRender(n => n + 1);
  }, []);

  const resetGradients = useCallback(() => {
    persistGradients([]);
    selectedRef.current = null;
    setResetConfirm(null);
    forceRender(n => n + 1);
  }, []);

  const canApply = isImageMode
    ? false
    : isButtonMode
      ? !!ctx.activeButtonTarget
      : isTextMode
        ? textTargetKeysFromCtx(ctx.textTarget).length > 0
        : !!ctx.activeZone;

  return {
    confirmed,
    gradientBlockMsg,
    resetConfirm,
    setResetConfirm,
    previewSaved,
    applySelected,
    removeSolid,
    removeGradient,
    resetSolids,
    resetGradients,
    canApply,
    isTextMode,
    isImageMode,
    isButtonMode,
    isBtnFond,
    isBtnTexte,
  };
}
