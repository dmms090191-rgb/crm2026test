export interface SvgZone {
  id: string;
  label: string;
  type: 'group' | 'cluster';
  color: string;
  bbox: { x: number; y: number; w: number; h: number };
  elementIndices: number[];
  elementCount: number;
  pathData: string[];
}

export interface ZoneDetectionResult {
  zones: SvgZone[];
  viewBox: string;
  svgWidth: number;
  svgHeight: number;
}

const ZONE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#d946ef', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7',
];

export function detectZones(svgString: string): ZoneDetectionResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { zones: [], viewBox: '0 0 300 300', svgWidth: 300, svgHeight: 300 };

  const w = parseFloat(svg.getAttribute('width') || '300');
  const h = parseFloat(svg.getAttribute('height') || '300');
  const vbAttr = svg.getAttribute('viewBox');
  const vb = vbAttr || `0 0 ${w} ${h}`;
  const vbParts = vb.split(/[\s,]+/).map(Number);
  const svgW = vbParts[2] || w;
  const svgH = vbParts[3] || h;
  const svgArea = svgW * svgH;

  const allShapes = 'path, rect, circle, ellipse, polygon, polyline, line, text';
  const allElements = Array.from(svg.querySelectorAll(allShapes));

  const bboxes = allElements.map(el => computeElementBbox(el));
  const assignedIndices = new Set<number>();
  const zones: SvgZone[] = [];
  let colorIdx = 0;

  const groups = Array.from(svg.children).filter(c => c.tagName.toLowerCase() === 'g');
  for (const g of groups) {
    const children = Array.from(g.querySelectorAll(allShapes));
    if (children.length === 0) continue;
    const indices = children.map(c => allElements.indexOf(c)).filter(i => i >= 0);
    if (indices.length === 0) continue;
    const bbox = mergeBoxes(indices.map(i => bboxes[i]));
    if (!bbox || isFullBg(bbox, svgArea)) continue;
    indices.forEach(i => assignedIndices.add(i));
    const paths = collectPaths(indices, allElements);
    zones.push({
      id: `zone_${zones.length}`, label: guessGroupLabel(g, children, zones.length),
      type: 'group', color: ZONE_COLORS[colorIdx++ % ZONE_COLORS.length],
      bbox, elementIndices: indices, elementCount: indices.length, pathData: paths,
    });
  }

  const remaining: { idx: number; bbox: { x: number; y: number; w: number; h: number } }[] = [];
  for (let i = 0; i < allElements.length; i++) {
    if (assignedIndices.has(i)) continue;
    const bb = bboxes[i];
    if (!bb) continue;
    if (isFullBg(bb, svgArea)) continue;
    if (bb.w < 0.5 && bb.h < 0.5) continue;
    remaining.push({ idx: i, bbox: bb });
  }

  const clusters = clusterByProximity(remaining, svgW, svgH);
  for (const cluster of clusters) {
    const indices = cluster.map(r => r.idx);
    const bbox = mergeBoxes(cluster.map(r => r.bbox));
    if (!bbox) continue;
    const paths = collectPaths(indices, allElements);
    const label = guessClusterLabel(indices, allElements, zones.length);
    zones.push({
      id: `zone_${zones.length}`, label, type: 'cluster',
      color: ZONE_COLORS[colorIdx++ % ZONE_COLORS.length],
      bbox, elementIndices: indices, elementCount: indices.length, pathData: paths,
    });
  }

  return { zones, viewBox: vb, svgWidth: svgW, svgHeight: svgH };
}

interface RemainingItem { idx: number; bbox: { x: number; y: number; w: number; h: number } }

function clusterByProximity(items: RemainingItem[], svgW: number, svgH: number): RemainingItem[][] {
  if (items.length === 0) return [];
  if (items.length <= 3) return [items];
  const threshold = Math.max(svgW, svgH) * 0.12;
  const labels = new Array(items.length).fill(-1);
  let currentLabel = 0;

  for (let i = 0; i < items.length; i++) {
    if (labels[i] !== -1) continue;
    labels[i] = currentLabel;
    const stack = [i];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (let j = 0; j < items.length; j++) {
        if (labels[j] !== -1) continue;
        if (bboxDist(items[cur].bbox, items[j].bbox) < threshold) {
          labels[j] = currentLabel;
          stack.push(j);
        }
      }
    }
    currentLabel++;
  }

  const groups: Map<number, RemainingItem[]> = new Map();
  for (let i = 0; i < items.length; i++) {
    const l = labels[i];
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(items[i]);
  }
  return Array.from(groups.values());
}

function bboxDist(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  return Math.sqrt((acx - bcx) ** 2 + (acy - bcy) ** 2);
}

function mergeBoxes(boxes: ({ x: number; y: number; w: number; h: number } | null)[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;
  for (const bb of boxes) {
    if (!bb) continue;
    found = true;
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.w);
    maxY = Math.max(maxY, bb.y + bb.h);
  }
  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function collectPaths(indices: number[], allElements: Element[]): string[] {
  const result: string[] = [];
  for (const i of indices) {
    const el = allElements[i];
    if (!el) continue;
    result.push(new XMLSerializer().serializeToString(el));
  }
  return result;
}

function computeElementBbox(el: Element): { x: number; y: number; w: number; h: number } | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'rect') return { x: num(el, 'x'), y: num(el, 'y'), w: num(el, 'width'), h: num(el, 'height') };
  if (tag === 'circle') { const cx = num(el, 'cx'), cy = num(el, 'cy'), r = num(el, 'r'); return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }; }
  if (tag === 'ellipse') { const cx = num(el, 'cx'), cy = num(el, 'cy'), rx = num(el, 'rx'), ry = num(el, 'ry'); return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }; }
  if (tag === 'path') return computePathBbox(el.getAttribute('d') || '');
  if (tag === 'text') return computeTextBbox(el);
  if (tag === 'polygon' || tag === 'polyline') return computePointsBbox(el.getAttribute('points') || '');
  if (tag === 'line') {
    const x1 = num(el, 'x1'), y1 = num(el, 'y1'), x2 = num(el, 'x2'), y2 = num(el, 'y2');
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }
  return null;
}

function computePathBbox(d: string): { x: number; y: number; w: number; h: number } | null {
  const coords = [...d.matchAll(/([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi)].map(m => parseFloat(m[1]));
  if (coords.length < 2) return null;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < coords.length - 1; i += 2) { xs.push(coords[i]); ys.push(coords[i + 1]); }
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if (!isFinite(minX) || !isFinite(minY)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function computeTextBbox(el: Element): { x: number; y: number; w: number; h: number } | null {
  const x = num(el, 'x'), y = num(el, 'y');
  const fs = parseFloat(el.getAttribute('font-size') || '16');
  const t = el.textContent || '';
  return { x, y: y - fs, w: t.length * fs * 0.6, h: fs * 1.2 };
}

function computePointsBbox(points: string): { x: number; y: number; w: number; h: number } | null {
  const nums = points.match(/-?\d+\.?\d*/g)?.map(Number);
  if (!nums || nums.length < 4) return null;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < nums.length - 1; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function num(el: Element, attr: string): number { return parseFloat(el.getAttribute(attr) || '0'); }

function isFullBg(bbox: { w: number; h: number }, svgArea: number): boolean { return (bbox.w * bbox.h) / svgArea > 0.7; }

function guessGroupLabel(g: Element, children: Element[], idx: number): string {
  const id = g.getAttribute('id') || '';
  if (id) return cleanId(id);
  const cls = g.getAttribute('class') || '';
  if (cls) return cleanId(cls);
  const textEls = children.filter(c => c.tagName.toLowerCase() === 'text');
  if (textEls.length > 0) {
    const t = textEls.map(e => e.textContent || '').join(' ').trim();
    if (t) return `Texte "${t.slice(0, 20)}"`;
  }
  return `Groupe ${idx + 1} (${children.length} formes)`;
}

function guessClusterLabel(indices: number[], allElements: Element[], startIdx: number): string {
  const tags = indices.map(i => allElements[i]?.tagName.toLowerCase() || '');
  const textEls = indices.filter(i => allElements[i]?.tagName.toLowerCase() === 'text');
  if (textEls.length > 0) {
    const t = textEls.map(i => allElements[i]?.textContent || '').join(' ').trim();
    if (t) return `Texte "${t.slice(0, 20)}"`;
  }
  if (tags.every(t => t === 'circle')) return `Cercles (${indices.length})`;
  if (tags.every(t => t === 'rect')) return `Rectangles (${indices.length})`;
  if (tags.every(t => t === 'path')) return `Zone ${startIdx + 1} (${indices.length} formes)`;
  return `Zone ${startIdx + 1} (${indices.length} elements)`;
}

function cleanId(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 25);
}

export function buildZoneHighlightSvg(
  svgString: string, zones: SvgZone[], selectedZoneId: string | null, hoveredZoneId: string | null,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;
  const ns = 'http://www.w3.org/2000/svg';
  const allShapes = 'path, rect, circle, ellipse, polygon, polyline, line, text';
  const allElements = Array.from(svg.querySelectorAll(allShapes));
  const overlay = doc.createElementNS(ns, 'g');
  overlay.setAttribute('class', 'zone-overlays');
  overlay.setAttribute('pointer-events', 'none');
  for (const zone of zones) {
    const isSelected = zone.id === selectedZoneId;
    const isHovered = zone.id === hoveredZoneId;
    if (!isSelected && !isHovered) continue;
    const sw = isSelected ? 2.5 : 1.5;
    for (const idx of zone.elementIndices) {
      const el = allElements[idx];
      if (!el) continue;
      const clone = el.cloneNode(true) as Element;
      clone.setAttribute('fill', isSelected ? `${zone.color}20` : 'none');
      clone.setAttribute('stroke', zone.color);
      clone.setAttribute('stroke-width', String(sw));
      clone.setAttribute('stroke-opacity', isSelected ? '1' : '0.7');
      if (!isSelected) clone.setAttribute('stroke-dasharray', '6 3');
      clone.removeAttribute('id');
      clone.removeAttribute('class');
      overlay.appendChild(clone);
    }
  }
  svg.appendChild(overlay);
  return new XMLSerializer().serializeToString(svg);
}
