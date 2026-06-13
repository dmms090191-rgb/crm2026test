import { supabase } from '../../../../../lib/supabase';
import type { SiteSectionRow, LocalEdits, CanvasBg, CanvasGradient, CanvasPageHeight, CanvasBgMode } from './studioSectionTypes';
import { DESKTOP_WIDTH, MOBILE_WIDTH } from './studioSectionTypes';

export async function persistDraft(
  homePageId: string,
  dbSections: SiteSectionRow[],
  localEdits: LocalEdits,
  sectionOrder: string[],
): Promise<void> {
  const updates = dbSections.map(row => {
    const mergedContent = {
      ...row.draft_content,
      ...(localEdits.content[row.section_key] ?? {}),
    };
    const mergedStyles = {
      ...row.draft_styles,
      ...(localEdits.styles[row.section_key] ?? {}),
    };
    const pos = sectionOrder.indexOf(row.section_key);
    const vis = row.section_key in localEdits.visibility
      ? localEdits.visibility[row.section_key]
      : row.is_visible;
    return {
      id: row.id,
      home_page_id: row.home_page_id,
      section_key: row.section_key,
      position: pos >= 0 ? pos : row.position,
      is_visible: vis,
      draft_content: mergedContent,
      draft_styles: mergedStyles,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from('site_sections')
    .upsert(updates, { onConflict: 'home_page_id,section_key' });
  if (error) throw error;

  const hasCanvasBgEdits = localEdits.canvasBg !== null;
  const hasGradientEdits = localEdits.canvasGradient !== null;
  const hasPageHeightEdits = localEdits.canvasPageHeight !== null;
  const hasBgModeEdits = localEdits.canvasBgMode !== null;
  const hasOverlayEdits = localEdits.overlayElements !== null;

  if (hasCanvasBgEdits || hasGradientEdits || hasPageHeightEdits || hasBgModeEdits || hasOverlayEdits) {
    const bgUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (localEdits.canvasBg?.desktop !== undefined) bgUpdate.draft_canvas_bg_desktop = localEdits.canvasBg.desktop;
    if (localEdits.canvasBg?.mobile !== undefined) bgUpdate.draft_canvas_bg_mobile = localEdits.canvasBg.mobile;
    if (localEdits.canvasGradient?.desktop !== undefined) bgUpdate.draft_canvas_gradient_desktop = localEdits.canvasGradient.desktop;
    if (localEdits.canvasGradient?.mobile !== undefined) bgUpdate.draft_canvas_gradient_mobile = localEdits.canvasGradient.mobile;
    if (localEdits.canvasPageHeight?.desktop !== undefined) {
      bgUpdate.draft_page_size_desktop = { width: DESKTOP_WIDTH, height: localEdits.canvasPageHeight.desktop };
    }
    if (localEdits.canvasPageHeight?.mobile !== undefined) {
      bgUpdate.draft_page_size_mobile = { width: MOBILE_WIDTH, height: localEdits.canvasPageHeight.mobile };
    }
    if (localEdits.canvasBgMode?.desktop !== undefined) bgUpdate.draft_canvas_bg_mode_desktop = localEdits.canvasBgMode.desktop;
    if (localEdits.canvasBgMode?.mobile !== undefined) bgUpdate.draft_canvas_bg_mode_mobile = localEdits.canvasBgMode.mobile;
    if (localEdits.overlayElements !== null) bgUpdate.draft_overlay_elements = localEdits.overlayElements;
    const { error: bgErr } = await supabase
      .from('company_home_pages')
      .update(bgUpdate)
      .eq('id', homePageId);
    if (bgErr) throw bgErr;
  }
}

export async function persistPublish(
  homePageId: string,
  dbSections: SiteSectionRow[],
  dbCanvasBg: CanvasBg,
  dbCanvasGradient: CanvasGradient,
  dbPageHeight?: CanvasPageHeight,
  dbBgMode?: CanvasBgMode,
  dbOverlayElements?: unknown[],
): Promise<void> {
  const now = new Date().toISOString();
  const updates = dbSections.map(row => ({
    id: row.id,
    home_page_id: row.home_page_id,
    section_key: row.section_key,
    published_content: row.draft_content,
    published_styles: row.draft_styles,
    published_at: now,
    updated_at: now,
  }));

  const { error: secErr } = await supabase
    .from('site_sections')
    .upsert(updates, { onConflict: 'home_page_id,section_key' });
  if (secErr) throw secErr;

  const publishUpdate: Record<string, unknown> = {
    is_published: true,
    published_canvas_bg_desktop: dbCanvasBg.desktop,
    published_canvas_bg_mobile: dbCanvasBg.mobile,
    published_canvas_gradient_desktop: dbCanvasGradient.desktop,
    published_canvas_gradient_mobile: dbCanvasGradient.mobile,
    updated_at: now,
  };
  if (dbPageHeight) {
    publishUpdate.published_page_size_desktop = dbPageHeight.desktop != null
      ? { width: DESKTOP_WIDTH, height: dbPageHeight.desktop } : null;
    publishUpdate.published_page_size_mobile = dbPageHeight.mobile != null
      ? { width: MOBILE_WIDTH, height: dbPageHeight.mobile } : null;
  }
  if (dbBgMode) {
    publishUpdate.published_canvas_bg_mode_desktop = dbBgMode.desktop;
    publishUpdate.published_canvas_bg_mode_mobile = dbBgMode.mobile;
  }
  if (dbOverlayElements) {
    publishUpdate.published_overlay_elements = dbOverlayElements;
  }

  const { error: pageErr } = await supabase
    .from('company_home_pages')
    .update(publishUpdate)
    .eq('id', homePageId);
  if (pageErr) throw pageErr;
}
