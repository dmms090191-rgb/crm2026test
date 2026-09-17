// Tests du regroupement Talvex > Sites & Domaines (entity_type, jamais company_tier).
//   node --test scripts/site-interface/sasitesGrouping.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSites, missingParentIds } from '../../src/pages/superadmin/views/sites/sasitesGrouping.ts';
import type { CompanyHomePageWithCompany } from '../../src/lib/companyHomePagesTypes.ts';

function site(id: string, companyId: string | null, company: CompanyHomePageWithCompany['companies'], scope: 'platform' | 'company' = 'company') {
  return { id, company_id: companyId, site_scope: scope, companies: company } as CompanyHomePageWithCompany;
}

const GRP = 'g-1';

test('plateforme, Groupe avec ses Societes, Societes independantes', () => {
  const pages = [
    site('p', null, null, 'platform'),
    site('talvex-co', 'tv', { name: 'Talvex', entity_type: 'platform', parent_company_id: null }),
    site('s-child', 's-1', { name: 'Tel Aviv', entity_type: 'societe', parent_company_id: GRP }),
    site('g', GRP, { name: 'Barbara', entity_type: 'groupe', parent_company_id: null }),
    site('s-free', 's-2', { name: 'Or Expert', entity_type: 'societe', parent_company_id: null }),
  ];
  const res = groupSites(pages);
  assert.deepEqual(res.platform.map(p => p.id), ['p', 'talvex-co']);
  assert.deepEqual(res.independents.map(p => p.id), ['s-free']);
  assert.equal(res.groupes.length, 1);
  assert.equal(res.groupes[0].companyName, 'Barbara');
  assert.deepEqual(res.groupes[0].pages.map(p => p.id), ['g', 's-child'], 'le site du Groupe en premier');
});

test('Societe dont le Groupe n a pas de site : groupee sous son Groupe, nom recupere', () => {
  const pages = [site('s', 's-1', { name: 'Tel Aviv', entity_type: 'societe', parent_company_id: GRP })];
  assert.deepEqual(missingParentIds(pages), [GRP]);
  const res = groupSites(pages, new Map([[GRP, 'Barbara']]));
  assert.equal(res.groupes[0].companyName, 'Barbara');
  assert.deepEqual(res.independents, []);
});

test('un nouveau Groupe est reconnu par entity_type meme si company_tier est faux', () => {
  const pages = [site('g', GRP, { name: 'Nouveau', entity_type: 'groupe', parent_company_id: null, company_tier: 'admin' } as never)];
  const res = groupSites(pages);
  assert.equal(res.groupes.length, 1);
  assert.deepEqual(res.independents, []);
});
