const REPLACEMENT_CHAR = '\uFFFD';

const MOJIBAKE_PATTERNS = [
  /Ã©/g, /Ã¨/g, /Ãª/g, /Ã«/g,
  /Ã /g, /Ã¢/g, /Ã¤/g,
  /Ã¯/g, /Ã®/g, /Ã´/g, /Ã¶/g,
  /Ã¹/g, /Ã»/g, /Ã¼/g,
  /Ã§/g, /Ã‰/g, /Ã€/g,
];

export function countBrokenCharacters(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === REPLACEMENT_CHAR) count++;
  }
  for (const pattern of MOJIBAKE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

export async function decodeCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  const utf8Text = new TextDecoder('utf-8').decode(buffer);
  const utf8Broken = countBrokenCharacters(utf8Text);

  if (utf8Broken === 0) return utf8Text;

  const latin1Text = new TextDecoder('windows-1252').decode(buffer);
  const latin1Broken = countBrokenCharacters(latin1Text);

  if (latin1Broken < utf8Broken) return latin1Text;

  const isoText = new TextDecoder('iso-8859-1').decode(buffer);
  const isoBroken = countBrokenCharacters(isoText);

  if (isoBroken < utf8Broken && isoBroken <= latin1Broken) return isoText;

  return latin1Broken <= utf8Broken ? latin1Text : utf8Text;
}

const INVISIBLE_SET = new Set(['\u200B', '\u200C', '\u200D', '\uFEFF', '\u00AD']);

export function sanitizeTextField(value: string): string {
  let cleaned = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (INVISIBLE_SET.has(ch)) continue;
    cleaned += ch === '\u00A0' ? ' ' : ch;
  }
  return cleaned.trim();
}
