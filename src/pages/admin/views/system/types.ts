export interface SystemStatus {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

export interface SystemCategory {
  id: string;
  name: string;
  position: number;
  parent_id: string | null;
  color: string | null;
  created_at: string;
}

export interface SystemItem {
  id: string;
  title: string;
  description: string;
  status: string;
  status_id: string | null;
  position: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemTreeNode {
  category: SystemCategory;
  children: SystemTreeNode[];
  items: SystemItem[];
}

export function buildTree(categories: SystemCategory[], items: SystemItem[]): SystemTreeNode[] {
  const nodeMap = new Map<string, SystemTreeNode>();
  for (const cat of categories) {
    nodeMap.set(cat.id, { category: cat, children: [], items: [] });
  }
  for (const item of items) {
    if (item.category_id && nodeMap.has(item.category_id)) {
      nodeMap.get(item.category_id)!.items.push(item);
    }
  }
  for (const node of nodeMap.values()) {
    node.items.sort((a, b) => a.position - b.position);
  }
  const roots: SystemTreeNode[] = [];
  for (const cat of categories) {
    const node = nodeMap.get(cat.id)!;
    if (cat.parent_id && nodeMap.has(cat.parent_id)) {
      nodeMap.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.category.position - b.category.position);
  }
  roots.sort((a, b) => a.category.position - b.category.position);
  return roots;
}

export function countAllItems(node: SystemTreeNode): number {
  let count = node.items.length;
  for (const child of node.children) {
    count += countAllItems(child);
  }
  return count;
}

