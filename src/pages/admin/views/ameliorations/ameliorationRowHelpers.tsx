export function splitNumberedItems(text: string): string[] {
  const byNewline = text.split('\n').filter(l => l.trim());
  if (byNewline.length > 1) {
    return byNewline.map(l => l.replace(/^\s*(?:\d+[\.\)]\s*|[-*]\s+)/, '').trim()).filter(Boolean);
  }

  const re = /(\d+)\.\s+/g;
  let m;
  const allPositions: { idx: number; num: number; end: number }[] = [];
  while ((m = re.exec(text)) !== null) {
    allPositions.push({ idx: m.index, num: parseInt(m[1], 10), end: m.index + m[0].length });
  }

  const first1 = allPositions.find(p => p.num === 1);
  if (!first1) return [];

  const seqPositions = [first1];
  let expected = 2;
  for (const p of allPositions) {
    if (p.idx > first1.idx && p.num === expected) {
      seqPositions.push(p);
      expected++;
    }
  }
  if (seqPositions.length < 2) return [];

  const items: string[] = [];
  for (let i = 0; i < seqPositions.length; i++) {
    const begin = seqPositions[i].end;
    const finish = i + 1 < seqPositions.length ? seqPositions[i + 1].idx : text.length;
    items.push(text.slice(begin, finish).trim().replace(/\.\s*$/, '').trim());
  }
  return items.filter(Boolean);
}

export function renderNumberedTitle(text: string, color: string, numColor: string) {
  const items = splitNumberedItems(text);
  if (items.length === 0) return <span>{text}</span>;

  return (
    <ol className="list-none space-y-1 m-0 p-0">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="font-semibold tabular-nums flex-shrink-0" style={{ color: numColor, minWidth: 22, textAlign: 'right' }}>{i + 1}.</span>
          <span style={{ color }}>{line}</span>
        </li>
      ))}
    </ol>
  );
}
