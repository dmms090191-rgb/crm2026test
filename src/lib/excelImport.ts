import { read, utils } from 'xlsx';

export async function parseExcelFile(file: File): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { columns: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const raw: string[][] = utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length === 0) return { columns: [], rows: [] };

  const columns = raw[0].map(c => String(c ?? '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i];
    if (!cells || cells.every(c => String(c ?? '').trim() === '')) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      row[columns[j]] = String(cells[j] ?? '').trim();
    }
    rows.push(row);
  }

  return { columns, rows };
}
