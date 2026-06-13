export interface AiGeneratedImage {
  id: string;
  company_id: string;
  user_id: string;
  operation: AiOperation;
  source_image_url: string | null;
  generated_image_url: string;
  storage_path: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  credits_used: number;
  metadata: Record<string, unknown>;
  name: string;
  created_at: string;
}

export type AiOperation = 'generate' | 'img2img' | 'outpaint' | 'upscale';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  timestamp: Date;
  generatedImageId?: string;
}

export interface GenerationRequest {
  operation: AiOperation;
  prompt: string;
  image_url?: string;
  aspect_ratio?: string;
  model?: string;
  negative_prompt?: string;
  seed?: number;
  strength?: number;
  preserve_mode?: boolean;
  left?: number;
  right?: number;
  up?: number;
  down?: number;
  creativity?: number;
}

export interface GenerationResult {
  success: boolean;
  image_url: string;
  storage_path: string;
  seed: number;
  model: string;
  width: number;
  height: number;
  credits_used: number;
  operation: string;
  aspect_ratio_used?: string;
  prompt_translated?: boolean;
  error?: string;
}

export const TALVEX_TARGET_WIDTH = 1821;
export const TALVEX_TARGET_HEIGHT = 1094;

export const QUICK_ACTIONS = [
  { label: "Agrandir l'image", prompt: "Agrandir l'image en conservant tous les details et la qualite" },
  { label: 'Remplir les cotes', prompt: "Etendre l'image en remplissant les cotes avec un fond naturel et coherent" },
  { label: 'Supprimer les bords', prompt: "Supprimer les bords indesirables et nettoyer les contours de l'image" },
  { label: 'Garder les personnages', prompt: "Modifier l'arriere-plan tout en preservant les personnages et sujets principaux" },
  { label: 'Fond plus naturel', prompt: "Remplacer le fond par un paysage naturel realiste et harmonieux" },
  { label: 'Ameliorer la qualite', prompt: "Ameliorer la qualite globale, la nettete et les details de l'image" },
] as const;

export const MODEL_OPTIONS = [
  { value: 'sd3.5-large', label: 'SD 3.5 Large', credits: 6.5 },
  { value: 'sd3.5-large-turbo', label: 'SD 3.5 Large Turbo', credits: 4 },
  { value: 'sd3.5-medium', label: 'SD 3.5 Medium', credits: 3.5 },
] as const;

export const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
] as const;
