import type { MaskShape } from './calquer-logo-types';

export async function applyMaskToImage(
  imageSrc: string,
  shapes: MaskShape[],
  canvasRect: { width: number; height: number },
  imageRect: { x: number; y: number; w: number; h: number }
): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load'));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const scaleX = img.naturalWidth / imageRect.w;
  const scaleY = img.naturalHeight / imageRect.h;

  const hasKeep = shapes.some(s => s.mode === 'garder');

  if (hasKeep) {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.fillStyle = '#000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = '#fff';

    for (const s of shapes) {
      if (s.mode !== 'garder') continue;
      const sx = (s.x - imageRect.x) * scaleX;
      const sy = (s.y - imageRect.y) * scaleY;
      const sw = s.w * scaleX;
      const sh = s.h * scaleY;
      const lw = s.size * scaleX;

      maskCtx.lineWidth = lw;
      maskCtx.strokeStyle = '#fff';
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';

      if (s.tool === 'rectangle') {
        maskCtx.strokeRect(sx, sy, sw, sh);
      } else if (s.tool === 'ellipse') {
        maskCtx.beginPath();
        maskCtx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        maskCtx.stroke();
      } else {
        maskCtx.beginPath();
        maskCtx.moveTo(sx, sy);
        maskCtx.lineTo(sx + sw, sy + sh);
        maskCtx.stroke();
      }
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (maskData.data[i] === 0) imgData.data[i + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  for (const s of shapes) {
    if (s.mode !== 'supprimer') continue;
    const sx = (s.x - imageRect.x) * scaleX;
    const sy = (s.y - imageRect.y) * scaleY;
    const sw = s.w * scaleX;
    const sh = s.h * scaleY;
    const lw = s.size * scaleX;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.tool === 'rectangle') {
      ctx.strokeRect(sx, sy, sw, sh);
    } else if (s.tool === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.stroke();
    }
    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
  return URL.createObjectURL(blob);
}
