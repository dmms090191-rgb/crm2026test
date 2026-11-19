// Releves : le RDV DIRECT (fixe par le commercial, sans validation client) et la recherche
// unique du panel Commercial.
//   node --import tsx --test scripts/crm-leads/rdvDirect.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  libelleRdvDirect, dateHeureRdv, verifierCreneau, creneauParDefaut, rdvDirectsAVenir, instantRdv, type RdvDirect,
} from '../../src/lib/rdvDirectRegles.ts';

const code = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/^\s*--.*$/gm, '');

const rdv = (o: Partial<RdvDirect>): RdvDirect => ({
  id: 'r', lead_id: 'l', vendor_id: 'v', proposed_date: '2026-11-20', proposed_time: '15:00',
  appointment_utc: '2026-11-20T14:00:00.000Z', source_timezone: 'Europe/Paris', description: '',
  status: 'confirmed', created_at: '2026-11-19T10:00:00.000Z', ...o,
});

test('RD1 date et heure lues dans le fuseau du commercial', () => {
  assert.deepEqual(dateHeureRdv(rdv({}), 'Europe/Paris'), { date: '20/11/2026', heure: '15:00' });
  assert.deepEqual(dateHeureRdv(rdv({}), 'Asia/Jerusalem'), { date: '20/11/2026', heure: '16:00' });
});

test('RD2 la ligne d historique suit l etat COURANT du RDV', () => {
  assert.equal(libelleRdvDirect(rdv({ description: 'Rappeler pour présentation du site' }), 'Europe/Paris'),
    'RDV direct prévu le 20/11/2026 à 15:00 — Rappeler pour présentation du site');
  assert.equal(libelleRdvDirect(rdv({}), 'Europe/Paris'), 'RDV direct prévu le 20/11/2026 à 15:00');
  assert.equal(libelleRdvDirect(rdv({ status: 'cancelled' }), 'Europe/Paris'), 'RDV direct annulé (prévu le 20/11/2026 à 15:00)');
});

test('RD3 controle de saisie : date, heure, pas dans le passe', () => {
  const maintenant = Date.parse('2026-11-19T10:00:00Z');
  assert.equal(verifierCreneau('', '15:00', 'Europe/Paris', maintenant), 'Choisissez une date.');
  assert.equal(verifierCreneau('2026-11-20', '', 'Europe/Paris', maintenant), 'Choisissez une heure.');
  assert.equal(verifierCreneau('2026-11-18', '15:00', 'Europe/Paris', maintenant), 'Ce créneau est déjà passé.');
  assert.equal(verifierCreneau('2026-11-20', '15:00', 'Europe/Paris', maintenant), null);
});

test('RD4 creneau propose : l heure pleine suivante, dans le fuseau', () => {
  assert.deepEqual(creneauParDefaut('Europe/Paris', Date.parse('2026-11-19T10:20:00Z')), { date: '2026-11-19', heure: '12:00' });
  /* pres de minuit : le jour du FUSEAU, pas celui d'UTC */
  assert.deepEqual(creneauParDefaut('Asia/Jerusalem', Date.parse('2026-11-19T22:30:00Z')), { date: '2026-11-20', heure: '01:00' });
});

test('RD5 RDV a venir : confirmes, pas passes, du plus proche au plus lointain', () => {
  const m = Date.parse('2026-11-19T10:00:00Z');
  const a = rdv({ id: 'a', appointment_utc: '2026-11-21T09:00:00Z' });
  const b = rdv({ id: 'b', appointment_utc: '2026-11-20T09:00:00Z' });
  const passe = rdv({ id: 'p', appointment_utc: '2026-11-18T09:00:00Z' });
  const annule = rdv({ id: 'x', appointment_utc: '2026-11-20T08:00:00Z', status: 'cancelled' });
  assert.deepEqual(rdvDirectsAVenir([a, passe, annule, b], m).map(r => r.id), ['b', 'a']);
  assert.equal(instantRdv(rdv({ appointment_utc: null, proposed_date: '2026-11-20', proposed_time: '15:00' })) > 0, true);
});

test('RD6 une seule source : la migration marque la ligne, la protege du client, borne le commercial', () => {
  const m = code('supabase/migrations/20261119142118_rdv_direct.sql');
  assert.match(m, /add column rdv_kind text not null default 'proposition'/);
  assert.match(m, /check \(rdv_kind in \('proposition', 'direct'\)\)/);
  assert.match(m, /as restrictive\s+for all\s+to authenticated\s+using \(rdv_kind <> 'direct' or public\.get_my_role\(\) is distinct from 'client'\)/);
  assert.match(m, /as restrictive\s+for insert[\s\S]*rdv_direct_du_commercial\(lead_id, vendor_id, company_id\)/);
  assert.match(m, /as restrictive\s+for update[\s\S]*using \([\s\S]*rdv_direct_du_commercial[\s\S]*with check \([\s\S]*rdv_direct_du_commercial/);
  assert.match(m, /v\.auth_user_id = \(select auth\.uid\(\)\)[\s\S]*l\.id = p_lead_id/);
  assert.doesNotMatch(m, /drop policy|alter policy/i, 'les politiques existantes ne sont pas touchees');
});

test('RD7 le systeme de proposition reste separe', () => {
  /* Filtre cote navigateur, qui vaut AVANT comme APRES la migration : un .eq('rdv_kind') sur une
     colonne absente viderait la liste des propositions sans message. */
  for (const f of ['src/pages/vendor/views/propositions-rdv/useVendorRdvData.ts', 'src/pages/admin/views/propositions-rdv/useAdminRdvData.ts']) {
    assert.match(code(f), /\.filter\(r => r\.rdv_kind !== 'direct'\)/, f);
    assert.doesNotMatch(code(f), /\.eq\('rdv_kind'/, f);
  }
  const lib = code('src/lib/rdvDirect.ts');
  assert.match(lib, /rdv_kind: 'direct'/);
  assert.match(lib, /seen_by_client: true/, 'aucun drapeau « non vu » pour le client');
  assert.doesNotMatch(lib, /\.delete\(/, 'annuler = un statut, jamais une suppression');
  assert.doesNotMatch(code('src/components/agenda/RdvDirectModal.tsx'), /RdvEditModal/, 'jamais par RdvEditModal (qui ecrit au client)');
  assert.match(code('src/components/agenda/RdvDirectModal.tsx'), /return createPortal\([\s\S]*document\.body,/);
});

test('RD8 l historique du lead LIT le RDV, il ne le copie pas dans leads.data', () => {
  const c = code('src/pages/admin/views/crm/CrmCommentsTab.tsx');
  assert.match(c, /chargerRdvDirectsDuLead\(leadId\)/);
  assert.match(c, /libelleRdvDirect\(e\.rdv, tz\)/);
  assert.doesNotMatch(c, /persist\([^)]*rdv/i);
});

test('RD10 la base garde le type et fait suivre le RDV direct au lead reattribue', () => {
  const m = code('supabase/migrations/20261119142118_rdv_direct.sql');
  assert.match(m, /if new\.rdv_kind is distinct from old\.rdv_kind then\s+raise exception/);
  assert.match(m, /if old\.rdv_kind = 'direct' and new\.lead_id is distinct from old\.lead_id then\s+raise exception/);
  assert.match(m, /create trigger rdv_proposals_garde_type\s+before update on public\.rdv_proposals/);
  assert.match(m, /create trigger leads_rdv_direct_suit_le_lead\s+after update of vendor_id on public\.leads[\s\S]*when \(old\.vendor_id is distinct from new\.vendor_id\)/);
  assert.match(m, /set vendor_id = new\.vendor_id\s+where r\.lead_id = new\.id\s+and r\.rdv_kind = 'direct'\s+and r\.status = 'confirmed'\s+and \(r\.appointment_utc is null or r\.appointment_utc >= now\(\)\)/);
});

test('RD11 panel client : aucun RDV direct, meme en « se connecter en tant que client »', () => {
  assert.match(code('src/pages/client/views/ClientAgenda.tsx'), /setRdvs\(results\.filter\(r => r\.rdv_kind !== 'direct'\)\)/);
  assert.match(code('src/pages/client/views/propositions-rdv/useClientRdvData.ts'), /\.rdv_kind !== 'direct'\)\)/);
  assert.match(code('src/hooks/useAgendaNotifications.ts'), /rdvsRef\.current = results\.filter\(r => r\.rdv_kind !== 'direct'\)/);
});

test('RD12 un RDV direct ne se supprime jamais depuis un agenda : il s annule', () => {
  const d = code('src/components/agenda/AgendaDetailModal.tsx');
  assert.match(d, /\{canDelete && !direct && \(/, 'Supprimer reserve aux propositions');
  assert.match(d, /onStatusChange\(rdv\.id, 'cancelled'\)/);
});

test('RD9 recherche du Commercial : un seul champ global, plus de champ email', () => {
  const f = code('src/pages/vendor/views/leads/VendorLeadsFilters.tsx');
  assert.doesNotMatch(f, /filterEmail|Rechercher par email|placeholder="Email/);
  assert.match(f, /placeholder="Telephone\.\.\."/, 'les autres filtres restent');
  assert.match(code('src/pages/vendor/views/VendorLeads.tsx'), /placeholder="Rechercher : nom, prénom, entreprise, email ou téléphone…"/);
});
