export async function removeWhiteBackground(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  const hardThreshold = 245;
  const softLow = 200;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a === 0) continue;

    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    if (brightness >= hardThreshold && saturation < 20) {
      d[i + 3] = 0;
    } else if (brightness >= softLow && saturation < 30) {
      const t = (brightness - softLow) / (hardThreshold - softLow);
      const alphaReduction = t * t;
      d[i + 3] = Math.round(a * (1 - alphaReduction));
    }
  }

  defringe(d, w, h);

  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
  return URL.createObjectURL(blob);
}

function defringe(d: Uint8ClampedArray, w: number, h: number) {
  const isTransparent = (idx: number) => d[idx * 4 + 3] === 0;
  const isOpaque = (idx: number) => d[idx * 4 + 3] > 200;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const off = idx * 4;
      const a = d[off + 3];
      if (a === 0 || a > 200) continue;

      let transparentNeighbors = 0;
      let opaqueNeighbors = 0;
      const neighbors = [
        y > 0 ? (y - 1) * w + x : -1,
        y < h - 1 ? (y + 1) * w + x : -1,
        x > 0 ? y * w + (x - 1) : -1,
        x < w - 1 ? y * w + (x + 1) : -1,
      ];

      for (const ni of neighbors) {
        if (ni < 0) continue;
        if (isTransparent(ni)) transparentNeighbors++;
        if (isOpaque(ni)) opaqueNeighbors++;
      }

      if (transparentNeighbors >= 2 && opaqueNeighbors === 0) {
        d[off + 3] = 0;
      } else if (transparentNeighbors >= 1 && opaqueNeighbors >= 1) {
        const r = d[off], g = d[off + 1], b = d[off + 2];
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        if (brightness > 180) {
          const factor = Math.max(0.1, 1 - (brightness - 180) / 75);
          d[off + 3] = Math.round(a * factor);
        }
      }
    }
  }
}
