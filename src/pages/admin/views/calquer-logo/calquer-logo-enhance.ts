function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = src;
  });
}

function getPixels(src: string): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData }> {
  return loadImg(src).then(img => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { canvas, ctx, data };
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(URL.createObjectURL(blob)) : reject(), 'image/png');
  });
}

function upscale(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height); return c;
}

function downscale(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, w, h); return c;
}

function gaussBlurAlpha(d: Uint8ClampedArray, w: number, h: number, sigma: number) {
  const R = Math.ceil(sigma * 2.5);
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -R; i <= R; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); kernel.push(v); sum += v; }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = -R; k <= R; k++) {
        const nx = Math.min(w - 1, Math.max(0, x + k));
        v += d[(y * w + nx) * 4 + 3] * kernel[k + R];
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = -R; k <= R; k++) {
        const ny = Math.min(h - 1, Math.max(0, y + k));
        v += tmp[ny * w + x] * kernel[k + R];
      }
      d[(y * w + x) * 4 + 3] = Math.round(Math.max(0, Math.min(255, v)));
    }
  }
}

function morphAlpha(d: Uint8ClampedArray, w: number, h: number, erode: boolean) {
  const out = new Uint8ClampedArray(d.length); out.set(d);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const n = [d[((y-1)*w+x)*4+3], d[((y+1)*w+x)*4+3], d[(y*w+x-1)*4+3], d[(y*w+x+1)*4+3]];
    out[(y*w+x)*4+3] = erode ? Math.min(d[(y*w+x)*4+3], ...n) : Math.max(d[(y*w+x)*4+3], ...n);
  }
  return out;
}

function thresholdAlpha(d: Uint8ClampedArray, t: number) {
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= t ? 255 : 0;
}

function findDominantColor(d: Uint8ClampedArray): [number, number, number] {
  let sr = 0, sg = 0, sb = 0, c = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i+3] < 200) continue; sr += d[i]; sg += d[i+1]; sb += d[i+2]; c++; }
  return c === 0 ? [0,0,0] : [Math.round(sr/c), Math.round(sg/c), Math.round(sb/c)];
}

function countSolid(d: Uint8ClampedArray, w: number, h: number, cx: number, cy: number, r: number): number {
  let count = 0;
  for (let dy = -r; dy <= r; dy++) { const ny = cy+dy; if (ny<0||ny>=h) continue;
    for (let dx = -r; dx <= r; dx++) { const nx = cx+dx; if (nx<0||nx>=w||(!dx&&!dy)) continue;
      if (d[(ny*w+nx)*4+3] >= 180) count++; } }
  return count;
}

function defringe(d: Uint8ClampedArray, w: number, h: number) {
  const [dr, dg, db] = findDominantColor(d);
  const domLum = dr * 0.299 + dg * 0.587 + db * 0.114;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a < 3) continue;
      if (a >= 240) continue;
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const nearTip = countSolid(d, w, h, x, y, 2) < 6;
      const haloThresh = nearTip ? 30 : 60;
      const isHalo = lum > domLum + haloThresh;
      if (isHalo) {
        const t = Math.min(1, (lum - domLum - haloThresh) / 80);
        const fade = nearTip ? 0.95 : 0.8;
        d[i + 3] = Math.round(a * (1 - t * fade));
        if (d[i + 3] < 12) { d[i + 3] = 0; continue; }
      }
      const edgeness = 1 - a / 255;
      const pull = edgeness * (nearTip ? 0.9 : 0.7);
      d[i] = Math.round(d[i] + (dr - d[i]) * pull);
      d[i + 1] = Math.round(d[i + 1] + (dg - d[i + 1]) * pull);
      d[i + 2] = Math.round(d[i + 2] + (db - d[i + 2]) * pull);
    }
  }
}

function cleanFringe(d: Uint8ClampedArray, w: number, h: number) {
  const [dr, dg, db] = findDominantColor(d);
  const domLum = dr * 0.299 + dg * 0.587 + db * 0.114;
  const out = new Uint8ClampedArray(d.length);
  out.set(d);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a === 0 || a >= 220) continue;
      let solid1 = 0, empty1 = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const na = d[((y + dy) * w + (x + dx)) * 4 + 3];
          if (na >= 180) solid1++;
          else if (na < 10) empty1++;
        }
      }
      if (empty1 >= 5 && solid1 <= 1) { out[i + 3] = 0; continue; }
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      if (lum > domLum + 40 && a < 150 && empty1 >= 3) { out[i + 3] = 0; continue; }
      if (solid1 >= 4) {
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * w + (x + dx)) * 4;
            if (d[ni + 3] >= 180) { sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; cnt++; }
          }
        }
        if (cnt > 0) {
          out[i] = Math.round(sr / cnt); out[i + 1] = Math.round(sg / cnt);
          out[i + 2] = Math.round(sb / cnt); out[i + 3] = 255;
        }
      }
    }
  }
  d.set(out);
}

function cleanTips(d: Uint8ClampedArray, w: number, h: number) {
  const [dr, dg, db] = findDominantColor(d);
  const domLum = dr * 0.299 + dg * 0.587 + db * 0.114;
  const out = new Uint8ClampedArray(d.length);
  out.set(d);
  const R = 3;
  for (let y = R; y < h - R; y++) {
    for (let x = R; x < w - R; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a < 3 || a >= 220) continue;
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      if (lum <= domLum + 25) continue;
      let solidR2 = 0, totalR2 = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          if (dx === 0 && dy === 0) continue;
          totalR2++;
          if (d[((y + dy) * w + (x + dx)) * 4 + 3] >= 180) solidR2++;
        }
      }
      const density = solidR2 / totalR2;
      if (density < 0.25) { out[i + 3] = 0; continue; }
      if (density < 0.4 && lum > domLum + 50) {
        out[i + 3] = Math.round(a * 0.3);
        if (out[i + 3] < 10) out[i + 3] = 0;
      }
    }
  }
  d.set(out);
}

export async function smoothEdges(src: string): Promise<string> {
  const { canvas, data } = await getPixels(src);
  const origW = canvas.width, origH = canvas.height;
  defringe(data.data, origW, origH);
  cleanFringe(data.data, origW, origH);
  cleanTips(data.data, origW, origH);
  const preCtx = canvas.getContext('2d')!;
  preCtx.putImageData(data, 0, 0);
  const scale = 3;
  const big = upscale(canvas, scale);
  const bCtx = big.getContext('2d')!;
  let pix = bCtx.getImageData(0, 0, big.width, big.height);
  const bw = big.width, bh = big.height;
  let d = morphAlpha(pix.data, bw, bh, false);
  d = morphAlpha(d, bw, bh, false);
  d = morphAlpha(d, bw, bh, true);
  d = morphAlpha(d, bw, bh, true);
  pix = new ImageData(d, bw, bh);
  defringe(pix.data, bw, bh);
  cleanTips(pix.data, bw, bh);
  gaussBlurAlpha(pix.data, bw, bh, 2.5);
  const interior = new Uint8ClampedArray(pix.data);
  thresholdAlpha(interior, 140);
  gaussBlurAlpha(interior, bw, bh, 1.8);
  for (let i = 3; i < pix.data.length; i += 4) {
    pix.data[i] = Math.max(pix.data[i], interior[i]);
  }
  bCtx.putImageData(pix, 0, 0);
  const result = downscale(big, origW, origH);
  const rCtx = result.getContext('2d')!;
  const final = rCtx.getImageData(0, 0, origW, origH);
  defringe(final.data, origW, origH);
  cleanFringe(final.data, origW, origH);
  cleanTips(final.data, origW, origH);
  rCtx.putImageData(final, 0, 0);
  return toBlob(result);
}

export async function despeckle(src: string): Promise<string> {
  const { canvas, ctx, data } = await getPixels(src);
  const w = canvas.width, h = canvas.height;
  const d = data.data;
  const visited = new Uint8Array(w * h);
  const threshold = 12;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || d[idx * 4 + 3] < 10) continue;
      const cluster: number[] = [];
      const stack = [idx];
      while (stack.length > 0) {
        const ci = stack.pop()!;
        if (visited[ci]) continue;
        visited[ci] = 1;
        cluster.push(ci);
        if (cluster.length > threshold) break;
        const cx = ci % w, cy = Math.floor(ci / w);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (!visited[ni] && d[ni * 4 + 3] >= 10) stack.push(ni);
          }
        }
      }
      if (cluster.length <= threshold) {
        for (const ci of cluster) {
          d[ci * 4 + 3] = 0;
        }
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return toBlob(canvas);
}

export async function sharpen(src: string): Promise<string> {
  const { canvas, ctx, data } = await getPixels(src);
  const w = canvas.width, h = canvas.height;
  const d = data.data;
  const orig = new Uint8ClampedArray(d);
  const amount = 0.5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (orig[i + 3] < 10) continue;
      for (let c = 0; c < 3; c++) {
        const ic = i + c;
        const blur = (
          orig[((y - 1) * w + x) * 4 + c] +
          orig[((y + 1) * w + x) * 4 + c] +
          orig[(y * w + x - 1) * 4 + c] +
          orig[(y * w + x + 1) * 4 + c]
        ) / 4;
        const detail = orig[ic] - blur;
        d[ic] = Math.max(0, Math.min(255, Math.round(orig[ic] + detail * amount)));
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return toBlob(canvas);
}