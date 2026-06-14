import type { MaskShape } from './calquer-logo-types';

export async function applyMaskToImage(
  imageSrc: string,
  shapes: MaskShape[],
  _canvasRect: { width: number; height: number },
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

    for (const s of shapes) {
      if (s.mode !== 'garder') continue;
      drawShapeOnCtx(maskCtx, s, imageRect, scaleX, scaleY, '#fff');
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
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawShapeOnCtx(ctx, s, imageRect, scaleX, scaleY, '#000');
    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
  return URL.createObjectURL(blob);
}

function drawShapeOnCtx(
  ctx: CanvasRenderingContext2D,
  s: MaskShape,
  imageRect: { x: number; y: number; w: number; h: number },
  scaleX: number, scaleY: number,
  color: string,
) {
  const sx = (s.x - imageRect.x) * scaleX;
  const sy = (s.y - imageRect.y) * scaleY;
  const sw = s.w * scaleX;
  const sh = s.h * scaleY;
  const lw = s.size * scaleX;
  const isFilled = s.fillMode === 'fill';

  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (s.rotation) {
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (s.tool === 'rectangle') {
    const r = (s.cornerRadius ?? 0) * scaleX;
    if (r > 0) {
      drawRoundedRect(ctx, sx, sy, sw, sh, r);
      if (isFilled) ctx.fill(); else ctx.stroke();
    } else {
      if (isFilled) ctx.fillRect(sx, sy, sw, sh); else ctx.strokeRect(sx, sy, sw, sh);
    }
  } else if (s.tool === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    if (isFilled) ctx.fill(); else ctx.stroke();
  } else if (s.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.stroke();
  } else if (s.tool === 'arc') {
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const startRad = ((s.arcStart ?? 0) * Math.PI) / 180;
    const endRad = ((s.arcEnd ?? 180) * Math.PI) / 180;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sw / 2, sh / 2, 0, startRad, endRad);
    ctx.stroke();
  } else if ((s.tool === 'lasso' || s.tool === 'polygon') && s.points) {
    drawPointsPath(ctx, s.points, imageRect, scaleX, scaleY, true);
    if (isFilled) ctx.fill(); else ctx.stroke();
  } else if (s.tool === 'bezier' && s.points) {
    drawBezierPath(ctx, s.points, imageRect, scaleX, scaleY);
    ctx.stroke();
  } else if (s.tool === 'eraser' && s.points) {
    drawPointsPath(ctx, s.points, imageRect, scaleX, scaleY, false);
    ctx.stroke();
  }

  if (s.rotation) ctx.restore();
}

function drawPointsPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  imageRect: { x: number; y: number },
  scaleX: number, scaleY: number,
  close: boolean,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  const p0 = points[0];
  ctx.moveTo((p0.x - imageRect.x) * scaleX, (p0.y - imageRect.y) * scaleY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo((points[i].x - imageRect.x) * scaleX, (points[i].y - imageRect.y) * scaleY);
  }
  if (close) ctx.closePath();
}

function drawBezierPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  imageRect: { x: number; y: number },
  scaleX: number, scaleY: number,
) {
  if (points.length < 2) return;
  const scale = (p: { x: number; y: number }) => ({
    x: (p.x - imageRect.x) * scaleX,
    y: (p.y - imageRect.y) * scaleY,
  });
  const pts = points.map(scale);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const mr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + mr, y);
  ctx.lineTo(x + w - mr, y);
  ctx.arcTo(x + w, y, x + w, y + mr, mr);
  ctx.lineTo(x + w, y + h - mr);
  ctx.arcTo(x + w, y + h, x + w - mr, y + h, mr);
  ctx.lineTo(x + mr, y + h);
  ctx.arcTo(x, y + h, x, y + h - mr, mr);
  ctx.lineTo(x, y + mr);
  ctx.arcTo(x, y, x + mr, y, mr);
  ctx.closePath();
}
