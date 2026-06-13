import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { getSectionsForTemplate } from './templateSectionsConfig';
import { persistDraft, persistPublish } from './studioSectionPersistence';
import {
  EMPTY_EDITS, DEFAULT_CANVAS_BG,
  type SiteSectionRow, type CanvasBg, type CanvasGradient, type CanvasPageHeight, type CanvasBgMode,
  type LocalEdits, type UseStudioSectionsReturn,
} from './studioSectionTypes';
import {
  normalizeGradient, parseBgMode,
  buildCanvasBgValues, buildGradientValues, buildPageHeightValues, buildBgModeValues,
  createCanvasBgSetters, createGradientSetters, createPageHeightSetters, createBgModeSetters,
} from './studioSectionHelpers';
import { normalizeOverlayElements, type OverlayElement } from './overlayElementTypes';
import {
  deriveSections, deriveVisibleSections, checkHasUnsavedChanges,
  deriveLastSavedAt, deriveLastPublishedAt, getEffectiveValues,
} from './useStudioSectionsHelpers';

export { DEFAULT_CANVAS_BG } from './studioSectionTypes';
export type { SiteSectionRow, StudioSection, UseStudioSectionsReturn, GradientConfig, GradientDirection, BgMode } from './studioSectionTypes';

export default function useStudioSections(
  homePageId: string | null,
  templateKey: string | null,
  pageIsPublished: boolean,
): UseStudioSectionsReturn {
  const [dbSections, setDbSections] = useState<SiteSectionRow[]>([]);
  const [localEdits, setLocalEdits] = useState<LocalEdits>(EMPTY_EDITS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(pageIsPublished);
  const [dbCanvasBg, setDbCanvasBg] = useState<CanvasBg>({ desktop: null, mobile: null });
  const [dbCanvasGradient, setDbCanvasGradient] = useState<CanvasGradient>({ desktop: null, mobile: null });
  const [dbPageHeight, setDbPageHeight] = useState<CanvasPageHeight>({ desktop: null, mobile: null });
  const [dbBgMode, setDbBgMode] = useState<CanvasBgMode>({ desktop: 'default', mobile: 'default' });
  const [dbOverlayElements, setDbOverlayElements] = useState<OverlayElement[]>([]);
  const initRef = useRef(false);

  const templateSections = templateKey ? getSectionsForTemplate(templateKey) : [];

  const loadSections = useCallback(async () => {
    if (!homePageId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data, error }, { data: pageRow }] = await Promise.all([
        supabase
          .from('site_sections')
          .select('*')
          .eq('home_page_id', homePageId)
          .order('position', { ascending: true }),
        supabase
          .from('company_home_pages')
          .select('draft_canvas_bg_desktop, draft_canvas_bg_mobile, draft_canvas_gradient_desktop, draft_canvas_gradient_mobile, draft_page_size_desktop, draft_page_size_mobile, draft_canvas_bg_mode_desktop, draft_canvas_bg_mode_mobile, draft_overlay_elements')
          .eq('id', homePageId)
          .maybeSingle(),
      ]);
      if (error) throw error;
      if (pageRow) {
        setDbCanvasBg({ desktop: pageRow.draft_canvas_bg_desktop ?? null, mobile: pageRow.draft_canvas_bg_mobile ?? null });
        setDbCanvasGradient({ desktop: normalizeGradient(pageRow.draft_canvas_gradient_desktop), mobile: normalizeGradient(pageRow.draft_canvas_gradient_mobile) });
        const dps = pageRow.draft_page_size_desktop as Record<string, unknown> | null;
        const mps = pageRow.draft_page_size_mobile as Record<string, unknown> | null;
        setDbPageHeight({ desktop: typeof dps?.height === 'number' ? dps.height : null, mobile: typeof mps?.height === 'number' ? mps.height : null });
        setDbBgMode({ desktop: parseBgMode(pageRow.draft_canvas_bg_mode_desktop), mobile: parseBgMode(pageRow.draft_canvas_bg_mode_mobile) });
        setDbOverlayElements(normalizeOverlayElements(pageRow.draft_overlay_elements));
      }
      if (data && data.length > 0) {
        setDbSections(data as SiteSectionRow[]);
      } else if (templateKey && !initRef.current) {
        initRef.current = true;
        const defaults = getSectionsForTemplate(templateKey);
        const rows = defaults.map((s, i) => ({
          home_page_id: homePageId, section_key: s.key, position: i, is_visible: true,
          draft_content: s.defaultContent, draft_styles: s.defaultStyles, animation_preset: 'none', animation_config: {},
        }));
        const { data: inserted, error: insertErr } = await supabase.from('site_sections').insert(rows).select('*');
        if (insertErr) throw insertErr;
        setDbSections((inserted ?? []) as SiteSectionRow[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [homePageId, templateKey]);

  useEffect(() => { initRef.current = false; setLocalEdits(EMPTY_EDITS); loadSections(); }, [loadSections]);
  useEffect(() => { setIsPublished(pageIsPublished); }, [pageIsPublished]);

  const sections = deriveSections(dbSections, templateSections);
  const sectionOrder = localEdits.order ?? dbSections.map(r => r.section_key);
  const visibleSections = deriveVisibleSections(dbSections, localEdits);

  const { canvasBgDesktop, canvasBgMobile } = buildCanvasBgValues(localEdits, dbCanvasBg);
  const { setCanvasBgDesktop, setCanvasBgMobile, resetCanvasBg } = createCanvasBgSetters(setLocalEdits);
  const { gradientDesktop, gradientMobile } = buildGradientValues(localEdits, dbCanvasGradient);
  const { setGradientDesktop, setGradientMobile, resetGradient } = createGradientSetters(setLocalEdits);
  const { pageHeightDesktop, pageHeightMobile } = buildPageHeightValues(localEdits, dbPageHeight);
  const { setPageHeightDesktop, setPageHeightMobile } = createPageHeightSetters(setLocalEdits);
  const { bgModeDesktop, bgModeMobile } = buildBgModeValues(localEdits, dbBgMode);
  const { setBgModeDesktop, setBgModeMobile } = createBgModeSetters(setLocalEdits);

  const overlayElements: OverlayElement[] = localEdits.overlayElements ?? dbOverlayElements;
  const setOverlayElements = (elements: OverlayElement[]) => {
    setLocalEdits(prev => ({ ...prev, overlayElements: elements }));
  };
  const addOverlayElement = (element: OverlayElement) => {
    setLocalEdits(prev => ({ ...prev, overlayElements: [...(prev.overlayElements ?? dbOverlayElements), element] }));
  };
  const updateOverlayElement = (id: string, partial: Partial<OverlayElement>) => {
    setLocalEdits(prev => {
      const current = prev.overlayElements ?? dbOverlayElements;
      return { ...prev, overlayElements: current.map(el => el.id === id ? { ...el, ...partial } as OverlayElement : el) };
    });
  };
  const removeOverlayElement = (id: string) => {
    setLocalEdits(prev => {
      const current = prev.overlayElements ?? dbOverlayElements;
      return { ...prev, overlayElements: current.filter(el => el.id !== id) };
    });
  };

  const hasUnsavedChanges = checkHasUnsavedChanges(localEdits);
  const lastSavedAt = deriveLastSavedAt(dbSections);
  const lastPublishedAt = deriveLastPublishedAt(dbSections);

  const getEffectiveContent = (sectionKey: string) => getEffectiveValues(dbSections, localEdits, sectionKey, 'content');
  const getEffectiveStyles = (sectionKey: string) => getEffectiveValues(dbSections, localEdits, sectionKey, 'styles');

  const updateField = (sectionKey: string, fieldKey: string, value: string) => {
    setLocalEdits(prev => ({ ...prev, content: { ...prev.content, [sectionKey]: { ...(prev.content[sectionKey] ?? {}), [fieldKey]: value } } }));
  };
  const updateStyle = (sectionKey: string, styleKey: string, value: string) => {
    setLocalEdits(prev => ({ ...prev, styles: { ...prev.styles, [sectionKey]: { ...(prev.styles[sectionKey] ?? {}), [styleKey]: value } } }));
  };
  const reorder = (newOrder: string[]) => { setLocalEdits(prev => ({ ...prev, order: newOrder })); };

  const resetField = (sectionKey: string, fieldKey: string) => {
    const tpl = templateSections.find(s => s.key === sectionKey);
    updateField(sectionKey, fieldKey, tpl?.defaultContent[fieldKey] ?? '');
  };

  const resetSection = (sectionKey: string) => {
    const tpl = templateSections.find(s => s.key === sectionKey);
    if (!tpl) return;
    const contentEdits: Record<string, string> = {};
    for (const field of tpl.editableFields) contentEdits[field.key] = tpl.defaultContent[field.key] ?? '';
    setLocalEdits(prev => ({ ...prev, content: { ...prev.content, [sectionKey]: contentEdits }, styles: { ...prev.styles, [sectionKey]: { ...tpl.defaultStyles } } }));
  };

  const toggleVisibility = (sectionKey: string) => {
    const currentVisible = visibleSections.has(sectionKey);
    if (currentVisible && visibleSections.size <= 1) return;
    setLocalEdits(prev => ({ ...prev, visibility: { ...prev.visibility, [sectionKey]: !currentVisible } }));
  };

  const saveDraft = async (): Promise<boolean> => {
    if (!homePageId) return false;
    setIsSaving(true);
    try { await persistDraft(homePageId, dbSections, localEdits, sectionOrder); setLocalEdits(EMPTY_EDITS); await loadSections(); return true; }
    catch { return false; } finally { setIsSaving(false); }
  };

  const publish = async (): Promise<boolean> => {
    if (!homePageId) return false;
    setIsPublishing(true);
    try { await persistPublish(homePageId, dbSections, dbCanvasBg, dbCanvasGradient, dbPageHeight, dbBgMode, dbOverlayElements); setIsPublished(true); await loadSections(); return true; }
    catch { return false; } finally { setIsPublishing(false); }
  };

  return {
    sections, sectionOrder, visibleSections, hasUnsavedChanges, isPublished, loading, isSaving, isPublishing,
    lastSavedAt, lastPublishedAt,
    canvasBgDesktop, canvasBgMobile, setCanvasBgDesktop, setCanvasBgMobile, resetCanvasBg,
    gradientDesktop, gradientMobile, setGradientDesktop, setGradientMobile, resetGradient,
    bgModeDesktop, bgModeMobile, setBgModeDesktop, setBgModeMobile,
    pageHeightDesktop, pageHeightMobile, setPageHeightDesktop, setPageHeightMobile,
    overlayElements, setOverlayElements, updateOverlayElement, removeOverlayElement, addOverlayElement,
    updateField, updateStyle, reorder, toggleVisibility, resetField, resetSection,
    saveDraft, publish, getEffectiveContent, getEffectiveStyles,
  };
}
