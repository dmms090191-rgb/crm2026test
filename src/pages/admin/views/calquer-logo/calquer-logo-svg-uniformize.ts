export interface UniformizeResult {
  svg: string;
  modifiedCount: number;
  dominantColor: string;
}

export function uniformizeSvg(svgString: string, colorThreshold = 70): UniformizeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { svg: svgString, modifiedCount: 0, dominantColor: '#000000' };

  const selectors = 'path, rect, circle, ellipse, polygon, polyline, line';
  const elements = Array.from(svg.querySelectorAll(selectors));

  const colorEntries: { el: Element; rgb: [number, number, number]; fill: string }[] = [];
  for (const el of elements) {
    const fill = extractFill(el);
    if (!fill || fill === 'none' || fill === 'transparent') continue;
    const rgb = hexToRgb(fill);
    if (!rgb) continue;
    if (rgb[0] > 240 && rgb[1] > 240 && rgb[2] > 240) continue;
    colorEntries.push({ el, rgb, fill });
  }

  if (colorEntries.length === 0) {
    return { svg: svgString, modifiedCount: 0, dominantColor: '#000000' };
  }

  const clusters = clusterColors(colorEntries.map(e => e.rgb), colorThreshold);
  let largestIdx = 0;
  let largestSize = 0;
  clusters.forEach((members, idx) => {
    if (members.length > largestSize) {
      largestSize = members.length;
      largestIdx = idx;
    }
  });

  const dominantMembers = clusters.get(largestIdx)!;
  const avgR = Math.round(
    dominantMembers.reduce((s, i) => s + colorEntries[i].rgb[0], 0) / dominantMembers.length,
  );
  const avgG = Math.round(
    dominantMembers.reduce((s, i) => s + colorEntries[i].rgb[1], 0) / dominantMembers.length,
  );
  const avgB = Math.round(
    dominantMembers.reduce((s, i) => s + colorEntries[i].rgb[2], 0) / dominantMembers.length,
  );
  const dominantHex = rgbToHex(avgR, avgG, avgB);

  let modifiedCount = 0;

  for (const memberIdx of dominantMembers) {
    const entry = colorEntries[memberIdx];
    if (entry.fill !== dominantHex) {
      applyFill(entry.el, dominantHex);
      modifiedCount++;
    }
  }

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'path') continue;
    const d = el.getAttribute('d') || '';
    if (d.length >= 30) continue;
    const fill = extractFill(el);
    const rgb = fill ? hexToRgb(fill) : null;
    if (!rgb || rgbDist(rgb, [avgR, avgG, avgB]) < colorThreshold * 1.5) {
      applyFill(el, dominantHex);
      modifiedCount++;
    }
  }

  return {
    svg: new XMLSerializer().serializeToString(svg),
    modifiedCount,
    dominantColor: dominantHex,
  };
}

function extractFill(el: Element): string {
  const raw = el.getAttribute('fill')
    || el.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1]
    || '';
  return normalizeFill(raw);
}

function normalizeFill(fill: string): string {
  const c = fill.trim().toLowerCase();
  if (!c || c === 'none' || c === 'transparent') return '';
  return c;
}

function applyFill(el: Element, color: string) {
  const style = el.getAttribute('style');
  if (style && style.includes('fill:')) {
    el.setAttribute('style', style.replace(/fill:\s*[^;]+/, `fill: ${color}`));
  } else {
    el.setAttribute('fill', color);
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const c = hex.replace('#', '');
  if (c.length === 3) {
    return [
      parseInt(c[0] + c[0], 16),
      parseInt(c[1] + c[1], 16),
      parseInt(c[2] + c[2], 16),
    ];
  }
  if (c.length === 6) {
    return [
      parseInt(c.slice(0, 2), 16),
      parseInt(c.slice(2, 4), 16),
      parseInt(c.slice(4, 6), 16),
    ];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function rgbDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function clusterColors(
  colors: [number, number, number][],
  threshold: number,
): Map<number, number[]> {
  const clusters = new Map<number, number[]>();
  const assigned = new Array(colors.length).fill(-1);
  let nextCluster = 0;

  for (let i = 0; i < colors.length; i++) {
    if (assigned[i] >= 0) continue;
    const clusterId = nextCluster++;
    clusters.set(clusterId, [i]);
    assigned[i] = clusterId;

    for (let j = i + 1; j < colors.length; j++) {
      if (assigned[j] >= 0) continue;
      if (rgbDist(colors[i], colors[j]) < threshold) {
        clusters.get(clusterId)!.push(j);
        assigned[j] = clusterId;
      }
    }
  }

  return clusters;
}
