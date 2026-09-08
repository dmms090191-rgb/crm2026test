import type { SvgShape } from './calquerLogoTypes';

const TAG_LABELS: Record<string, string> = {
  path: 'Chemin',
  rect: 'Rectangle',
  circle: 'Cercle',
  ellipse: 'Ellipse',
  polygon: 'Polygone',
  polyline: 'Polyligne',
  line: 'Ligne',
  text: 'Texte',
  g: 'Groupe',
};

function classifyShape(el: Element, idx: number, svgArea: number): SvgShape {
  const tag = el.tagName.toLowerCase();
  const fill = el.getAttribute('fill') || el.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1] || '';
  const opacity = parseFloat(el.getAttribute('opacity') || '1');
  const d = el.getAttribute('d') || '';
  const pathLength = d.length;

  let area = 0;
  if (tag === 'rect') {
    area = (parseFloat(el.getAttribute('width') || '0') * parseFloat(el.getAttribute('height') || '0')) / (svgArea || 1);
  } else if (tag === 'circle') {
    const r = parseFloat(el.getAttribute('r') || '0');
    area = (Math.PI * r * r) / (svgArea || 1);
  } else if (tag === 'ellipse') {
    const rx = parseFloat(el.getAttribute('rx') || '0');
    const ry = parseFloat(el.getAttribute('ry') || '0');
    area = (Math.PI * rx * ry) / (svgArea || 1);
  }

  let label = TAG_LABELS[tag] || tag;
  if (area > 0.5) label = 'Fond';
  else if (pathLength < 20 && tag === 'path') label = 'Petit parasite';
  else if (pathLength < 50 && tag === 'path') label = 'Petit element';

  const color = normalizeFill(fill);

  return {
    id: `svg_shape_${idx}`,
    tag,
    label: `${label} ${idx + 1}`,
    visible: true,
    color: color || '#808080',
    opacity,
    pathLength,
    area,
    element: new XMLSerializer().serializeToString(el),
  };
}

function normalizeFill(fill: string): string {
  const c = fill.trim().toLowerCase();
  if (!c || c === 'none' || c === 'transparent') return '';
  return c;
}


function isNearWhite(c: string): boolean {
  if (!c) return false;
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const m = c.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return r > 235 && g > 235 && b > 235;
  }
  return false;
}

function isNearColor(c: string, target: string): boolean {
  if (!c) return false;
  const m1 = c.match(/^#([0-9a-f]{6})$/);
  const m2 = target.match(/^#([0-9a-f]{6})$/);
  if (!m1 || !m2) return false;
  const dist = Math.sqrt(
    (parseInt(m1[1].slice(0, 2), 16) - parseInt(m2[1].slice(0, 2), 16)) ** 2 +
    (parseInt(m1[1].slice(2, 4), 16) - parseInt(m2[1].slice(2, 4), 16)) ** 2 +
    (parseInt(m1[1].slice(4, 6), 16) - parseInt(m2[1].slice(4, 6), 16)) ** 2,
  );
  return dist < 30;
}


export { TAG_LABELS, classifyShape, normalizeFill, isNearWhite, isNearColor };
