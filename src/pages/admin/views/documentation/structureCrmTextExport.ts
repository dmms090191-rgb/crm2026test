import { PROJECT_TREE, FOLDER_SECTIONS, type TreeNode } from './structureCrmData';

function renderTreeLines(nodes: TreeNode[], prefix: string, isLast: boolean[]): string[] {
  const lines: string[] = [];
  nodes.forEach((node, idx) => {
    const last = idx === nodes.length - 1;
    const connector = last ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
    let linePrefix = '';
    for (let i = 0; i < isLast.length; i++) {
      linePrefix += isLast[i] ? '    ' : '\u2502   ';
    }
    const desc = node.description ? `  ${node.description}` : '';
    lines.push(`${linePrefix}${connector}${node.name}${desc}`);
    if (node.children && node.children.length > 0) {
      lines.push(...renderTreeLines(node.children, prefix, [...isLast, last]));
    }
  });
  return lines;
}

export function buildStructureCrmText(): string {
  const parts: string[] = [];

  parts.push('# Structure du CRM');
  parts.push('');
  parts.push('## Arborescence du projet');
  parts.push('');
  for (const root of PROJECT_TREE) {
    parts.push(root.name);
    if (root.children) {
      parts.push(...renderTreeLines(root.children, '', []));
    }
    parts.push('');
  }

  parts.push('## Organisation du code');
  parts.push('');
  parts.push('Architecture multi-roles avec separation claire :');
  parts.push('- UI et composants : src/components/ et src/pages/*/views/');
  parts.push('- Logique metier : src/lib/');
  parts.push('- Pages par role : src/pages/admin/, src/pages/vendor/, src/pages/client/');
  parts.push('- Backend : supabase/migrations/ et supabase/functions/');
  parts.push('');

  parts.push('## Detail des dossiers');
  parts.push('');
  for (const s of FOLDER_SECTIONS) {
    parts.push(`### ${s.title}`);
    parts.push(s.description);
    parts.push(`Role : ${s.role}`);
    parts.push('Contenu :');
    for (const c of s.contains) {
      parts.push(`  - ${c}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
