export function buildSelectionMask(
  imageData: ImageData,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number,
): number[] {
  const { data, width, height } = imageData;
  const total = width * height;
  const mask = new Array<number>(total);
  const tolSq = tolerance * tolerance;
  const softEdge = Math.max(tolerance * 0.3, 8);
  const outerSq = (tolerance + softEdge) * (tolerance + softEdge);

  for (let i = 0; i < total; i++) {
    const off = i * 4;
    const dr = data[off] - targetR;
    const dg = data[off + 1] - targetG;
    const db = data[off + 2] - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      mask[i] = 255;
    } else if (distSq <= outerSq) {
      const dist = Math.sqrt(distSq);
      const t = (dist - tolerance) / softEdge;
      mask[i] = Math.round(255 * (1 - t * t));
    } else {
      mask[i] = 0;
    }
  }
  return mask;
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function getImageData(src: string): Promise<{ imageData: ImageData; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  return loadImageFromSrc(src).then(img => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), canvas, ctx };
  });
}

function canvasToUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });
}

export async function pickColorFromImage(
  src: string,
  clickX: number,
  clickY: number,
  imgRect: { x: number; y: number; w: number; h: number },
  naturalWidth: number,
  naturalHeight: number,
): Promise<[number, number, number]> {
  const ratioX = (clickX - imgRect.x) / imgRect.w;
  const ratioY = (clickY - imgRect.y) / imgRect.h;
  const px = Math.round(ratioX * naturalWidth);
  const py = Math.round(ratioY * naturalHeight);
  const { imageData } = await getImageData(src);
  const off = (py * imageData.width + px) * 4;
  return [imageData.data[off], imageData.data[off + 1], imageData.data[off + 2]];
}

export async function applyKeepSelection(src: string, mask: number[]): Promise<string> {
  const { imageData, canvas, ctx } = await getImageData(src);
  const d = imageData.data;
  for (let i = 0; i < mask.length; i++) {
    const keepStrength = mask[i] / 255;
    d[i * 4 + 3] = Math.round(d[i * 4 + 3] * keepStrength);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvasToUrl(canvas);
}

export async function applyDeleteSelection(src: string, mask: number[]): Promise<string> {
  const { imageData, canvas, ctx } = await getImageData(src);
  const d = imageData.data;
  for (let i = 0; i < mask.length; i++) {
    const deleteStrength = mask[i] / 255;
    d[i * 4 + 3] = Math.round(d[i * 4 + 3] * (1 - deleteStrength));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvasToUrl(canvas);
}

export async function applyTransparentSelection(src: string, mask: number[]): Promise<string> {
  return applyDeleteSelection(src, mask);
}

export async function applyColorSelection(
  src: string,
  mask: number[],
  r: number,
  g: number,
  b: number,
): Promise<string> {
  const { imageData, canvas, ctx } = await getImageData(src);
  const d = imageData.data;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) {
      const t = mask[i] / 255;
      const off = i * 4;
      d[off] = Math.round(d[off] * (1 - t) + r * t);
      d[off + 1] = Math.round(d[off + 1] * (1 - t) + g * t);
      d[off + 2] = Math.round(d[off + 2] * (1 - t) + b * t);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvasToUrl(canvas);
}

export function invertMask(mask: number[]): number[] {
  return mask.map(v => 255 - v);
}

export async function buildMaskFromImage(
  src: string,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number,
): Promise<{ mask: number[]; width: number; height: number }> {
  const { imageData } = await getImageData(src);
  const mask = buildSelectionMask(imageData, targetR, targetG, targetB, tolerance);
  return { mask, width: imageData.width, height: imageData.height };
}

export async function generatePreviewUrl(
  src: string,
  mask: number[],
  highlightColor: [number, number, number] = [59, 130, 246],
  opacity = 0.45,
): Promise<string> {
  const { imageData, canvas, ctx } = await getImageData(src);
  const d = imageData.data;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) {
      const strength = (mask[i] / 255) * opacity;
      const off = i * 4;
      d[off] = Math.round(d[off] * (1 - strength) + highlightColor[0] * strength);
      d[off + 1] = Math.round(d[off + 1] * (1 - strength) + highlightColor[1] * strength);
      d[off + 2] = Math.round(d[off + 2] * (1 - strength) + highlightColor[2] * strength);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvasToUrl(canvas);
}
