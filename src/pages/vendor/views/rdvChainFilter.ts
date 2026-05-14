interface ChainableProposal {
  id: string;
  status: string;
  created_at: string;
  parent_proposal_id?: string | null;
}

export function getVisibleRdvProposals<T extends ChainableProposal>(proposals: T[]): T[] {
  const byId = new Map<string, T>();
  for (const p of proposals) byId.set(p.id, p);

  const rootCache = new Map<string, string>();

  function findRoot(id: string): string {
    if (rootCache.has(id)) return rootCache.get(id)!;
    const p = byId.get(id);
    if (!p || !p.parent_proposal_id || !byId.has(p.parent_proposal_id)) {
      rootCache.set(id, id);
      return id;
    }
    const root = findRoot(p.parent_proposal_id);
    rootCache.set(id, root);
    return root;
  }

  const chains = new Map<string, T[]>();
  for (const p of proposals) {
    const root = findRoot(p.id);
    if (!chains.has(root)) chains.set(root, []);
    chains.get(root)!.push(p);
  }

  const visible: T[] = [];
  for (const members of chains.values()) {
    if (members.length === 1) {
      visible.push(members[0]);
      continue;
    }

    const confirmed = members.find(m => m.status === 'confirmed');
    if (confirmed) {
      visible.push(confirmed);
      continue;
    }

    const pending = members
      .filter(m => m.status === 'pending')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (pending.length > 0) {
      visible.push(pending[0]);
    } else {
      const latest = [...members].sort((a, b) => b.created_at.localeCompare(a.created_at));
      visible.push(latest[0]);
    }
  }

  visible.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return visible;
}

export function getChainIdsForSelected<T extends ChainableProposal>(allProposals: T[], selectedIds: string[]): string[] {
  const byId = new Map<string, T>();
  for (const p of allProposals) byId.set(p.id, p);

  const rootCache = new Map<string, string>();

  function findRoot(id: string): string {
    if (rootCache.has(id)) return rootCache.get(id)!;
    const p = byId.get(id);
    if (!p || !p.parent_proposal_id || !byId.has(p.parent_proposal_id)) {
      rootCache.set(id, id);
      return id;
    }
    const root = findRoot(p.parent_proposal_id);
    rootCache.set(id, root);
    return root;
  }

  const chains = new Map<string, string[]>();
  for (const p of allProposals) {
    const root = findRoot(p.id);
    if (!chains.has(root)) chains.set(root, []);
    chains.get(root)!.push(p.id);
  }

  const selectedRoots = new Set<string>();
  for (const id of selectedIds) {
    selectedRoots.add(findRoot(id));
  }

  const result: string[] = [];
  for (const root of selectedRoots) {
    const members = chains.get(root);
    if (members) result.push(...members);
  }
  return result;
}
