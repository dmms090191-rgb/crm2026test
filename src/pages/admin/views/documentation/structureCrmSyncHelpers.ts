import type { TreeNode } from './structureCrmData';

export function insertIntoTree(tree: TreeNode[], pathParts: string[], isFile: boolean): void {
  if (pathParts.length === 0) return;
  const [head, ...rest] = pathParts;
  const isLeaf = rest.length === 0;
  const nodeName = isLeaf ? head : head + '/';
  const nodeType = isLeaf && isFile ? 'file' : 'folder';

  let existing = tree.find((n) => n.name === nodeName);
  if (!existing) {
    existing = { name: nodeName, type: nodeType, children: nodeType === 'folder' ? [] : undefined };
    tree.push(existing);
  }
  if (!isLeaf && existing.children) {
    insertIntoTree(existing.children, rest, isFile);
  }
}

export function sortTree(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
  return nodes;
}

export function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.type === 'file') count++;
    if (n.children) count += countFiles(n.children);
  }
  return count;
}

export function countFolders(nodes: TreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.type === 'folder') count++;
    if (n.children) count += countFolders(n.children);
  }
  return count;
}

export function getSubtree(tree: TreeNode[], path: string[]): TreeNode | undefined {
  let current: TreeNode[] = tree;
  let found: TreeNode | undefined;
  for (const segment of path) {
    found = current.find((n) => n.name === segment + '/' || n.name === segment);
    if (!found) return undefined;
    current = found.children ?? [];
  }
  return found;
}

export function listDirectChildren(node: TreeNode): string[] {
  if (!node.children) return [];
  const items: string[] = [];
  for (const child of node.children) {
    if (child.type === 'folder') {
      const fc = countFiles(child.children ?? []);
      const dc = countFolders(child.children ?? []);
      items.push(`${child.name} (${fc} fichiers, ${dc} sous-dossiers)`);
    } else {
      items.push(child.name);
    }
  }
  return items;
}

export function renderTreeText(nodes: TreeNode[], parts: string[], indent: string): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    parts.push(`${indent}${connector}${node.name}`);
    if (node.children && node.children.length > 0) {
      const childIndent = indent + (isLast ? '    ' : '│   ');
      renderTreeText(node.children, parts, childIndent);
    }
  }
}
