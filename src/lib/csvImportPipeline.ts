import { normalizePhone, normalizeEmail, capitalizeName } from './phoneNormalizer';
import { sanitizeTextField } from './csvEncoding';

export const MAX_FILE_SIZE_MB = 10;
export const MAX_ROWS = 5000;
export const BATCH_SIZE = 200;

export type RowStatus = 'valid' | 'dup_file' | 'dup_crm' | 'error';

export interface ProcessedRow {
  index: number;
  raw: Record<string, string>;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  status: RowStatus;
  errorReason?: string;
  dupOriginalIndex?: number;
  dupLeadId?: string;
  dupLeadName?: string;
  dupMatchType?: 'email' | 'telephone' | 'both';
}

export interface ColumnMapping {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

const PRENOM_VARIANTS = ['prenom', 'prénom', 'firstname', 'first_name', 'first name', 'prénom'];
const NOM_VARIANTS = ['nom', 'name', 'lastname', 'last_name', 'last name', 'surname'];
const EMAIL_VARIANTS = ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse mail'];
const TEL_VARIANTS = ['telephone', 'téléphone', 'tel', 'tél', 'phone', 'mobile', 'portable'];

function detectColumn(columns: string[], variants: string[]): string | undefined {
  return columns.find(col => variants.includes(col.toLowerCase().trim()));
}

export function detectColumnMapping(columns: string[]): ColumnMapping {
  return {
    prenom: detectColumn(columns, PRENOM_VARIANTS),
    nom: detectColumn(columns, NOM_VARIANTS),
    email: detectColumn(columns, EMAIL_VARIANTS),
    telephone: detectColumn(columns, TEL_VARIANTS),
  };
}

const TEL_SAMPLE_SIZE = 10;
const TEL_SAMPLE_THRESHOLD = 0.4;

export function refineTelephoneMapping(
  mapping: ColumnMapping,
  rows: Record<string, string>[]
): ColumnMapping {
  if (!mapping.telephone) return mapping;

  const nonEmpty = rows
    .map(r => (r[mapping.telephone!] ?? '').trim())
    .filter(v => v !== '');

  const sample = nonEmpty.slice(0, TEL_SAMPLE_SIZE);
  if (sample.length === 0) return { ...mapping, telephone: undefined };

  const validCount = sample.filter(v => normalizePhone(v).valid).length;
  if (validCount / sample.length < TEL_SAMPLE_THRESHOLD) {
    return { ...mapping, telephone: undefined };
  }

  return mapping;
}

export function parseCSVText(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { columns: [], rows: [] };

  const firstLine = lines[0];
  const sep = firstLine.includes(';') && !firstLine.includes(',')
    ? ';'
    : firstLine.split(',').length >= firstLine.split(';').length
    ? ','
    : ';';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const columns = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    columns.forEach((col, i) => { row[col] = values[i] ?? ''; });
    return row;
  });

  return { columns, rows };
}

export function processRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  emailMap?: Map<string, number>,
  telMap?: Map<string, number>
): ProcessedRow[] {
  const _emailMap = emailMap ?? new Map<string, number>();
  const _telMap = telMap ?? new Map<string, number>();

  return rows.map((raw, index) => {
    const rawPrenom = sanitizeTextField(mapping.prenom ? raw[mapping.prenom] ?? '' : '');
    const rawNom = sanitizeTextField(mapping.nom ? raw[mapping.nom] ?? '' : '');
    const rawEmail = sanitizeTextField(mapping.email ? raw[mapping.email] ?? '' : '');
    const rawTel = sanitizeTextField(mapping.telephone ? raw[mapping.telephone] ?? '' : '');

    const isEntirelyEmpty = Object.values(raw).every(v => !v || v.trim() === '');
    if (isEntirelyEmpty) {
      return { index, raw, prenom: '', nom: '', email: null, telephone: null, status: 'error' as RowStatus, errorReason: 'Ligne vide' };
    }

    const prenom = capitalizeName(rawPrenom);
    const nom = capitalizeName(rawNom);

    const emailNorm = normalizeEmail(rawEmail);
    if (rawEmail.trim() !== '' && emailNorm === null) {
      return { index, raw, prenom, nom, email: null, telephone: null, status: 'error' as RowStatus, errorReason: 'Email invalide' };
    }

    const telResult = normalizePhone(rawTel);
    let telephone: string | null = null;
    if (telResult.valid) {
      telephone = telResult.canonical;
    } else if (emailNorm === null) {
      return { index, raw, prenom, nom, email: null, telephone: null, status: 'error' as RowStatus, errorReason: telResult.error ?? 'Téléphone invalide' };
    }

    const email = emailNorm;

    if (email === null && telephone === null) {
      return { index, raw, prenom, nom, email: null, telephone: null, status: 'error' as RowStatus, errorReason: 'Email et téléphone tous les deux absents' };
    }

    if (email !== null && _emailMap.has(email)) {
      return { index, raw, prenom, nom, email, telephone, status: 'dup_file' as RowStatus, dupOriginalIndex: _emailMap.get(email)! };
    }
    if (telephone !== null && _telMap.has(telephone)) {
      return { index, raw, prenom, nom, email, telephone, status: 'dup_file' as RowStatus, dupOriginalIndex: _telMap.get(telephone)! };
    }

    if (email !== null) _emailMap.set(email, index);
    if (telephone !== null) _telMap.set(telephone, index);

    return { index, raw, prenom, nom, email, telephone, status: 'valid' as RowStatus };
  });
}

export interface DuplicateMatch {
  lead_id: string;
  lead_email: string | null;
  lead_telephone: string | null;
  lead_nom: string | null;
  lead_prenom: string | null;
  match_type: 'email' | 'telephone' | 'both';
}

export function applyDuplicateMatches(
  rows: ProcessedRow[],
  matches: DuplicateMatch[]
): ProcessedRow[] {
  const emailToMatch = new Map<string, DuplicateMatch>();
  const telToMatch = new Map<string, DuplicateMatch>();

  for (const m of matches) {
    if (m.lead_email) emailToMatch.set(m.lead_email, m);
    if (m.lead_telephone) telToMatch.set(m.lead_telephone, m);
  }

  return rows.map(row => {
    if (row.status !== 'valid') return row;

    const matchByEmail = row.email ? emailToMatch.get(row.email) : undefined;
    const matchByTel = row.telephone ? telToMatch.get(row.telephone) : undefined;
    const match = matchByEmail ?? matchByTel;

    if (!match) return row;

    const name = [match.lead_prenom, match.lead_nom].filter(Boolean).join(' ') || `Lead #${match.lead_id.slice(0, 6)}`;

    return {
      ...row,
      status: 'dup_crm' as RowStatus,
      dupLeadId: match.lead_id,
      dupLeadName: name,
      dupMatchType: match.match_type,
    };
  });
}

export function countByStatus(rows: ProcessedRow[]) {
  return {
    valid: rows.filter(r => r.status === 'valid').length,
    dup_file: rows.filter(r => r.status === 'dup_file').length,
    dup_crm: rows.filter(r => r.status === 'dup_crm').length,
    error: rows.filter(r => r.status === 'error').length,
    total: rows.length,
  };
}

export function generateErrorCSV(rows: ProcessedRow[], _mapping: ColumnMapping, allColumns: string[]): string {
  const errorRows = rows.filter(r => r.status === 'error');
  if (errorRows.length === 0) return '';

  const headers = [...allColumns, 'Motif d\'erreur'];
  const lines = [headers.map(h => `"${h}"`).join(',')];

  for (const row of errorRows) {
    const vals = allColumns.map(col => `"${(row.raw[col] ?? '').replace(/"/g, '""')}"`);
    vals.push(`"${row.errorReason ?? 'Erreur inconnue'}"`);
    lines.push(vals.join(','));
  }

  return lines.join('\n');
}
