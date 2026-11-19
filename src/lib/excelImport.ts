import { read, utils, type CellObject } from 'xlsx';
import { nettoyerCellule } from './csvLecture';

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

/**
 * Le premier onglet d'un classeur, en TABLEAUX : les en-tetes tels quels (doublons compris)
 * et les cellules par position. Rien n'est fusionne — c'est `entetesPourImport` qui rend les
 * noms uniques, sans perdre de colonne.
 *
 * CELLULE PAR CELLULE, comme Excel l'affiche, a deux exceptions pres :
 *   - un nombre au format « Standard » est ecrit en entier (le texte d'Excel le tronquait en
 *     « 1.23457E+13 ») ;
 *   - une date est ecrite jour/mois/annee a partir de son numero de serie, sans passer par un
 *     objet Date (qui la decalait d'un jour selon le fuseau).
 * Tout autre format garde le TEXTE AFFICHE : un telephone au format « 06 12 ... » ou un code
 * postal « 01000 » garde son zero de tete.
 */
export async function lireExcelBrut(file: File): Promise<{ entetes: string[]; lignes: { ligne: number; cellules: string[] }[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array', cellNF: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { entetes: [], lignes: [] };
  const ws = workbook.Sheets[sheetName];
  /* Le calendrier du classeur : 1900 (Windows) ou 1904 (anciens Mac). */
  const origine = workbook.Workbook?.WBProps?.date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  if (!ws || !ws['!ref']) return { entetes: [], lignes: [] };
  const zone = utils.decode_range(ws['!ref']);
  const deux = (n: number) => String(n).padStart(2, '0');
  const texte = (cell: CellObject | undefined): string => {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    if (cell.t === 'n' && typeof cell.v === 'number') {
      const format = typeof cell.z === 'string' ? cell.z : 'General';
      if (estFormatDate(format)) {
        /* Numero de serie -> date, en arithmetique UTC pure : aucun fuseau ne s'en mele. */
        const d = new Date(origine + Math.round(cell.v * 86400) * 1000);
        if (!Number.isNaN(d.getTime())) {
          const date = `${deux(d.getUTCDate())}/${deux(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
          return d.getUTCHours() || d.getUTCMinutes() ? `${date} ${deux(d.getUTCHours())}:${deux(d.getUTCMinutes())}` : date;
        }
      }
      if (format === 'General') return String(cell.v);
      return nettoyerCellule(String(cell.w ?? cell.v));
    }
    if (cell.t === 'b') return cell.v ? 'VRAI' : 'FAUX';
    return nettoyerCellule(String(cell.w ?? cell.v).replace(/\r\n?/g, '\n'));
  };
  const toutes: { ligne: number; cellules: string[] }[] = [];
  for (let r = zone.s.r; r <= zone.e.r; r++) {
    const cellules: string[] = [];
    for (let c = zone.s.c; c <= zone.e.c; c++) cellules.push(texte(ws[utils.encode_cell({ r, c })] as CellObject | undefined));
    toutes.push({ ligne: r + 1, cellules });
  }
  const premiere = toutes.findIndex(l => l.cellules.some(c => c.trim() !== ''));
  if (premiere < 0) return { entetes: [], lignes: [] };
  const entetes = toutes[premiere].cellules.map(c => c.trim());
  const lignes = toutes.slice(premiere + 1).filter(l => l.cellules.some(c => c.trim() !== ''));
  return { entetes, lignes };
}

/** Un format de nombre Excel qui affiche une date ou une heure (jours, mois, annees, heures). */
function estFormatDate(format: string): boolean {
  if (format === 'General') return false;
  const sansTexte = format.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
  return /[dmyhs]/i.test(sansTexte) && !/E[+-]/i.test(sansTexte);
}
