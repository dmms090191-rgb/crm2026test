import { supabase } from '../../../../lib/supabase';

export interface AiZone {
  id: string;
  label: string;
  type: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  area: number;
  color: string;
  maskUrl: string | null;
}

export interface AiSegmentationResult {
  zones: AiZone[];
  combinedMaskUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  error?: string;
}

const FALLBACK_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

export async function segmentLogoWithAI(
  imageUrl: string,
): Promise<AiSegmentationResult> {
  const { base64, width, height } = await imageUrlToBase64(imageUrl);

  let resp;
  try {
    resp = await supabase.functions.invoke('segment-logo-zones', {
      body: { imageBase64: base64, imageWidth: width, imageHeight: height },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(width, height, `Erreur reseau: ${msg}`);
  }

  if (resp.error) {
    const detail = resp.error.message || String(resp.error);
    if (detail.includes('FunctionsFetchError') || detail.includes('Failed to fetch')) {
      return errorResult(width, height, 'Edge Function segment-logo-zones inaccessible.');
    }
    const body = resp.data as Record<string, unknown> | null;
    if (body?.error) {
      const msg = String(body.error);
      const extra = body.details ? ` (${body.details})` : '';
      return errorResult(width, height, `${msg}${extra}`);
    }
    return errorResult(width, height, detail);
  }

  const json = resp.data as Record<string, unknown> | null;
  if (!json) return errorResult(width, height, 'Reponse vide de l\'Edge Function.');

  if (json.error) {
    const extra = json.details ? ` (${json.details})` : '';
    return errorResult(width, height, `${json.error}${extra}`);
  }

  const zones: AiZone[] = ((json.zones as AiZone[]) || []).map((z, i) => ({
    ...z,
    color: z.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  return {
    zones,
    combinedMaskUrl: (json.combinedMaskUrl as string) || null,
    imageWidth: (json.imageWidth as number) || width,
    imageHeight: (json.imageHeight as number) || height,
  };
}

function errorResult(w: number, h: number, error: string): AiSegmentationResult {
  return { zones: [], combinedMaskUrl: null, imageWidth: w, imageHeight: h, error };
}

async function imageUrlToBase64(
  url: string,
): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/png');
      resolve({ base64, width: w, height: h });
    };
    img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    img.src = url;
  });
}
