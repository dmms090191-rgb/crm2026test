import type { GradientDirection, LogoColorConfig } from './calquer-logo-types';
import { recolorSvg } from './calquer-logo-svg-decompose';

const DIR_COORDS: Record<GradientDirection, { x1: string; y1: string; x2: string; y2: string }> = {
  top: { x1: '0', y1: '1', x2: '0', y2: '0' },
  bottom: { x1: '0', y1: '0', x2: '0', y2: '1' },
  left: { x1: '1', y1: '0', x2: '0', y2: '0' },
  right: { x1: '0', y1: '0', x2: '1', y2: '0' },
  'diag-left': { x1: '1', y1: '1', x2: '0', y2: '0' },
  'diag-right': { x1: '0', y1: '1', x2: '1', y2: '0' },
};

export function recolorSvgGradient(
  svgString: string, color1: string, color2: string, direction: GradientDirection,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;
  const ns = 'http://www.w3.org/2000/svg';

  let defs = svg.querySelector('defs');
  if (!defs) { defs = doc.createElementNS(ns, 'defs'); svg.prepend(defs); }

  const existing = defs.querySelector('#logo-recolor-grad');
  if (existing) existing.remove();

  const grad = doc.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'logo-recolor-grad');
  grad.setAttribute('gradientUnits', 'objectBoundingBox');
  const coords = DIR_COORDS[direction];
  grad.setAttribute('x1', coords.x1); grad.setAttribute('y1', coords.y1);
  grad.setAttribute('x2', coords.x2); grad.setAttribute('y2', coords.y2);

  const stop1 = doc.createElementNS(ns, 'stop');
  stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', color1);
  const stop2 = doc.createElementNS(ns, 'stop');
  stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', color2);
  grad.appendChild(stop1); grad.appendChild(stop2);
  defs.appendChild(grad);

  const selectors = 'path, rect, circle, ellipse, polygon, polyline, line';
  for (const el of svg.querySelectorAll(selectors)) {
    const fill = el.getAttribute('fill') || '';
    if (fill && fill !== 'none' && fill !== 'transparent') {
      el.setAttribute('fill', 'url(#logo-recolor-grad)');
    }
  }

  return new XMLSerializer().serializeToString(svg);
}

export function applyLogoColorConfig(baseSvg: string, config: LogoColorConfig): string {
  if (config.mode === 'none') return baseSvg;
  if (config.mode === 'solid') return recolorSvg(baseSvg, config.solidColor);
  return recolorSvgGradient(baseSvg, config.gradientColor1, config.gradientColor2, config.gradientDirection);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = src;
  });
}

export async function recolorRasterSolid(src: string, color: string): Promise<string> {
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  const [r, g, b] = hexToRgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 10) { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
  }
  ctx.putImageData(id, 0, 0);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(bl => bl ? res(bl) : rej(), 'image/png'));
  return URL.createObjectURL(blob);
}

export async function recolorRasterGradient(
  src: string, color1: string, color2: string, direction: GradientDirection,
): Promise<string> {
  const img = await loadImg(src);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  const coords = DIR_COORDS[direction];
  const ax = +coords.x1, ay = +coords.y1, bx = +coords.x2, by = +coords.y2;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] <= 10) continue;
    const px = (i / 4) % w, py = Math.floor((i / 4) / w);
    const nx = px / (w - 1 || 1), ny = py / (h - 1 || 1);
    let t = ((nx - ax) * dx + (ny - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    d[i] = Math.round(r1 + (r2 - r1) * t);
    d[i + 1] = Math.round(g1 + (g2 - g1) * t);
    d[i + 2] = Math.round(b1 + (b2 - b1) * t);
  }
  ctx.putImageData(id, 0, 0);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(bl => bl ? res(bl) : rej(), 'image/png'));
  return URL.createObjectURL(blob);
}

export async function applyLogoColorConfigRaster(
  src: string, config: LogoColorConfig,
): Promise<string> {
  if (config.mode === 'none') return src;
  if (config.mode === 'solid') return recolorRasterSolid(src, config.solidColor);
  return recolorRasterGradient(src, config.gradientColor1, config.gradientColor2, config.gradientDirection);
}
