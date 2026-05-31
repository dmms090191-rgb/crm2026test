export type FieldType = 'text' | 'textarea' | 'url' | 'image' | 'color';

export interface EditableField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

export interface SectionConfig {
  key: string;
  label: string;
  icon: string;
  editableFields: EditableField[];
  defaultContent: Record<string, string>;
  defaultStyles: Record<string, string>;
}

export interface TemplateSectionsMap {
  [templateKey: string]: SectionConfig[];
}
