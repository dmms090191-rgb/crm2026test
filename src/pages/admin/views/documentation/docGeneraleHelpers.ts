import { Bot, Cpu, Database, FolderOpen, BookOpen, Lightbulb, ShieldCheck, TrendingUp } from 'lucide-react';
import { createElement } from 'react';
import DATABASE_DOC from './databaseDocumentation';
import type { TableDoc } from './databaseDocumentation';
import type { ContextCard } from './ContextCardsView';
import type { DocSection, IdeaItem, AmeliorationItem, AmeliorationCategoryItem } from './docGeneraleTypes';
import { MOCK_SECTIONS, MOCK_GLOBAL_SCORE } from './auditMockData';

const ICON_MAP: Record<string, React.ReactNode> = {
  'contexte-chatgpt': createElement(Bot, { className: 'w-4.5 h-4.5' }),
  'technologies': createElement(Cpu, { className: 'w-4.5 h-4.5' }),
  'base-de-donnees': createElement(Database, { className: 'w-4.5 h-4.5' }),
  'structure-crm': createElement(FolderOpen, { className: 'w-4.5 h-4.5' }),
  'ameliorations': createElement(TrendingUp, { className: 'w-4.5 h-4.5' }),
  'idees': createElement(Lightbulb, { className: 'w-4.5 h-4.5' }),
  'audit-technique': createElement(ShieldCheck, { className: 'w-4.5 h-4.5' }),
};

export function getIconForTab(tabId: string): React.ReactNode {
  return ICON_MAP[tabId] ?? createElement(BookOpen, { className: 'w-4.5 h-4.5' });
}

export function buildDatabaseSummaryText(allTables: TableDoc[]): string {
  const groups: Record<string, TableDoc[]> = {};
  for (const t of allTables) {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  }

  const totalCols = allTables.reduce((a, t) => a + t.columns.length, 0);
  const totalFk = allTables.reduce((a, t) => a + t.foreignKeys.length, 0);
  const totalPolicies = allTables.reduce((a, t) => a + t.policies.length, 0);

  const lines: string[] = [];
  lines.push(`${allTables.length} tables | ${totalCols} colonnes | ${totalFk} relations FK | ${totalPolicies} policies RLS`);
  lines.push('');

  const groupOrder = ['Core CRM', 'Chat', 'Documentation interne', 'Non classe'];
  for (const g of groupOrder) {
    const tables = groups[g];
    if (!tables || tables.length === 0) continue;
    lines.push(`${g} (${tables.length} tables)`);
    for (const t of tables) {
      const colCount = t.columns.length;
      const fkCount = t.foreignKeys.length;
      const meta: string[] = [`${colCount} col.`];
      if (fkCount > 0) meta.push(`${fkCount} FK`);
      if (t.policies.length > 0) meta.push(`${t.policies.length} RLS`);
      if (t.triggers && t.triggers.length > 0) meta.push(`${t.triggers.length} trigger${t.triggers.length > 1 ? 's' : ''}`);
      lines.push(`  - ${t.name} (${meta.join(', ')})`);
      lines.push(`    ${t.description.substring(0, 120)}`);
    }
    lines.push('');
  }

  if (DATABASE_DOC.views.length > 0) {
    lines.push(`Vues SQL (${DATABASE_DOC.views.length})`);
    for (const v of DATABASE_DOC.views) {
      lines.push(`  - ${v.name} : ${v.description}`);
    }
    lines.push('');
  }

  if (DATABASE_DOC.functions.length > 0) {
    lines.push(`Fonctions SQL (${DATABASE_DOC.functions.length})`);
    for (const fn of DATABASE_DOC.functions) {
      lines.push(`  - ${fn.name} : ${fn.description}`);
    }
    lines.push('');
  }

  if (DATABASE_DOC.globalRules.length > 0) {
    lines.push('Regles globales');
    for (const rule of DATABASE_DOC.globalRules) {
      lines.push(`  - ${rule}`);
    }
  }

  return lines.join('\n');
}

export function buildContextCardsText(cards: ContextCard[]): string {
  if (cards.length === 0) return '';
  return cards
    .map((c) => `${c.title}\n${c.content}`)
    .join('\n\n---\n\n');
}

export function buildIdeasText(ideas: IdeaItem[]): string {
  if (ideas.length === 0) return '';
  const todo = ideas.filter((i) => i.status !== 'done');
  const done = ideas.filter((i) => i.status === 'done');
  const lines: string[] = [];
  lines.push(`${ideas.length} idee${ideas.length > 1 ? 's' : ''} (${todo.length} a faire, ${done.length} terminee${done.length > 1 ? 's' : ''})`);
  lines.push('');
  if (todo.length > 0) {
    lines.push('A faire');
    for (const i of todo) {
      lines.push(`  - ${i.title}`);
      if (i.content) lines.push(`    ${i.content.substring(0, 150)}`);
    }
    lines.push('');
  }
  if (done.length > 0) {
    lines.push('Terminees');
    for (const i of done) {
      lines.push(`  - ${i.title}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function buildAmeliorationsText(ameliorations: AmeliorationItem[], categories: AmeliorationCategoryItem[]): string {
  if (ameliorations.length === 0) return 'Aucune amelioration enregistree.';
  const lines: string[] = [];
  lines.push(`${ameliorations.length} amelioration${ameliorations.length > 1 ? 's' : ''}`);
  lines.push('');

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const grouped: Record<string, AmeliorationItem[]> = {};
  for (const a of ameliorations) {
    const key = a.category_id ? (catMap.get(a.category_id) ?? 'Sans categorie') : 'Sans categorie';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  const sortedKeys = [...categories.map((c) => c.name).filter((n) => grouped[n]), ...(grouped['Sans categorie'] ? ['Sans categorie'] : [])];
  for (const catName of sortedKeys) {
    const items = grouped[catName];
    if (!items || items.length === 0) continue;
    lines.push(`${catName} (${items.length})`);
    for (const item of items) {
      const statusLabel = item.status === 'done' ? '[termine]' : item.status === 'in_progress' ? '[en cours]' : '[a faire]';
      lines.push(`  - ${statusLabel} ${item.title}`);
      if (item.description) lines.push(`    ${item.description.substring(0, 120)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function buildAuditText(): string {
  const lines: string[] = [];
  lines.push(`Score global : ${MOCK_GLOBAL_SCORE}%`);
  lines.push('');

  for (const section of MOCK_SECTIONS) {
    const okCount = section.checks.filter((c) => c.status === 'ok').length;
    const total = section.checks.length;
    lines.push(`${section.title} (${okCount}/${total} OK)`);
    for (const check of section.checks) {
      const icon = check.status === 'ok' ? '[OK]' : check.status === 'warning' ? '[WARN]' : '[ERR]';
      lines.push(`  ${icon} ${check.label} -- ${check.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

const SECTION_LABEL_MAP: Record<string, string> = {
  'contexte-chatgpt': 'Contextes ChatGPT actuels',
  'technologies': 'Stack technique',
  'base-de-donnees': 'Base de donnees',
  'structure-crm': 'Structure du CRM',
  'ameliorations': 'Ameliorations actuelles',
  'idees': 'Idees actuelles',
  'audit-technique': 'Audit technique actuel',
};

export function buildCopyText(sections: DocSection[]): string {
  const parts: string[] = [];
  parts.push('# DOCUMENTATION COMPLETE DU CRM');
  parts.push('');
  parts.push("Ce document decrit l'etat actuel complet du CRM SaaS.");
  parts.push('Il est genere automatiquement a partir des donnees reelles du projet.');
  parts.push(`Date de generation : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  parts.push('');
  parts.push('='.repeat(60));
  parts.push('');

  for (const s of sections) {
    const heading = SECTION_LABEL_MAP[s.id] ?? s.label;
    parts.push(`## ${heading}`);
    parts.push('');
    parts.push(s.content.trim() || '(Section vide)');
    parts.push('');
    parts.push('-'.repeat(60));
    parts.push('');
  }

  parts.push('--- FIN DE LA DOCUMENTATION ---');
  return parts.join('\n');
}
