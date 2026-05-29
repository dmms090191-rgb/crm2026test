export function isSvgUrl(url: string): boolean {
  return url.toLowerCase().includes('.svg');
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function rasterizeImageUrl(url: string, size = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || size;
      const h = img.naturalHeight || size;
      const scale = Math.min(size / w, size / h, 1);
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Impossible de charger le logo.'));
    img.src = url;
  });
}

export function compositeOnColor(
  transparentDataUrl: string,
  bgColor: [number, number, number],
  size = 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || size;
      const h = img.naturalHeight || size;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})`;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Erreur de composition.'));
    img.src = transparentDataUrl;
  });
}

export const CHECKER_BG = `
  linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
  linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
  linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)
`;

export const PRESET_COLORS: { label: string; rgb: [number, number, number]; hex: string }[] = [
  { label: 'Blanc', rgb: [255, 255, 255], hex: '#ffffff' },
  { label: 'Noir', rgb: [0, 0, 0], hex: '#000000' },
  { label: 'Bleu nuit', rgb: [0, 31, 63], hex: '#001f3f' },
  { label: 'Cyan', rgb: [0, 188, 212], hex: '#00bcd4' },
];

export const REMOVE_BG_COST = 10;

export type EditorAction = 'remove-background' | 'replace-background';
