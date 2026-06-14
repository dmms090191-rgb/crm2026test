export interface LogoLibraryItem {
  id: string;
  company_id: string;
  name: string;
  file_path: string;
  bg_mode: 'checker' | 'solid' | 'gradient';
  bg_color1: string;
  bg_color2: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type BgMode = LogoLibraryItem['bg_mode'];
