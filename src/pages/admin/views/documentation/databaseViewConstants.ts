import DATABASE_DOC, { TableDoc } from './databaseDocumentation';

export type TabKey = 'summary' | 'columns' | 'relations' | 'config';

export type SyncStatus = 'idle' | 'checking' | 'ok' | 'drift' | 'error';

export type TechBadgeType = 'trigger' | 'view' | 'function' | 'index' | 'unique-index';

export const GROUP_COLORS: Record<string, string> = {
  'Core CRM': '#38bdf8',
  'Chat': '#34d399',
  'Documentation interne': '#fb923c',
  'Non classe': '#94a3b8',
};

export const TYPE_COLORS: Record<string, string> = {
  uuid: '#a78bfa',
  text: '#38bdf8',
  boolean: '#34d399',
  jsonb: '#f472b6',
  integer: '#fb923c',
  bigint: '#fb923c',
  timestamptz: '#fbbf24',
  date: '#fbbf24',
};

export const OPERATION_COLORS: Record<string, string> = {
  SELECT: '#38bdf8',
  INSERT: '#34d399',
  UPDATE: '#fbbf24',
  DELETE: '#f87171',
};

export const MAIN_RELATIONS: Array<{ from: string; to: string; description: string }> = [
  { from: 'leads', to: 'vendors', description: 'lead assigné à un commercial' },
  { from: 'leads', to: 'statuts', description: 'qualification du lead' },
  { from: 'leads', to: 'import_history', description: 'traçabilité de l\'import' },
  { from: 'leads', to: 'rdv_proposals', description: 'propositions de rendez-vous' },
  { from: 'leads', to: 'client_messages', description: 'messagerie client directe' },
  { from: 'conversations', to: 'messages', description: 'messagerie interne vendeur-admin' },
  { from: 'vendors', to: 'vendor_admin_messages', description: 'messagerie admin-commercial' },
  { from: 'vendors', to: 'vendor_comments', description: 'notes sur le commercial' },
];

export const LINE = '─'.repeat(60);
export const THICK_LINE = '═'.repeat(60);

export function getTypeColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(key)) return color;
  }
  return '#94a3b8';
}

export function getGroupForTable(tableName: string): string {
  const t = DATABASE_DOC.tables.find((t) => t.name === tableName);
  return t?.group ?? '';
}

export function buildFullDatabaseDocText(allTables: TableDoc[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const sections: string[] = [];

  sections.push(THICK_LINE);
  sections.push('  DOCUMENTATION BASE DE DONNÉES — CRM SaaS');
  sections.push(`  Copiée le ${dateStr} à ${timeStr}`);
  sections.push(`  Documentation mise à jour le : ${DATABASE_DOC.lastSyncedAt}`);
  sections.push(THICK_LINE);

  const totalColumns = allTables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalRelations = allTables.reduce((acc, t) => acc + t.foreignKeys.length, 0);
  const totalPolicies = allTables.reduce((acc, t) => acc + t.policies.length, 0);
  const totalTriggers = allTables.reduce((acc, t) => acc + (t.triggers?.length ?? 0), 0);

  sections.push('');
  sections.push('RÉSUMÉ GLOBAL');
  sections.push(LINE);
  sections.push(`  Tables          : ${allTables.length}`);
  sections.push(`  Colonnes totales: ${totalColumns}`);
  sections.push(`  Relations FK    : ${totalRelations}`);
  sections.push(`  Policies RLS    : ${totalPolicies}`);
  sections.push(`  Triggers        : ${totalTriggers}`);
  sections.push('');

  const allGroups = [...DATABASE_DOC.groups];
  if (allTables.some((t) => t.group === 'Non classe')) allGroups.push({ id: 'Non classe', label: 'Non classe', color: '#94a3b8' });
  const groupCounts = allGroups.map((g) => ({
    label: g.label,
    count: allTables.filter((t) => t.group === g.id).length,
  })).filter((g) => g.count > 0);
  sections.push('  Groupes :');
  for (const g of groupCounts) {
    sections.push(`    • ${g.label} (${g.count} tables)`);
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  RELATIONS PRINCIPALES');
  sections.push(THICK_LINE);
  sections.push('');
  for (const rel of MAIN_RELATIONS) {
    sections.push(`  ${rel.from}  →  ${rel.to}`);
    sections.push(`    ${rel.description}`);
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  TABLES');
  sections.push(THICK_LINE);

  for (const table of allTables) {
    sections.push('');
    sections.push(LINE);
    sections.push(`  TABLE : ${table.name.toUpperCase()}   [${table.group}]`);
    sections.push(LINE);
    sections.push('');
    sections.push(`  Description`);
    sections.push(`  ${table.description}`);
    sections.push('');

    sections.push(`  Rôle          : ${table.quickUnderstanding.role}`);
    sections.push(`  Utilisé par   : ${table.quickUnderstanding.usedBy}`);
    if (table.quickUnderstanding.relatedTables.length > 0) {
      sections.push(`  Tables liées  : ${table.quickUnderstanding.relatedTables.join(', ')}`);
    }
    sections.push('');

    sections.push(`  Exemple`);
    sections.push(`  ${table.example}`);
    sections.push('');

    sections.push(`  Colonnes (${table.columns.length})`);
    const colNameWidth = Math.max(...table.columns.map((c) => c.name.length), 10);
    const colTypeWidth = Math.max(...table.columns.map((c) => c.type.length), 6);
    for (const col of table.columns) {
      const name = col.name.padEnd(colNameWidth);
      const type = col.type.padEnd(colTypeWidth);
      const required = col.nullable ? 'nullable' : 'requis ';
      const pk = col.primaryKey ? ' [PK]' : '';
      const def = col.default ? `  default: ${col.default}` : '';
      const constraints = col.constraints ? `  → ${col.constraints}` : '';
      sections.push(`    ${name}  ${type}  ${required}${pk}${def}${constraints}`);
    }

    if (table.foreignKeys.length > 0) {
      sections.push('');
      sections.push(`  Relations FK`);
      for (const fk of table.foreignKeys) {
        const arrow = fk.direction === 'outgoing' ? '→' : '←';
        sections.push(`    ${arrow} ${table.name}.${fk.column} — ${fk.referencesTable}.${fk.referencesColumn}`);
        sections.push(`      ${fk.description}`);
      }
    }

    if (table.indexes.length > 0) {
      sections.push('');
      sections.push(`  Index`);
      for (const idx of table.indexes) {
        const unique = idx.unique ? ' [UNIQUE]' : '';
        const condition = idx.condition ? `  (${idx.condition})` : '';
        sections.push(`    (${idx.columns.join(', ')})${unique}${condition}`);
      }
    }

    if (table.policies.length > 0) {
      sections.push('');
      sections.push(`  Policies RLS`);
      const ops = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
      for (const op of ops) {
        const ps = table.policies.filter((p) => p.operation === op);
        for (const p of ps) {
          const cond = p.condition && p.condition !== 'true' ? `  WHEN ${p.condition}` : '';
          sections.push(`    [${op}]  ${p.name}  (${p.roles.join(', ')})${cond}`);
        }
      }
    }

    if (table.triggers && table.triggers.length > 0) {
      sections.push('');
      sections.push(`  Triggers`);
      for (const trg of table.triggers) {
        sections.push(`    [${trg.event}]  ${trg.function}`);
        sections.push(`      ${trg.description}`);
      }
    }
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  VUES SQL');
  sections.push(THICK_LINE);
  sections.push('');
  for (const v of DATABASE_DOC.views) {
    sections.push(`  ${v.name}  →  ${v.returns}`);
    sections.push(`  ${v.description}`);
    sections.push(`  SQL : ${v.sql}`);
    sections.push('');
  }

  sections.push(THICK_LINE);
  sections.push('  FONCTIONS SQL');
  sections.push(THICK_LINE);
  sections.push('');
  for (const fn of DATABASE_DOC.functions) {
    sections.push(`  ${fn.name}`);
    sections.push(`  ${fn.description}`);
    if (fn.trigger) sections.push(`  Trigger : ${fn.trigger}`);
    sections.push('');
  }

  sections.push(THICK_LINE);
  sections.push('  RÈGLES GLOBALES');
  sections.push(THICK_LINE);
  sections.push('');
  for (const rule of DATABASE_DOC.globalRules) {
    sections.push(`  • ${rule}`);
  }

  sections.push('');
  sections.push(THICK_LINE);

  return sections.join('\n');
}
