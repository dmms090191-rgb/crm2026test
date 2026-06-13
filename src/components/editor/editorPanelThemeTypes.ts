export type EditorPanelThemeId = 'gris' | 'noir' | 'blanc';

export interface EditorPanelTokens {
  panel: {
    bg: string;
    border: string;
    shadow: string;
    backdrop: string;
  };
  header: {
    borderBottom: string;
    title: string;
    iconMuted: string;
  };
  surface: {
    secondary: string;
    border: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  label: {
    muted: string;
  };
  input: {
    bg: string;
    border: string;
    text: string;
  };
  accent: {
    bg: string;
    bgHover: string;
    border: string;
    text: string;
    solid: string;
  };
  danger: {
    bg: string;
    border: string;
    text: string;
  };
  success: {
    bg: string;
    border: string;
    text: string;
  };
  swatchBorder: string;
}

export interface CustomPanelPalette {
  background: string;
  surface: string;
  accent: string;
}
