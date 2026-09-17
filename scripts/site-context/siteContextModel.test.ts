// Tests unitaires du modele de contexte Site (aucun reseau).
//   node --test scripts/site-context/siteContextModel.test.ts
// Hors de src/ : structureCrmSync.ts importe tout src/**/*.ts dans le build Vite,
// et node:test n'existe pas dans le navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actorFromUser, buildCompanyContext, buildPlatformContext, type SiteContextRow,
} from '../../src/lib/siteContextModel.ts';

const GRP_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const SOC_A = 'bbbbbbbb-0000-4000-8000-000000000001';
const TALVEX_CO = 'cccccccc-0000-4000-8000-000000000001';

const talvex = actorFromUser({ id: 'u-talvex', app_metadata: { role: 'super_admin', company_id: TALVEX_CO } });
const groupeA = actorFromUser({ id: 'u-grp-a', app_metadata: { role: 'company_super_admin', company_id: GRP_A } });
const societeA = actorFromUser({ id: 'u-soc-a', app_metadata: { role: 'admin', company_id: SOC_A } });

const rowSocA = (relation: string): SiteContextRow => ({
  target_company_id: SOC_A, target_name: 'Tel Aviv', target_entity_type: 'societe',
  target_parent_company_id: GRP_A, parent_name: 'Barbara', parent_entity_type: 'groupe', relation,
});
const rowGrpA = (relation: string): SiteContextRow => ({
  target_company_id: GRP_A, target_name: 'Barbara', target_entity_type: 'groupe',
  target_parent_company_id: null, parent_name: null, parent_entity_type: null, relation,
});

test('Acteur reel lu dans app_metadata, role inconnu neutralise', () => {
  assert.deepEqual(talvex, { userId: 'u-talvex', role: 'super_admin', companyId: TALVEX_CO });
  assert.equal(actorFromUser({ id: 'x', app_metadata: { role: 'hacker' } }).role, 'unknown');
  assert.equal(actorFromUser({ id: 'x', app_metadata: null }).companyId, null);
});

test('Societe sur son propre site : pas de Visu, acteur = cible', () => {
  const ctx = buildCompanyContext(societeA, SOC_A, rowSocA('self'));
  assert.equal(ctx.status, 'ready');
  assert.equal(ctx.isVisu, false);
  assert.equal(ctx.actor?.userId, 'u-soc-a');
  assert.equal(ctx.target?.companyId, SOC_A);
  assert.deepEqual(ctx.chain.map(s => s.label), ['Société Tel Aviv']);
});

test('Talvex -> Groupe A : acteur Talvex, cible Groupe A', () => {
  const ctx = buildCompanyContext(talvex, GRP_A, rowGrpA('platform_admin'));
  assert.equal(ctx.isVisu, true);
  assert.equal(ctx.actor?.role, 'super_admin');
  assert.equal(ctx.target?.entityType, 'groupe');
  assert.deepEqual(ctx.chain.map(s => s.label), ['Talvex Administrateur', 'Groupe Barbara']);
});

test('Talvex -> Societe A (et Talvex -> Groupe A -> Societe A) : acteur reste Talvex, cible Societe A', () => {
  const ctx = buildCompanyContext(talvex, SOC_A, rowSocA('platform_admin'));
  assert.equal(ctx.actor?.companyId, TALVEX_CO);
  assert.equal(ctx.target?.companyId, SOC_A);
  assert.equal(ctx.target?.parentName, 'Barbara');
  assert.deepEqual(ctx.chain.map(s => s.label), ['Talvex Administrateur', 'Groupe Barbara', 'Société Tel Aviv']);
});

test('Groupe A -> Societe A : acteur Groupe A, cible Societe A', () => {
  const ctx = buildCompanyContext(groupeA, SOC_A, rowSocA('group_child'));
  assert.equal(ctx.isVisu, true);
  assert.equal(ctx.actor?.companyId, GRP_A);
  assert.equal(ctx.target?.companyId, SOC_A);
  assert.deepEqual(ctx.chain.map(s => s.label), ['Groupe Barbara', 'Société Tel Aviv']);
});

test('Refus serveur, cible absente ou reponse pour une autre entreprise : jamais de repli sur l entreprise de l acteur', () => {
  assert.equal(buildCompanyContext(groupeA, SOC_A, null).status, 'forbidden');
  assert.equal(buildCompanyContext(societeA, null, null).status, 'no_target');
  assert.equal(buildCompanyContext(societeA, null, null).target, null);
  const mismatch = buildCompanyContext(societeA, SOC_A, rowGrpA('self'));
  assert.equal(mismatch.status, 'forbidden');
  assert.equal(mismatch.canManageSite, false);
  assert.equal(buildCompanyContext(null, SOC_A, rowSocA('self')).status, 'forbidden');
});

test('Site Talvex (platform) : reserve a Talvex Administrateur', () => {
  assert.equal(buildPlatformContext(talvex).status, 'ready');
  assert.equal(buildPlatformContext(groupeA).status, 'forbidden');
  assert.equal(buildPlatformContext(societeA).canManageSite, false);
  assert.equal(buildPlatformContext(null).status, 'forbidden');
});
