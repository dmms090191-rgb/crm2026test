export interface CustomColumnInput {
  label: string;
  fieldType: string;
  visibleDesktop: boolean;
}

export interface ColumnModalConfig {
  order: string[];
  hiddenDesktop: string[];
}

export const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'url', label: 'Lien' },
] as const;
