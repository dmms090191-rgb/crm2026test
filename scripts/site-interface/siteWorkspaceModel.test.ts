// Tests unitaires du modele de l'interface Site (aucun reseau).
//   node --test scripts/site-interface/siteWorkspaceModel.test.ts
// Hors de src/ : le build Vite importe tout src/**/*.ts (structureCrmSync.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_TAB_ORDER, publicationStatus, siteDisplayName, domainSummary, publicSiteUrl,
  formatDateFr, buildTemplateLibrary, applyTemplateErrorMessage, buildSectionOverrides,
  isPreviewPayloadMessage, previewScale, PREVIEW_PAYLOAD_MESSAGE,
} from '../../src/lib/siteWorkspaceModel.ts';
import type { SiteTemplate, CompanyHomePage } from '../../src/lib/companyHomePagesTypes.ts';

const COMPANY_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const COMPANY_B = 'bbbbbbbb-0000-4000-8000-000000000001';

function page(over: Partial<CompanyHomePage> = {}): CompanyHomePage {
  return {
    title: 'Mon site', slug: 'mon-site', is_active: true, is_published: false, active_template_id: 'tpl-1',
    custom_domain: null, domain_status: 'not_configured', domain_verified: false, domain_expires_at: null,
    ...over,
  } as CompanyHomePage;
}

function tpl(id: string, name: string, over: Partial<SiteTemplate> = {}): SiteTemplate {
  return { id, name, template_key: `key_${id}`, owner_company_id: null, ...over } as SiteTemplate;
}

test('les 4 onglets, dans l ordre exact demande, sans Studio', () => {
  assert.deepEqual(SITE_TAB_ORDER, ['mon-site', 'domaine', 'templates', 'apercu']);
});

test('statut du site = ce que voit un visiteur (Publie seulement si en ligne, avec template et adresse)', () => {
  assert.equal(publicationStatus(null).label, 'Pas encore créé');
  assert.equal(publicationStatus(page()).label, 'Publié');
  assert.equal(publicationStatus(page({ is_published: false })).label, 'Publié', 'le drapeau du Studio masque ne decide plus');
  assert.equal(publicationStatus(page({ active_template_id: null })).label, 'Brouillon');
  assert.match(publicationStatus(page({ is_active: false })).hint, /hors ligne/);
  const noAddress = publicationStatus(page({ slug: null }));
  assert.equal(noAddress.label, 'Brouillon');
  assert.match(noAddress.hint, /adresse publique/);
  assert.equal(publicationStatus(page({ slug: null, custom_domain: 'exemple.fr', domain_status: 'verified', domain_verified: true })).label, 'Publié');
  assert.equal(siteDisplayName(page({ title: '  ' }), 'Société A'), 'Société A');
  assert.equal(siteDisplayName(page({ title: 'Nova' }), 'Société A'), 'Nova');
});

test('domaine : aucun faux statut, aucune fausse date de renouvellement', () => {
  assert.equal(domainSummary(null).state, 'none');
  assert.equal(domainSummary(page()).state, 'none');
  const active = domainSummary(page({ custom_domain: 'exemple.fr', domain_status: 'verified', domain_verified: true }));
  assert.equal(active.state, 'active');
  assert.equal(active.renewalDate, null);
  assert.equal(domainSummary(page({ custom_domain: 'exemple.fr', domain_status: 'verified', domain_verified: false })).state, 'pending');
  assert.equal(domainSummary(page({ custom_domain: 'exemple.fr', domain_status: 'error' })).state, 'attention');
  assert.equal(domainSummary(page({ custom_domain: 'exemple.fr', domain_status: 'pending' })).state, 'pending');
  assert.equal(domainSummary(page({ custom_domain: 'exemple.fr', domain_expires_at: '2027-01-02T00:00:00Z' })).renewalDate, '2027-01-02T00:00:00Z');
  // Aucun libelle technique expose au client
  for (const s of [active, domainSummary(page({ custom_domain: 'x.fr', domain_status: 'error' }))]) {
    assert.doesNotMatch(`${s.label} ${s.hint}`, /DNS|CNAME|A record|Vercel|Supabase|company_id/i);
  }
});

test('adresse publique : domaine actif, sinon adresse Talvex, sinon raison claire', () => {
  const origin = 'https://app.test';
  assert.equal(publicSiteUrl(null, origin).reason, 'no_site');
  assert.equal(publicSiteUrl(page({ is_active: false }), origin).reason, 'offline');
  assert.equal(publicSiteUrl(page({ custom_domain: 'exemple.fr', domain_status: 'verified', domain_verified: true }), origin).url, 'https://exemple.fr');
  assert.equal(publicSiteUrl(page({ custom_domain: 'exemple.fr', domain_status: 'error' }), origin).url, 'https://app.test/site/mon-site');
  const noAddress = publicSiteUrl(page({ slug: null }), origin);
  assert.equal(noAddress.url, null);
  assert.equal(noAddress.reason, 'no_address');
});

test('date en francais, entree invalide ignoree', () => {
  assert.equal(formatDateFr('2026-09-05T10:00:00Z'), '5 septembre 2026');
  assert.equal(formatDateFr(null), null);
  assert.equal(formatDateFr('pas une date'), null);
});

test('templates : une Societe ne voit que ses templates attribues (et son template actif)', () => {
  const luxe = tpl('1', 'Luxe');
  const nature = tpl('2', 'Nature');
  const secret = tpl('3', 'Autre client');
  const lib = buildTemplateLibrary({
    templates: [luxe, nature, secret], assignedIds: new Set(['2']), activeTemplate: luxe,
    actorIsTalvex: false, targetCompanyId: COMPANY_A,
  });
  assert.deepEqual(lib.map(e => e.template.name), ['Luxe', 'Nature']);
  assert.equal(lib[0].isActive, true);
  assert.ok(!lib.some(e => e.template.id === '3'), 'template non attribue invisible');
});

test('templates : Talvex voit tout, non attribues signales, actif en premier', () => {
  const lib = buildTemplateLibrary({
    templates: [tpl('1', 'Zen'), tpl('2', 'Alpha', { owner_company_id: COMPANY_A })], assignedIds: new Set(['2']),
    activeTemplate: tpl('9', 'Masque'), actorIsTalvex: true, targetCompanyId: COMPANY_A,
  });
  assert.deepEqual(lib.map(e => e.template.name), ['Masque', 'Alpha', 'Zen']);
  assert.equal(lib.find(e => e.template.name === 'Zen')?.isAssigned, false);
  assert.equal(lib.find(e => e.template.name === 'Alpha')?.isOwnedByTarget, true);
});

test('meme template, deux entreprises : chaque bibliotheque est calculee pour sa propre cible', () => {
  const luxe = tpl('1', 'Luxe', { owner_company_id: COMPANY_A });
  const forA = buildTemplateLibrary({ templates: [luxe], assignedIds: new Set(['1']), activeTemplate: luxe, actorIsTalvex: false, targetCompanyId: COMPANY_A });
  const forB = buildTemplateLibrary({ templates: [luxe], assignedIds: new Set(['1']), activeTemplate: null, actorIsTalvex: false, targetCompanyId: COMPANY_B });
  assert.equal(forA[0].isActive, true);
  assert.equal(forB[0].isActive, false);
  assert.equal(forB[0].isOwnedByTarget, false);
});

test('message d erreur d application : refus serveur explicite', () => {
  assert.match(applyTemplateErrorMessage({ code: '42501' }), /pas disponible/);
  assert.match(applyTemplateErrorMessage(new Error('x')), /Réessayez/);
});

test('sections publiees : miroir de la page publique (ordre, contenu nul ignore)', () => {
  assert.deepEqual(buildSectionOverrides([]), {});
  const res = buildSectionOverrides([
    { section_key: 'b', position: 2, is_visible: false, published_content: { t: '2' }, published_styles: null },
    { section_key: 'x', position: 0, is_visible: true, published_content: null, published_styles: null },
    { section_key: 'a', position: 1, is_visible: true, published_content: { t: '1' }, published_styles: { c: 'red' } },
  ]);
  assert.deepEqual(res.order, ['a', 'b']);
  assert.deepEqual(res.overrides?.b, { content: { t: '2' }, styles: {}, visible: false });
});

test('messages d apercu : seul un contenu valide est accepte', () => {
  assert.equal(isPreviewPayloadMessage({ type: PREVIEW_PAYLOAD_MESSAGE, payload: { templateKey: 'gold_buying', appIconUrl: null } }), true);
  assert.equal(isPreviewPayloadMessage({ type: PREVIEW_PAYLOAD_MESSAGE, payload: { templateKey: '', appIconUrl: null } }), false);
  assert.equal(isPreviewPayloadMessage({ type: 'autre', payload: { templateKey: 'x', appIconUrl: null } }), false);
  assert.equal(isPreviewPayloadMessage('texte'), false);
  assert.equal(isPreviewPayloadMessage(null), false);
});

test('echelle de l apercu : jamais agrandi, reduit pour tenir dans la largeur', () => {
  assert.equal(previewScale(2000, 'desktop'), 1);
  assert.equal(previewScale(640, 'desktop'), 0.5);
  assert.equal(previewScale(343, 'mobile'), 343 / 390);
  assert.equal(previewScale(0, 'tablet'), 1);
});
