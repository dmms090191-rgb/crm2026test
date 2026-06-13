import type { AiOperation } from './editeurIaTypes';

const MAX_PIXELS = 1_048_576;

export function resizeImageFile(file: File): Promise<{ file: File; resized: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const pixels = img.width * img.height;
      if (pixels <= MAX_PIXELS) {
        resolve({ file, resized: false });
        return;
      }
      const scale = Math.sqrt(MAX_PIXELS / pixels);
      const w = Math.floor(img.width * scale);
      const h = Math.floor(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          const resizedFile = new File([blob], file.name, { type: 'image/png' });
          resolve({ file: resizedFile, resized: true });
        },
        'image/png',
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export function buildImageName(prompt: string, operation: AiOperation): string {
  const words = prompt.split(/\s+/).slice(0, 4).join(' ');
  const prefix = operation === 'generate' ? '' : operation === 'upscale' ? 'Agrandissement - ' : operation === 'outpaint' ? 'Extension - ' : 'Modification - ';
  return `${prefix}${words.substring(0, 40)}`;
}

export function buildAiResponse(operation: AiOperation, model: string): string {
  const modelLabel = model === 'sd3.5-large' ? 'Stable Diffusion 3.5 Large' : model;
  switch (operation) {
    case 'generate': return `Image generee avec succes via ${modelLabel}.`;
    case 'img2img': return `Image modifiee avec succes via ${modelLabel}. Mode correction legere : les personnages et le style d'origine sont preserves.`;
    case 'outpaint': return `Image etendue avec succes. Les zones ajoutees ont ete remplies de maniere coherente.`;
    case 'upscale': return `Image agrandie avec succes (4x). La qualite et les details ont ete preserves.`;
    default: return 'Operation terminee avec succes.';
  }
}
