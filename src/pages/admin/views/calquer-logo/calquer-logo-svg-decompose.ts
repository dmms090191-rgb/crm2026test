import type { SvgShape, DecomposeResult } from './calquerLogoTypes';
import { classifyShape, normalizeFill, isNearWhite, isNearColor } from './calquerLogoShapeUtils';

export type { SvgShape, DecomposeState, DecomposeResult, ImproveStats } from './calquerLogoTypes';

export function decomposeSvg(svgString: string): DecomposeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { shapes: [], svgWidth: 0, svgHeight: 0, viewBox: '' };

  const w = parseFloat(svg.getAttribute('width') || '300');
  const h = parseFloat(svg.getAttribute('height') || '300');
  const vb = svg.getAttribute('viewBox') || `0 0 ${w} ${h}`;
  const svgArea = w * h;

  const selectors = 'path, rect, circle, ellipse, polygon, polyline, line, text';
  const elements = svg.querySelectorAll(selectors);
  const shapes: SvgShape[] = [];

  let idx = 0;
  for (const el of elements) {
    shapes.push(classifyShape(el, idx, svgArea));
    idx++;
  }

  return { shapes, svgWidth: w, svgHeight: h, viewBox: vb };
}

export function rebuildSvg(
  original: string,
  shapes: SvgShape[],
  selectedId: string | null,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(original, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return original;

  const selectors = 'path, rect, circle, ellipse, polygon, polyline, line, text';
  const elements = Array.from(svg.querySelectorAll(selectors));

  for (let i = 0; i < elements.length && i < shapes.length; i++) {
    const shape = shapes[i];
    const el = elements[i];

    if (!shape.visible) {
      el.remove();
      continue;
    }

    if (shape.opacity !== parseFloat(el.getAttribute('opacity') || '1')) {
      el.setAttribute('opacity', String(shape.opacity));
    }

    const origFill = el.getAttribute('fill') || '';
    const origColor = normalizeFill(origFill);
    if (shape.color && origColor && shape.color !== origColor) {
      el.setAttribute('fill', shape.color);
    }

    if (shape.id === selectedId) {
      el.setAttribute('stroke', '#60a5fa');
      el.setAttribute('stroke-width', '2');
      el.setAttribute('stroke-dasharray', '6 3');
    }
  }

  return new XMLSerializer().serializeToString(svg);
}

export function removeBackground(svgString: string): { svg: string; removed: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { svg: svgString, removed: 0 };

  const w = parseFloat(svg.getAttribute('width') || '300');
  const h = parseFloat(svg.getAttribute('height') || '300');
  const svgArea = w * h;
  let removed = 0;

  const rects = svg.querySelectorAll('rect');
  for (const rect of rects) {
    const rw = parseFloat(rect.getAttribute('width') || '0');
    const rh = parseFloat(rect.getAttribute('height') || '0');
    if ((rw * rh) / svgArea > 0.5) { rect.remove(); removed++; }
  }

  const paths = svg.querySelectorAll('path');
  for (const path of paths) {
    const fill = (path.getAttribute('fill') || '').trim().toLowerCase();
    if (isNearWhite(fill) || isNearColor(fill, '#f0f0f0')) {
      const d = path.getAttribute('d') || '';
      if (d.length > 200) { path.remove(); removed++; }
    }
  }

  return { svg: new XMLSerializer().serializeToString(svg), removed };
}

export function removeParasites(svgString: string, threshold = 15): { svg: string; removed: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { svg: svgString, removed: 0 };

  let removed = 0;
  const paths = svg.querySelectorAll('path');
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    if (d.length < threshold) { p.remove(); removed++; }
  }

  for (const tag of ['circle', 'ellipse', 'rect']) {
    const els = svg.querySelectorAll(tag);
    for (const el of els) {
      const s = Math.max(
        parseFloat(el.getAttribute('width') || el.getAttribute('r') || el.getAttribute('rx') || '999'),
        parseFloat(el.getAttribute('height') || el.getAttribute('r') || el.getAttribute('ry') || '999'),
      );
      if (s < 2) { el.remove(); removed++; }
    }
  }

  return { svg: new XMLSerializer().serializeToString(svg), removed };
}

export function simplifyPoints(svgString: string): { svg: string; removed: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { svg: svgString, removed: 0 };

  let totalRemoved = 0;
  const paths = svg.querySelectorAll('path');
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    if (commands.length < 6) continue;

    const before = commands.length;
    const simplified = commands.filter((cmd, i) => {
      if (i === 0 || i === commands.length - 1) return true;
      const c = cmd.trim()[0];
      if (c === 'l' || c === 'L') {
        const nums = cmd.match(/-?\d+\.?\d*/g);
        if (nums && nums.every(n => Math.abs(parseFloat(n)) < 0.5)) return false;
      }
      return true;
    });
    totalRemoved += before - simplified.length;
    p.setAttribute('d', simplified.join(''));
  }

  return { svg: new XMLSerializer().serializeToString(svg), removed: totalRemoved };
}

export function smoothCurves(svgString: string): string {
  return svgString
    .replace(/([LC])\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (_, cmd, x, y) => {
      return `${cmd} ${parseFloat(x).toFixed(1)} ${parseFloat(y).toFixed(1)}`;
    });
}

export function recolorSvg(svgString: string, newColor: string, shapeId?: string, shapes?: SvgShape[]): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  const selectors = 'path, rect, circle, ellipse, polygon, polyline, line';
  const elements = Array.from(svg.querySelectorAll(selectors));

  if (shapeId && shapes) {
    const idx = shapes.findIndex(s => s.id === shapeId);
    if (idx >= 0 && idx < elements.length) {
      const el = elements[idx];
      const fill = el.getAttribute('fill') || '';
      if (fill && fill !== 'none') el.setAttribute('fill', newColor);
    }
  } else {
    for (const el of elements) {
      const fill = el.getAttribute('fill') || '';
      if (fill && fill !== 'none' && fill !== 'transparent') {
        el.setAttribute('fill', newColor);
      }
    }
  }

  return new XMLSerializer().serializeToString(svg);
}

