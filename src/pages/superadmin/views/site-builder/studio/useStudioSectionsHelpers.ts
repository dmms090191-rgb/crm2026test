import type { SiteSectionRow, StudioSection, LocalEdits } from './studioSectionTypes';
import type { SectionConfig } from './templateSectionsConfig';

export function deriveSections(
  dbSections: SiteSectionRow[],
  templateSections: SectionConfig[],
): StudioSection[] {
  return (dbSections.length > 0 ? dbSections : []).map(row => {
    const tplSection = templateSections.find(s => s.key === row.section_key);
    return {
      key: row.section_key,
      label: tplSection?.label ?? row.section_key,
      icon: tplSection?.icon ?? 'Star',
      editableFields: tplSection?.editableFields ?? [],
      defaultContent: tplSection?.defaultContent ?? {},
      defaultStyles: tplSection?.defaultStyles ?? {},
      draftContent: row.draft_content,
      draftStyles: row.draft_styles,
      dbId: row.id,
    };
  });
}

export function deriveVisibleSections(
  dbSections: SiteSectionRow[],
  localEdits: LocalEdits,
): Set<string> {
  return new Set(
    dbSections
      .filter(r => {
        if (r.section_key in localEdits.visibility) return localEdits.visibility[r.section_key];
        return r.is_visible;
      })
      .map(r => r.section_key)
  );
}

export function checkHasUnsavedChanges(localEdits: LocalEdits): boolean {
  return Object.keys(localEdits.content).length > 0
    || Object.keys(localEdits.styles).length > 0
    || localEdits.order !== null
    || Object.keys(localEdits.visibility).length > 0
    || localEdits.canvasBg !== null
    || localEdits.canvasGradient !== null
    || localEdits.canvasPageHeight !== null
    || localEdits.canvasBgMode !== null
    || localEdits.overlayElements !== null;
}

export function deriveLastSavedAt(dbSections: SiteSectionRow[]): string | null {
  if (dbSections.length === 0) return null;
  return dbSections.reduce((max, r) => (r.updated_at && r.updated_at > max ? r.updated_at : max), '');
}

export function deriveLastPublishedAt(dbSections: SiteSectionRow[]): string | null {
  if (dbSections.length === 0) return null;
  return dbSections.reduce((max, r) => (r.published_at && r.published_at > max ? r.published_at : max), '') || null;
}

export function getEffectiveValues(
  dbSections: SiteSectionRow[],
  localEdits: LocalEdits,
  sectionKey: string,
  type: 'content' | 'styles',
): Record<string, string> {
  const row = dbSections.find(r => r.section_key === sectionKey);
  const base = type === 'content' ? (row?.draft_content ?? {}) : (row?.draft_styles ?? {});
  const overrides = (type === 'content' ? localEdits.content : localEdits.styles)[sectionKey] ?? {};
  return { ...base, ...overrides };
}
