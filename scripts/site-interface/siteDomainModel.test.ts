// Tests unitaires : consommation de site_domains par l'interface Site (aucun reseau).
//   node --test scripts/site-interface/siteDomainModel.test.ts
// Hors de src/ : le build Vite importe tout src/**/*.ts (structureCrmSync.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  domainSummary, pickPrimaryDomain, publicationStatus, publicSiteUrl, summarizeSiteDomain,
} from '../../src/lib/siteWorkspaceModel.ts';
import type { CompanyHomePage } from '../../src/lib/companyHomePagesTypes.ts';
import type { SiteDomainRecord } from '../../src/lib/siteDomainTypes.ts';

const origin = 'https://app.test';

function page(over: Partial<CompanyHomePage> = {}): CompanyHomePage {
  return {
    title: 'Mon site', slug: 'mon-site', is_active: true, is_published: false, active_template_id: 'tpl-1',
    custom_domain: null, domain_status: 'not_configured', domain_verified: false, domain_expires_at: null,
    ...over,
  } as CompanyHomePage;
}

function record(over: Partial<SiteDomainRecord> = {}): SiteDomainRecord {
  return {
    id: 'd-1', domain_name: 'mon-entreprise.fr', is_primary: true, provider: 'hostinger',
    registration_status: 'registered', connection_status: 'active', auto_renew: true,
    registered_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z',
    verified_at: '2026-01-02T00:00:00Z', activated_at: '2026-01-02T00:00:00Z',
    renewal_due: false, updated_at: '2026-01-02T00:00:00Z',
    ...over,
  };
}

test('domaine principal : is_primary d abord, sinon le premier, sinon aucun', () => {
  assert.equal(pickPrimaryDomain(null), null);
  assert.equal(pickPrimaryDomain([]), null);
  const a = record({ id: 'a', is_primary: false });
  const b = record({ id: 'b', is_primary: true });
  assert.equal(pickPrimaryDomain([a, b])?.id, 'b');
  assert.equal(pickPrimaryDomain([a])?.id, 'a');
});

test('site_domains prime sur les anciennes colonnes du site', () => {
  const legacy = page({ custom_domain: 'ancien.fr', domain_status: 'verified', domain_verified: true });
  const summary = domainSummary(legacy, record({ connection_status: 'verifying' }));
  assert.equal(summary.domain, 'mon-entreprise.fr');
  assert.equal(summary.state, 'pending');
  // Sans enregistrement site_domains : comportement historique inchange.
  assert.equal(domainSummary(legacy, null).domain, 'ancien.fr');
  assert.equal(domainSummary(legacy).state, 'active');
});

test('libelles clients : enregistrement puis mise en service', () => {
  const cases: Array<[Partial<SiteDomainRecord>, string, string]> = [
    [{ registration_status: 'pending', connection_status: 'not_started' }, 'pending', 'Commande en cours'],
    [{ registration_status: 'expired', connection_status: 'active' }, 'attention', 'Expiré'],
    [{ registration_status: 'suspended', connection_status: 'active' }, 'attention', 'Suspendu'],
    [{ registration_status: 'transfer_out', connection_status: 'active' }, 'pending', 'Transfert en cours'],
    [{ registration_status: 'registered', connection_status: 'active' }, 'active', 'Actif'],
    [{ registration_status: 'external', provider: 'external', connection_status: 'active' }, 'active', 'Actif'],
    [{ connection_status: 'not_started' }, 'pending', 'En cours de mise en service'],
    [{ connection_status: 'dns_configuring' }, 'pending', 'En cours de mise en service'],
    [{ connection_status: 'verifying' }, 'pending', 'En cours de mise en service'],
    [{ connection_status: 'dns_failed' }, 'attention', 'Non relié'],
    [{ connection_status: 'verification_failed' }, 'attention', 'Non relié'],
    [{ connection_status: 'disconnected' }, 'attention', 'Non relié'],
    [{ registration_status: 'failed', connection_status: 'not_started' }, 'none', 'Aucun domaine'],
    [{ registration_status: 'released', connection_status: 'disconnected' }, 'none', 'Aucun domaine'],
  ];
  for (const [over, state, label] of cases) {
    const s = summarizeSiteDomain(record(over));
    assert.equal(s.state, state, JSON.stringify(over));
    assert.equal(s.label, label, JSON.stringify(over));
  }
});

test('aucun jargon technique ni donnee interne dans les textes affiches', () => {
  const statuses: Array<Partial<SiteDomainRecord>> = [
    { registration_status: 'pending' }, { registration_status: 'expired' }, { registration_status: 'suspended' },
    { registration_status: 'transfer_out' }, { connection_status: 'dns_failed' }, { connection_status: 'verifying' },
    { connection_status: 'disconnected' }, { connection_status: 'active' },
  ];
  const jargon = /dns|cname|record|vercel|hostinger|supabase|company_id|registrar|whois|prix|€|\$/i;
  for (const over of statuses) {
    const s = summarizeSiteDomain(record(over));
    assert.doesNotMatch(`${s.label} ${s.hint}`, jargon, JSON.stringify(over));
  }
});

test('renouvellement : date et alerte viennent uniquement du serveur', () => {
  const due = summarizeSiteDomain(record({ renewal_due: true, expires_at: '2026-10-01T00:00:00Z' }));
  assert.equal(due.renewalDue, true);
  assert.equal(due.renewalDate, '2026-10-01T00:00:00Z');
  assert.equal(summarizeSiteDomain(record({ expires_at: null })).renewalDate, null);
  assert.equal(summarizeSiteDomain(record({ registration_status: 'released', renewal_due: true })).renewalDue, false);
  // Colonnes historiques : jamais d'alerte inventee.
  assert.equal(domainSummary(page({ custom_domain: 'x.fr', domain_expires_at: '2026-09-20T00:00:00Z' })).renewalDue, false);
});

test('adresse publique et statut : seul un domaine actif remplace l adresse Talvex', () => {
  const p = page();
  assert.equal(publicSiteUrl(p, origin, record()).url, 'https://mon-entreprise.fr');
  assert.equal(publicSiteUrl(p, origin, record({ connection_status: 'verifying' })).url, 'https://app.test/site/mon-site');
  assert.equal(publicSiteUrl(p, origin, record({ registration_status: 'expired' })).url, 'https://app.test/site/mon-site');
  assert.equal(publicSiteUrl(page({ is_active: false }), origin, record()).reason, 'offline');
  // Domaine historique verifie mais site_domains non actif : c'est site_domains qui decide.
  const legacy = page({ custom_domain: 'ancien.fr', domain_status: 'verified', domain_verified: true });
  assert.equal(publicSiteUrl(legacy, origin, record({ connection_status: 'dns_failed' })).url, 'https://app.test/site/mon-site');

  const noSlug = page({ slug: null });
  assert.equal(publicationStatus(noSlug, record()).label, 'Publié');
  assert.equal(publicationStatus(noSlug, record({ connection_status: 'verifying' })).label, 'Brouillon');
  assert.equal(publicationStatus(noSlug, null).label, 'Brouillon');
});
