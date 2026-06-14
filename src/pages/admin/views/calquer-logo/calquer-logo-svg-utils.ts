export async function isolateLogo(src: string): Promise<string> {
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

  const corners = [
    getPixel(d, 0, 0, w),
    getPixel(d, w - 1, 0, w),
    getPixel(d, 0, h - 1, w),
    getPixel(d, w - 1, h - 1, w),
  ];
  const bgColor = dominantColor(corners);
  const tolerance = 45;

  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.sqrt(
      (d[i] - bgColor[0]) ** 2 +
      (d[i + 1] - bgColor[1]) ** 2 +
      (d[i + 2] - bgColor[2]) ** 2,
    );
    if (dist < tolerance) {
      d[i + 3] = 0;
    } else if (dist < tolerance + 20) {
      d[i + 3] = Math.round((d[i + 3] * (dist - tolerance)) / 20);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
  return URL.createObjectURL(blob);
}

function getPixel(d: Uint8ClampedArray, x: number, y: number, w: number): [number, number, number] {
  const i = (y * w + x) * 4;
  return [d[i], d[i + 1], d[i + 2]];
}

function dominantColor(colors: [number, number, number][]): [number, number, number] {
  const avg: [number, number, number] = [0, 0, 0];
  for (const c of colors) { avg[0] += c[0]; avg[1] += c[1]; avg[2] += c[2]; }
  return [Math.round(avg[0] / colors.length), Math.round(avg[1] / colors.length), Math.round(avg[2] / colors.length)];
}

export function improveSvg(raw: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return raw;

  const paths = svg.querySelectorAll('path, polygon, polyline, rect, circle, ellipse');
  const toRemove: Element[] = [];

  for (const el of paths) {
    if (el.tagName === 'path') {
      const d = el.getAttribute('d') || '';
      if (d.length < 8) { toRemove.push(el); continue; }
    }

    const fill = el.getAttribute('fill') || '';
    const style = el.getAttribute('style') || '';
    const opacity = parseFloat(el.getAttribute('opacity') || '1');
    if (opacity < 0.05) { toRemove.push(el); continue; }

    if (isNearWhite(fill) || isNearWhite(extractStyleFill(style))) {
      const bbox = estimateBbox(el, svg);
      if (bbox && bbox.area > 0.6) { toRemove.push(el); continue; }
    }
  }

  for (const el of toRemove) el.remove();

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

function isNearWhite(color: string): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const m = c.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return r > 240 && g > 240 && b > 240;
  }
  const rgb = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return +rgb[1] > 240 && +rgb[2] > 240 && +rgb[3] > 240;
  return false;
}

function extractStyleFill(style: string): string {
  const m = style.match(/fill\s*:\s*([^;]+)/);
  return m ? m[1].trim() : '';
}

function estimateBbox(el: Element, svg: Element): { area: number } | null {
  const svgW = parseFloat(svg.getAttribute('width') || '0');
  const svgH = parseFloat(svg.getAttribute('height') || '0');
  if (!svgW || !svgH) return null;

  if (el.tagName === 'rect') {
    const w = parseFloat(el.getAttribute('width') || '0');
    const h = parseFloat(el.getAttribute('height') || '0');
    return { area: (w * h) / (svgW * svgH) };
  }
  return null;
}

export function svgToDataUrl(svgContent: string): string {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}
